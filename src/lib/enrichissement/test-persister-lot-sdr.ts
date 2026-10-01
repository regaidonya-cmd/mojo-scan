import { MEMBRES_VSG_SDR_ENRICH_01 } from './donnees-lot-sdr-vsg-enrich-01'
import { persisterLotSdr } from './persister-lot-sdr'
import type { PersistanceLotSdrClient, HistoriqueEnrichissement } from './persister-lot-sdr'
import type { PersistanceImportClient, EntrepriseAImporter } from './import-companies-vsg50'
import { compterTelephonesFiables } from './compteur-objectif-sdr'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

function creerMocks(historiqueAilleurs: Record<string, HistoriqueEnrichissement> = {}) {
  const companies = new Map<string, string>()
  const etablissements = new Set<string>()
  const membresLot = new Map<string, Map<string, any>>()
  let idCounter = 0

  const clientImport: PersistanceImportClient = {
    async companyExisteDeja(siren) { return companies.has(siren) },
    async trouverOuCreerCompany(e: EntrepriseAImporter) {
      if (companies.has(e.siren)) return { id: companies.get(e.siren)!, creeMaintenant: false }
      const id = `company_${idCounter++}`
      companies.set(e.siren, id)
      return { id, creeMaintenant: true }
    },
    async etablissementExisteDeja(siret) { return etablissements.has(siret) },
    async insererEtablissement(companyId, e) { etablissements.add(e.siret) },
    async supprimerCompany(companyId) { for (const [s, id] of Array.from(companies.entries())) if (id === companyId) companies.delete(s) },
  }

  const clientLot: PersistanceLotSdrClient = {
    async historiqueEnrichissement(lotCodeCourant, siren) {
      return siren.filter((s) => historiqueAilleurs[s]).map((s) => historiqueAilleurs[s])
    },
    async sirenDejaDansCeLot(lotCode, siren) {
      const m = membresLot.get(lotCode)
      if (!m) return []
      return siren.filter((s) => m.has(s))
    },
    async insererMembreATraiter(lotCode, companyId, membre, reutilisation) {
      if (!membresLot.has(lotCode)) membresLot.set(lotCode, new Map())
      membresLot.get(lotCode)!.set(membre.siren, { companyId, reutilisation, ...membre })
    },
  }

  return { clientImport, clientLot, companies, etablissements, membresLot }
}

