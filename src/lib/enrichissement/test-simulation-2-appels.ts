import { verifierCoherenceOuBloquer } from './controle-coherence-import'
import { ENTREPRISES_SIRENE_VSG_50 } from './donnees-sirene-vsg50'
import { ENTREPRISES_SIRENE_VSG_COMPLEMENT_18 } from './donnees-sirene-vsg50-complement'
import { importerLotEntreprises, versEntrepriseAImporter } from './import-companies-vsg50'
import type { PersistanceImportClient, EntrepriseAImporter } from './import-companies-vsg50'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

const SIREN_40_REELS = ['442805016','503698664','531825974','752648584','801207788','802072801','810919258','818388209','819064395','823091707','823297619','827678012','833055155','842979239','847638814','848030912','848989034','850718438','853076719','880481163','889128013','892483843','895105369','902579937','907652242','912141892','922198106','922714613','923178099','928762400','929131407','929562924','930150156','930919063','931267561','932369598','932452261','933418220','984064600','987484441']
const SIREN_BLACK_HOLE = '819064395'

/** Simule un état de base complet : companies, etablissements,
 * enrichissement_resultats (40 lignes, 21 déjà rattachées au départ,
 * comme l'état réel de production avant correction). */
function creerEtatInitial() {
  const companies = new Map<string, { id: string; siren: string }>()
  const etablissements = new Set<string>()
  const enrichissements = new Map<string, string | null>() // siren -> company_id | null
  let idCounter = 0

  // Les 21 déjà rattachés en production (intersection des 50 initiales et des 40 réels) + BLACK & HOLE préexistant
  companies.set(SIREN_BLACK_HOLE, { id: 'company_black_hole_existant', siren: SIREN_BLACK_HOLE })
  for (const siren of SIREN_40_REELS) {
    if (ENTREPRISES_SIRENE_VSG_50.some((e) => e.siren === siren)) {
      const id = `company_${idCounter++}`
      companies.set(siren, { id, siren })
      enrichissements.set(siren, id) // déjà rattaché (comme en production)
    } else {
      enrichissements.set(siren, null) // pas encore rattaché
    }
  }
  return { companies, etablissements, enrichissements, idCounter }
}

function creerClient(etat: ReturnType<typeof creerEtatInitial>): PersistanceImportClient {
  return {
    async companyExisteDeja(siren) { return etat.companies.has(siren) },
    async trouverOuCreerCompany(e: EntrepriseAImporter) {
      if (etat.companies.has(e.siren)) return { id: etat.companies.get(e.siren)!.id, creeMaintenant: false }
      const id = `company_${etat.idCounter++}`
      etat.companies.set(e.siren, { id, siren: e.siren })
      return { id, creeMaintenant: true }
    },
    async etablissementExisteDeja(siret) { return etat.etablissements.has(siret) },
    async insererEtablissement(companyId, e: EntrepriseAImporter) { etat.etablissements.add(e.siret) },
    async supprimerCompany(companyId) {
      for (const [siren, c] of Array.from(etat.companies.entries())) if (c.id === companyId) etat.companies.delete(siren)
    },
  }
}

function simulerRattachement(etat: ReturnType<typeof creerEtatInitial>): number {
  let nbRattaches = 0
  for (const siren of Array.from(etat.enrichissements.keys())) {
    if (etat.enrichissements.get(siren) === null && etat.companies.has(siren)) {
      etat.enrichissements.set(siren, etat.companies.get(siren)!.id)
      nbRattaches++
    }
  }
  return nbRattaches
}

async function main() {
  // 1. Le garde-fou reste cohérent MÊME quand les 18 sont déjà présentes (2e appel)
  {
    const sirenSource = [...ENTREPRISES_SIRENE_VSG_50.map((e) => e.siren), ...ENTREPRISES_SIRENE_VSG_COMPLEMENT_18.map((e) => e.siren), SIREN_BLACK_HOLE]
    let leve = false
    try { verifierCoherenceOuBloquer(SIREN_40_REELS, sirenSource) } catch { leve = true }
    t('1. Garde-fou cohérent (jamais bloquant) indépendamment de l\'état d\'existence en base des 18', !leve)
  }

  // 2. Simulation complète — 1er appel réel
  {
    const etat = creerEtatInitial()
    const nbNullAvant = Array.from(etat.enrichissements.values()).filter((v) => v === null).length
    t('2. État initial -> 19 lignes VSG_BAT50 encore NULL (18 manquantes + BLACK&HOLE)', nbNullAvant === 19)

    const client = creerClient(etat)
    const entreprises = ENTREPRISES_SIRENE_VSG_COMPLEMENT_18.map((e) => versEntrepriseAImporter(e.siren, e.siret, e.name, e.enseigne, e.naf, e.address, e.postalCode, e.city, e.effectif, e.siege, 'TEST'))
    const rapport1 = await importerLotEntreprises(entreprises, client)
    t('2b. 1er appel -> 18 companies créées', rapport1.nbCrees === 18)
    t('2c. 1er appel -> 0 erreur', rapport1.nbErreurs === 0)

    const nbRattaches1 = simulerRattachement(etat)
    t('2d. 1er appel -> 19 rattachements réels (18 nouveaux + BLACK&HOLE)', nbRattaches1 === 19)

    const nbNullApres1 = Array.from(etat.enrichissements.values()).filter((v) => v === null).length
    t('2e. Après 1er appel -> 0 ligne VSG_BAT50 encore NULL', nbNullApres1 === 0)

    // 3. Simulation du 2e appel (double appel accidentel)
    const rapport2 = await importerLotEntreprises(entreprises, client)
    t('3. 2e appel -> 0 company créée', rapport2.nbCrees === 0)
    t('3b. 2e appel -> 18 DEJA_PRESENT', rapport2.nbDejaPresents === 18)

    const nbRattaches2 = simulerRattachement(etat)
    t('3c. 2e appel -> 0 nouveau rattachement', nbRattaches2 === 0)

    const nbNullApres2 = Array.from(etat.enrichissements.values()).filter((v) => v === null).length
    t('3d. Après 2e appel -> toujours 0 ligne NULL (nbNullRestant=0)', nbNullApres2 === 0)

    // Garde-fou toujours cohérent au 2e appel
    const sirenSource = [...ENTREPRISES_SIRENE_VSG_50.map((e) => e.siren), ...ENTREPRISES_SIRENE_VSG_COMPLEMENT_18.map((e) => e.siren), SIREN_BLACK_HOLE]
    let leve = false
    try { verifierCoherenceOuBloquer(SIREN_40_REELS, sirenSource) } catch { leve = true }
    t('3e. Garde-fou toujours cohérent lors du 2e appel (ne bloque jamais une relance légitime)', !leve)
  }

  // 4. BLACK & HOLE jamais recréé même au 1er appel (déjà présent dans l'état initial)
  {
    const etat = creerEtatInitial()
    t('4. BLACK & HOLE présent avant tout appel (id existant conservé)', etat.companies.get(SIREN_BLACK_HOLE)?.id === 'company_black_hole_existant')
    const client = creerClient(etat)
    const entreprises = ENTREPRISES_SIRENE_VSG_COMPLEMENT_18.map((e) => versEntrepriseAImporter(e.siren, e.siret, e.name, e.enseigne, e.naf, e.address, e.postalCode, e.city, e.effectif, e.siege, 'TEST'))
    await importerLotEntreprises(entreprises, client)
    t('4b. Après import, BLACK & HOLE id INCHANGÉ (jamais recréé)', etat.companies.get(SIREN_BLACK_HOLE)?.id === 'company_black_hole_existant')
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
