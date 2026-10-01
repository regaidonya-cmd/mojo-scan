import { lireLotDepuisDB } from './lecture-lot-sdr'
import { construireRapportPostLot } from './rapport-post-lot'
import type { LigneResultatLot } from './rapport-post-lot'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

function creerMockSupabase(lignes: any[], companies: Record<string, any>, etablissements: Record<string, any>) {
  return {
    from(table: string) {
      return {
        select() { return this },
        eq(col: string, val: any) { (this as any)._eq = (this as any)._eq || {}; (this as any)._eq[col] = val; return this },
        in() { return this },
        not() { return this },
        async then() { return { data: null, error: null } },
        async single() {
          if (table === 'companies') {
            const id = (this as any)._eq?.id
            return companies[id] ? { data: companies[id], error: null } : { data: null, error: { message: 'introuvable' } }
          }
          return { data: null, error: { message: 'non supporté' } }
        },
        async maybeSingle() {
          if (table === 'etablissements') {
            const companyId = (this as any)._eq?.company_id
            const siret = (this as any)._eq?.siret
            const key = `${companyId}_${siret}`
            return { data: etablissements[key] ?? null, error: null }
          }
          return { data: null, error: null }
        },
      }
    },
    _lignesEnrichissement: lignes,
  }
}

// Mock simplifié dédié : on surcharge directement lireLotDepuisDB avec un faux client minimal adapté.
async function testerLectureLotSimple() {
  const lignes = [
    { siren: '111', company_id: 'c1', siret: 's1', rang: 1, famille_metier: 'Bâtiment & artisans' },
    { siren: '222', company_id: null, siret: 's2', rang: 2, famille_metier: 'Restauration' }, // company_id manquant
  ]
  const companies: Record<string, any> = { c1: { name: 'ENTREPRISE UN', trade_name: null, naf: '43.22A' } }
  const etablissements: Record<string, any> = { 'c1_s1': { adresse: '1 RUE X', code_postal: '94190', ville: 'VILLENEUVE-SAINT-GEORGES' } }

  const supabaseMock: any = {
    from(table: string) {
      const builder: any = {
        _filters: {} as Record<string, any>,
        select() { return this },
        eq(col: string, val: any) { this._filters[col] = val; return this },
      }
      if (table === 'enrichissement_resultats') {
        builder.then = (resolve: any) => resolve({ data: lignes, error: null })
      }
      if (table === 'companies') {
        builder.single = async () => {
          const id = builder._filters.id
          return companies[id] ? { data: companies[id], error: null } : { data: null, error: { message: 'introuvable' } }
        }
      }
      if (table === 'etablissements') {
        builder.maybeSingle = async () => {
          const key = `${builder._filters.company_id}_${builder._filters.siret}`
          return { data: etablissements[key] ?? null, error: null }
        }
      }
      return builder
    },
  }

  const resultat = await lireLotDepuisDB(supabaseMock, 'VSG_SDR_ENRICH_01')
  t('1. Lecture DB : 1 membre valide reconstitué', resultat.membres.length === 1 && resultat.membres[0].siren === '111')
  t('1b. Ligne sans company_id exclue, pas inventée', resultat.lignesExclues.some((l) => l.siren === '222' && l.raison.includes('company_id')))
  t('1c. Membre reconstitué conserve rang/famille/lotCode', resultat.membres[0].rang === 1 && resultat.membres[0].familleMetier === 'Bâtiment & artisans' && resultat.membres[0].lotCode === 'VSG_SDR_ENRICH_01')
}