async function main() {
  // 1. Le jeu contient exactement 50 membres, 50 SIREN distincts
  t('1. MEMBRES_VSG_SDR_ENRICH_01 contient exactement 50 entrées', MEMBRES_VSG_SDR_ENRICH_01.length === 50)
  t('1b. Aucun doublon de SIREN', new Set(MEMBRES_VSG_SDR_ENRICH_01.map((m) => m.siren)).size === 50)

  // 2. Persistance nominale — 1er appel, X+Y=50 (pas forcément nbCrees=50)
  {
    const { clientImport, clientLot, companies } = creerMocks()
    const rapport = await persisterLotSdr('VSG_SDR_ENRICH_01', MEMBRES_VSG_SDR_ENRICH_01, 'TEST', clientImport, clientLot)
    t('2. 1er appel -> non bloqué', !rapport.bloque)
    t('2b. companiesCreees + companiesDejaPresentes = 50 (pas une hypothèse figée sur nbCrees)', rapport.companiesCreees + rapport.companiesDejaPresentes === 50)
    t('2c. 50 companies réellement en base (mock)', companies.size === 50)
  }

  // 3. Idempotence intra-lot — 2e appel
  {
    const { clientImport, clientLot } = creerMocks()
    await persisterLotSdr('VSG_SDR_ENRICH_01', MEMBRES_VSG_SDR_ENRICH_01, 'TEST', clientImport, clientLot)
    const rapport2 = await persisterLotSdr('VSG_SDR_ENRICH_01', MEMBRES_VSG_SDR_ENRICH_01, 'TEST', clientImport, clientLot)
    t('3. 2e appel -> 0 nouvelle company créée', rapport2.companiesCreees === 0)
    t('3b. 2e appel -> 50 membresDejaPresents', rapport2.membresDejaPresents === 50)
    t('3c. 2e appel -> non bloqué', !rapport2.bloque)
  }

  // 4. CORRIGÉ : appartenance à un AUTRE lot ne bloque plus le lot entier
  {
    const { clientImport, clientLot } = creerMocks({
      '499023307': { siren: '499023307', statut: 'NON_TROUVE', telephone: null, verdictMatching: 'NON_TROUVE' },
    })
    const rapport = await persisterLotSdr('VSG_SDR_ENRICH_01', MEMBRES_VSG_SDR_ENRICH_01, 'TEST', clientImport, clientLot)
    t('4. SIREN présent dans un autre lot -> NE bloque PLUS le lot entier', !rapport.bloque)
    t('4b. Toujours 50 membres traités au total', rapport.membresInseresNouveaux + rapport.membresReutilises === 50)
  }

  // 4c. Réutilisation : résultat exploitable ailleurs -> jamais un nouvel appel Google (terminal)
  {
    const { clientImport, clientLot, membresLot } = creerMocks({
      '499023307': { siren: '499023307', statut: 'MATCH_FORT', telephone: '0601020304', verdictMatching: 'MATCH_FORT' },
    })
    const rapport = await persisterLotSdr('VSG_SDR_ENRICH_01', MEMBRES_VSG_SDR_ENRICH_01, 'TEST', clientImport, clientLot)
    t('4c. Résultat exploitable ailleurs -> réutilisé (1 membre), jamais rappelé', rapport.membresReutilises === 1)
    const membre = membresLot.get('VSG_SDR_ENRICH_01')?.get('499023307')
    t('4d. Le membre réutilisé est inséré avec le statut déjà exploitable', membre?.reutilisation?.statut === 'MATCH_FORT')
  }

  // 4e. Résultat NON exploitable ailleurs -> comportement par défaut = retraité normalement dans ce lot
  {
    const { clientImport, clientLot } = creerMocks({
      '499023307': { siren: '499023307', statut: 'AMBIGU', telephone: null, verdictMatching: 'AMBIGU' },
    })
    const rapport = await persisterLotSdr('VSG_SDR_ENRICH_01', MEMBRES_VSG_SDR_ENRICH_01, 'TEST', clientImport, clientLot)
    t('4e. Résultat AMBIGU ailleurs -> pas réutilisé, traité normalement (politique par défaut)', rapport.membresReutilises === 0 && rapport.membresInseresNouveaux === 50)
  }

  // 5. Garde-fou DUR restant : doublon de SIREN DANS LE MÊME lot -> bloque
  {
    const { clientImport, clientLot } = creerMocks()
    const avecDoublon = [...MEMBRES_VSG_SDR_ENRICH_01, MEMBRES_VSG_SDR_ENRICH_01[0]]
    const rapport = await persisterLotSdr('VSG_SDR_ENRICH_01', avecDoublon, 'TEST', clientImport, clientLot)
    t('5. Doublon DANS le même lot -> bloqué', rapport.bloque)
  }

  // 6. Aucun VRAI usage prospects_sales/temperature/NBA
  {
    const fs = require('fs')
    let propre = true
    for (const f of ['persister-lot-sdr.ts', 'persistance-lot-sdr-supabase.ts']) {
      const src = fs.readFileSync(__dirname + '/' + f, 'utf-8')
      if (/\.from\(['"]prospects_sales['"]\)/.test(src)) propre = false
      if (/\btemperature\s*[:=]/i.test(src) || /\bpriorite_interne\s*[:=]/i.test(src) || /\bnext_action/i.test(src)) propre = false
    }
    t('6. Aucun vrai usage prospects_sales/temperature/NBA', propre)
  }

  // 7. Contrainte DB d'idempotence documentée dans la migration
  {
    const fs = require('fs')
    const sql = fs.readFileSync(__dirname + '/migration-sdr-vsg4-rang-famille-siret-non-executee.sql', 'utf-8')
    t('7. Contrainte UNIQUE(lot_code, siren) présente dans la migration proposée', sql.includes('UNIQUE (lot_code, siren)'))
  }

  // 8. Comptage générique — dédup par numéro normalisé
  {
    const lignes = [
      { companyId: 'c1', siren: 's1', telephone: '06 01 02 03 04', statut: 'MATCH_FORT' },
      { companyId: 'c2', siren: 's2', telephone: '0601020304', statut: 'MATCH_FORT' }, // même numéro, entreprise différente
      { companyId: 'c3', siren: 's3', telephone: '07 11 22 33 44', statut: 'MATCH_FORT' },
    ]
    const resultat = compterTelephonesFiables(lignes, 100)
    t('8. Numéro partagé par 2 entreprises -> aucune des deux comptée FIABLE', resultat.fiables === 1)
    t('8b. Les 2 partagées sont A_VERIFIER', resultat.aVerifier === 2)
    t('8c. manquants = 99 (100-1 fiable)', resultat.manquants === 99)
  }

  // 8d. Cas réel SDR.VSG.1/2 : SAKIRA/VLADIMIR partagent 09 81 12 78 43
  {
    const lignes = [
      { companyId: 'c_sakira', siren: '930150156', telephone: '09 81 12 78 43', statut: 'MATCH_PROBABLE' },
      { companyId: 'c_vladimir', siren: '853076719', telephone: '09 81 12 78 43', statut: 'MATCH_PROBABLE' },
      { companyId: 'c_kaer', siren: '810919258', telephone: '01 43 89 68 08', statut: 'MATCH_FORT' },
    ]
    const resultat = compterTelephonesFiables(lignes, 100)
    const sakira = resultat.details.find((d) => d.siren === '930150156')
    t('8d. Cas réel SAKIRA/VLADIMIR -> A_VERIFIER (jamais 2 fiables)', sakira?.qualification === 'A_VERIFIER')
    t('8e. KAER VSG PNEUS (numéro unique) -> FIABLE', resultat.details.find((d) => d.siren === '810919258')?.qualification === 'FIABLE')
  }

  // 9. ALEXANDRE MOLMY — signalé, jamais fusionné
  {
    const alex1 = MEMBRES_VSG_SDR_ENRICH_01.find((m) => m.siren === '316649862')
    const alex2 = MEMBRES_VSG_SDR_ENRICH_01.find((m) => m.siren === '492313028')
    t('9. Les 2 SIREN ALEXANDRE MOLMY restent 2 entrées distinctes (jamais fusionnées)', !!alex1 && !!alex2 && alex1.siren !== alex2.siren)
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
