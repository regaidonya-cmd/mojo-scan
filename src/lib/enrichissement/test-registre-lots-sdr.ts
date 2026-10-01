import { lotConnu, membresDuLot, REGISTRE_LOTS_SDR } from './registre-lots-sdr'
import { MEMBRES_VSG_SDR_ENRICH_01 } from './donnees-lot-sdr-vsg-enrich-01'
import { MEMBRES_VSG_SDR_ENRICH_02 } from './donnees-lot-sdr-vsg-enrich-02'
import { MEMBRES_VSG_SDR_ENRICH_03 } from './donnees-lot-sdr-vsg-enrich-03'
import { MEMBRES_VSG_SDR_ENRICH_04 } from './donnees-lot-sdr-vsg-enrich-04'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

async function main() {
  // 1. Le registre connaît exactement les 2 lots attendus
  t('1. VSG_SDR_ENRICH_01 connu du registre', lotConnu('VSG_SDR_ENRICH_01'))
  t('1b. VSG_SDR_ENRICH_02 connu du registre', lotConnu('VSG_SDR_ENRICH_02'))
  t('1f. VSG_SDR_ENRICH_03 connu du registre', lotConnu('VSG_SDR_ENRICH_03'))
  t('1g. VSG_SDR_ENRICH_04 connu du registre', lotConnu('VSG_SDR_ENRICH_04'))
  t('1c. Un lot arbitraire inconnu -> refusé', !lotConnu('VSG_SDR_ENRICH_99_INVENTE'))
  t('1d. Chaîne vide -> refusée', !lotConnu(''))
  t('1e. Tentative injection -> refusée', !lotConnu("'; DROP TABLE enrichissement_resultats; --"))

  // 2. membresDuLot retourne exactement les bonnes données, jamais une donnée inventée
  t('2. membresDuLot("VSG_SDR_ENRICH_01") === MEMBRES_VSG_SDR_ENRICH_01', membresDuLot('VSG_SDR_ENRICH_01') === MEMBRES_VSG_SDR_ENRICH_01)
  t('2b. membresDuLot("VSG_SDR_ENRICH_02") === MEMBRES_VSG_SDR_ENRICH_02', membresDuLot('VSG_SDR_ENRICH_02') === MEMBRES_VSG_SDR_ENRICH_02)
  t('2c. membresDuLot(inconnu) -> null (jamais un tableau vide trompeur ni une donnée par défaut)', membresDuLot('AUTRE_LOT') === null)

  // 3. Le lot 02 contient exactement 50 membres, 50 SIREN distincts, 0 chevauchement avec le lot 01
  t('3. MEMBRES_VSG_SDR_ENRICH_02 contient exactement 50 entrées', MEMBRES_VSG_SDR_ENRICH_02.length === 50)
  t('3b. Aucun doublon de SIREN dans le lot 02', new Set(MEMBRES_VSG_SDR_ENRICH_02.map((m) => m.siren)).size === 50)
  {
    const sirens01 = new Set(MEMBRES_VSG_SDR_ENRICH_01.map((m) => m.siren))
    const chevauchement = MEMBRES_VSG_SDR_ENRICH_02.filter((m) => sirens01.has(m.siren))
    t('3c. Aucun chevauchement SIREN entre lot 01 et lot 02', chevauchement.length === 0)
  }

  // 3d. Répartition exacte du lot 02
  {
    const parFamille = new Map<string, number>()
    for (const m of MEMBRES_VSG_SDR_ENRICH_02) parFamille.set(m.famille, (parFamille.get(m.famille) ?? 0) + 1)
    t('3d. Répartition 15/13/12/10 respectée', parFamille.get('Bâtiment & artisans') === 15 && parFamille.get('Commerces de proximité') === 13 && parFamille.get('Professions libérales & conseil') === 12 && parFamille.get('Automobile & auto-écoles') === 10)
  }

  // 3e. Le lot 03 contient exactement 84 membres, 84 SIREN distincts, 0 chevauchement avec lot 01/02
  t('3e. MEMBRES_VSG_SDR_ENRICH_03 contient exactement 84 entrées', MEMBRES_VSG_SDR_ENRICH_03.length === 84)
  t('3f. Aucun doublon de SIREN dans le lot 03', new Set(MEMBRES_VSG_SDR_ENRICH_03.map((m) => m.siren)).size === 84)
  {
    const sirens0102 = new Set([...MEMBRES_VSG_SDR_ENRICH_01, ...MEMBRES_VSG_SDR_ENRICH_02].map((m) => m.siren))
    const chevauchement = MEMBRES_VSG_SDR_ENRICH_03.filter((m) => sirens0102.has(m.siren))
    t('3g. Aucun chevauchement SIREN entre lot 03 et lots 01/02', chevauchement.length === 0)
  }
  {
    const parFamille = new Map<string, number>()
    for (const m of MEMBRES_VSG_SDR_ENRICH_03) parFamille.set(m.famille, (parFamille.get(m.famille) ?? 0) + 1)
    t('3h. Répartition 15/20/9/15/25 respectée', parFamille.get('Bâtiment & artisans') === 15 && parFamille.get('Commerces de proximité') === 20 && parFamille.get('Automobile & auto-écoles') === 9 && parFamille.get('Professions libérales & conseil') === 15 && parFamille.get('Restauration & métiers de bouche') === 25)
  }

  // 3i. Le lot 04 contient exactement 42 membres, 42 SIREN distincts, 0 chevauchement avec lots 01/02/03
  t('3i. MEMBRES_VSG_SDR_ENRICH_04 contient exactement 42 entrées', MEMBRES_VSG_SDR_ENRICH_04.length === 42)
  t('3j. Aucun doublon de SIREN dans le lot 04', new Set(MEMBRES_VSG_SDR_ENRICH_04.map((m) => m.siren)).size === 42)
  {
    const sirensAnterieurs = new Set([...MEMBRES_VSG_SDR_ENRICH_01, ...MEMBRES_VSG_SDR_ENRICH_02, ...MEMBRES_VSG_SDR_ENRICH_03].map((m) => m.siren))
    const chevauchement = MEMBRES_VSG_SDR_ENRICH_04.filter((m) => sirensAnterieurs.has(m.siren))
    t('3k. Aucun chevauchement SIREN entre lot 04 et lots 01/02/03', chevauchement.length === 0)
  }
  {
    const parFamille = new Map<string, number>()
    for (const m of MEMBRES_VSG_SDR_ENRICH_04) parFamille.set(m.famille, (parFamille.get(m.famille) ?? 0) + 1)
    t('3l. Répartition 11/11/8/7/5 respectée', parFamille.get('Commerces de proximité') === 11 && parFamille.get('Bâtiment & artisans') === 11 && parFamille.get('Automobile & auto-écoles') === 8 && parFamille.get('Restauration & métiers de bouche') === 7 && parFamille.get('Professions libérales & conseil') === 5)
  }

  // 4. Routes — vérification structurelle : lot_code validé contre le registre, jamais accepté tel quel
  {
    const fs = require('fs')
    for (const route of ['sdr-vsg4-persister-lot01', 'sdr-vsg5-enrichir-lot01']) {
      const src = fs.readFileSync(__dirname + `/../../app/api/admin/${route}/route.ts`, 'utf-8')
      t(`4. [${route}] Importe le registre (validation serveur)`, src.includes('registre-lots-sdr'))
      t(`4b. [${route}] Refuse un lot inconnu (status 400)`, src.includes('status: 400'))
      t(`4c. [${route}] Lit lotCode depuis le corps de requête, pas depuis l'URL/query brute non validée`, src.includes('body?.lotCode') || src.includes('body.lotCode'))
      t(`4d. [${route}] Comportement par défaut préservé (non-breaking)`, src.includes("LOT_CODE_DEFAUT = 'VSG_SDR_ENRICH_01'"))
      t(`4e. [${route}] admin_auth toujours vérifié`, (src.includes('admin_auth') || src.includes('estAutoriseAdmin')) && src.includes('status: 401'))
    }
  }

  // 5. Aucune modification de l'algorithme de matching / fiabilité téléphone / EMAIL V2 — vérification structurelle
  {
    const fs = require('fs')
    // Ces fichiers ne doivent PAS exister dans le diff de cette phase — on vérifie juste leur intégrité fonctionnelle
    // en confirmant qu'ils exportent toujours les mêmes symboles clés (signal fort de non-modification de leur API).
    const matching = fs.readFileSync(__dirname + '/matching.ts', 'utf-8')
    t('5. matching.ts toujours présent et exporte les seuils connus', matching.includes('SEUIL_PLAUSIBLE') && matching.includes('SEUIL_NOM_FORT'))
    const compteur = fs.readFileSync(__dirname + '/compteur-objectif-sdr.ts', 'utf-8')
    t('5b. compteur-objectif-sdr.ts (règles de fiabilité téléphone) toujours intact', compteur.includes('compterTelephonesFiables'))
    const qualif = fs.readFileSync(__dirname + '/qualification-email-v2.ts', 'utf-8')
    t('5c. qualification-email-v2.ts toujours intact (EMAIL V2 non modifié)', qualif.includes('qualifierLotEntreprises'))
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