async function main() {
  await testerLectureLotSimple()

  // 2. Rapport post-lot — statistiques correctes
  {
    const lignes: LigneResultatLot[] = [
      { siren: '1', companyId: 'c1', familleMetier: 'Bâtiment & artisans', statut: 'MATCH_FORT', telephone: '0601020304', siteWeb: 'https://x.fr', erreur: null },
      { siren: '2', companyId: 'c2', familleMetier: 'Bâtiment & artisans', statut: 'NON_TROUVE', telephone: null, siteWeb: null, erreur: null },
      { siren: '3', companyId: 'c3', familleMetier: 'Restauration & métiers de bouche', statut: 'MATCH_PROBABLE', telephone: '0611223344', siteWeb: null, erreur: null },
    ]
    const rapport = construireRapportPostLot(lignes)
    t('2. interroges = 3', rapport.interroges === 3)
    t('2b. matchFort = 1, nonTrouve = 1, matchProbable = 1', rapport.matchFort === 1 && rapport.nonTrouve === 1 && rapport.matchProbable === 1)
    t('2c. telephonesObtenus = 2', rapport.telephonesObtenus === 2)
    t('2d. 2 familles distinctes dans parFamille', rapport.parFamille.length === 2)
    const bat = rapport.parFamille.find((f) => f.famille === 'Bâtiment & artisans')
    t('2e. Famille Bâtiment : tauxTelephonePct = 50 (1 tel sur 2)', bat?.tauxTelephonePct === 50)
  }

  // 3. Dédup téléphones partagés dans le rapport — jamais 2 fiables sur le même numéro
  {
    const lignes: LigneResultatLot[] = [
      { siren: '1', companyId: 'c1', familleMetier: 'X', statut: 'MATCH_PROBABLE', telephone: '09 81 12 78 43', siteWeb: null, erreur: null },
      { siren: '2', companyId: 'c2', familleMetier: 'X', statut: 'MATCH_PROBABLE', telephone: '09 81 12 78 43', siteWeb: null, erreur: null },
    ]
    const rapport = construireRapportPostLot(lignes)
    t('3. Numéro partagé -> 0 fiable, 2 A_VERIFIER', rapport.telephonesFiables === 0 && rapport.telephonesAVerifier === 2)
  }

  // 4. Garde-fous — vérification structurelle de la route
  {
    const fs = require('fs')
    const src = fs.readFileSync(__dirname + '/../../app/api/admin/sdr-vsg5-enrichir-lot01/route.ts', 'utf-8')
    t('4. MAX_TEXT_SEARCH = 50', src.includes('MAX_TEXT_SEARCH = 50'))
    t('4b. MAX_PLACE_DETAILS = 50', src.includes('MAX_PLACE_DETAILS = 50'))
    t('4c. Lecture depuis lireLotDepuisDB (jamais une constante statique)', src.includes('lireLotDepuisDB'))
    t('4d. Aucun import de donnees-lot-sdr-vsg-enrich-01 (liste figée) dans la route', !src.includes('donnees-lot-sdr-vsg-enrich-01'))
    t('4e. Réutilise enrichirBatchAvecReprise (pas de second moteur)', src.includes('enrichirBatchAvecReprise'))
    t('4f. Réutilise supabasePersistanceClient (ENRICH.VSG.6)', src.includes('supabasePersistanceClient'))
    t('4g. admin_auth vérifié', (src.includes('admin_auth') || src.includes('estAutoriseAdmin')) && src.includes('status: 401'))
    t('4h. Clé Google vérifiée avant tout traitement', src.includes('GOOGLE_PLACES_API_KEY'))
  }

  // 5. Aucune référence prospects_sales/temperature/NBA/Brevo dans les nouveaux fichiers
  {
    const fs = require('fs')
    let propre = true
    for (const f of ['lecture-lot-sdr.ts', 'rapport-post-lot.ts']) {
      const src = fs.readFileSync(__dirname + '/' + f, 'utf-8')
      if (/\.from\(['"]prospects_sales['"]\)/.test(src)) propre = false
      if (/brevo/i.test(src)) propre = false
      if (/\btemperature\s*[:=]/i.test(src) || /\bnext_action/i.test(src)) propre = false
    }
    t('5. Aucune référence prospects_sales/Brevo/température/NBA', propre)
  }

  // 6. Aucun second moteur Google créé (pas de nouveau textSearch/placeDetails réimplémenté)
  {
    const fs = require('fs')
    const src = fs.readFileSync(__dirname + '/../../app/api/admin/sdr-vsg5-enrichir-lot01/route.ts', 'utf-8')
    t('6. Aucun fetch() direct vers googleapis dans la route (délégué à l\'orchestrateur existant)', !src.includes('googleapis.com'))
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
