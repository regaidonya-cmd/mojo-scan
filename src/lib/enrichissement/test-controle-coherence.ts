import { controlerCoherence, verifierCoherenceOuBloquer, IncoherenceImportError } from './controle-coherence-import'
import { ENTREPRISES_SIRENE_VSG_COMPLEMENT_18 } from './donnees-sirene-vsg50-complement'
import { ENTREPRISES_SIRENE_VSG_50 } from './donnees-sirene-vsg50'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

async function main() {
  // 1. Cas cohérent — tous les attendus présents dans la source, aucun doublon
  {
    const rapport = controlerCoherence(['a', 'b', 'c'], ['a', 'b', 'c', 'd'])
    t('1. Cas cohérent (source plus large que attendu) -> coherent=true', rapport.coherent)
    t('1b. Intersection = 3', rapport.nbIntersection === 3)
    t('1c. 1 supplémentaire détecté (non bloquant)', rapport.supplementairesDansLaSource.length === 1)
  }

  // 2. Cas incohérent — un attendu absent de la source
  {
    const rapport = controlerCoherence(['a', 'b', 'c'], ['a', 'b'])
    t('2. Attendu absent de la source -> coherent=false', !rapport.coherent)
    t('2b. absentsDeLaSource contient "c"', rapport.absentsDeLaSource.includes('c'))
  }

  // 3. Doublons dans la source -> incohérent
  {
    const rapport = controlerCoherence(['a', 'b'], ['a', 'a', 'b'])
    t('3. Doublon dans la source -> coherent=false', !rapport.coherent)
    t('3b. doublonsDansLaSource contient "a"', rapport.doublonsDansLaSource.includes('a'))
  }

  // 4. verifierCoherenceOuBloquer lève une exception si incohérent
  {
    try {
      verifierCoherenceOuBloquer(['a', 'b', 'c'], ['a', 'b'])
      t('4. FAIL attendu', false)
    } catch (e) {
      t('4. Exception levée (IncoherenceImportError) si incohérent', e instanceof IncoherenceImportError)
    }
  }

  // 5. verifierCoherenceOuBloquer ne lève rien si cohérent
  {
    let leve = false
    try { verifierCoherenceOuBloquer(['a', 'b'], ['a', 'b', 'c']) } catch { leve = true }
    t('5. Aucune exception si cohérent (même avec un supplémentaire)', !leve)
  }

  // ══════════════════════════════════════════════════════════════
  // VSG.DATA.3 — Vérification concrète sur les vraies données
  // ══════════════════════════════════════════════════════════════

  // 6. Le complément contient exactement 18 entreprises
  t('6. ENTREPRISES_SIRENE_VSG_COMPLEMENT_18 contient exactement 18 entrées', ENTREPRISES_SIRENE_VSG_COMPLEMENT_18.length === 18)

  // 7. Aucun doublon de SIREN entre les 50 originales et les 18 complément
  {
    const sirens50 = new Set(ENTREPRISES_SIRENE_VSG_50.map((e) => e.siren))
    const doublons = ENTREPRISES_SIRENE_VSG_COMPLEMENT_18.filter((e) => sirens50.has(e.siren))
    t('7. Aucun doublon de SIREN entre les 50 originales et les 18 complément', doublons.length === 0)
  }

  // 8. Simulation exacte : les 40 SIREN réels (source de vérité fournie par l'utilisateur) sont
  // TOUS couverts par {50 originales + 18 complément + BLACK & HOLE}
  {
    const SIREN_40_REELS = ['442805016','503698664','531825974','752648584','801207788','802072801','810919258','818388209','819064395','823091707','823297619','827678012','833055155','842979239','847638814','848030912','848989034','850718438','853076719','880481163','889128013','892483843','895105369','902579937','907652242','912141892','922198106','922714613','923178099','928762400','929131407','929562924','930150156','930919063','931267561','932369598','932452261','933418220','984064600','987484441']
    const sirenSource = [...ENTREPRISES_SIRENE_VSG_50.map((e) => e.siren), ...ENTREPRISES_SIRENE_VSG_COMPLEMENT_18.map((e) => e.siren), '819064395']
    const rapport = controlerCoherence(SIREN_40_REELS, sirenSource)
    t('8. Les 40 SIREN réels sont TOUS couverts par 50+18+BLACK&HOLE -> coherent=true', rapport.coherent)
    t('8b. Intersection = 40 (les 40 réels tous trouvés)', rapport.nbIntersection === 40)
  }

  // 9. Sans le complément (bug VSG.DATA.2 reproduit), l'incohérence est bien détectée
  {
    const SIREN_40_REELS = ['442805016','503698664','531825974','752648584','801207788','802072801','810919258','818388209','819064395','823091707','823297619','827678012','833055155','842979239','847638814','848030912','848989034','850718438','853076719','880481163','889128013','892483843','895105369','902579937','907652242','912141892','922198106','922714613','923178099','928762400','929131407','929562924','930150156','930919063','931267561','932369598','932452261','933418220','984064600','987484441']
    const sirenSourceSans18 = [...ENTREPRISES_SIRENE_VSG_50.map((e) => e.siren), '819064395'] // reproduit exactement le bug VSG.DATA.2
    const rapport = controlerCoherence(SIREN_40_REELS, sirenSourceSans18)
    t('9. SANS le complément (bug reproduit) -> coherent=false, exactement 18 absents', !rapport.coherent && rapport.absentsDeLaSource.length === 18)
  }

  // 10. La route bloque si le garde-fou échoue — vérification structurelle
  {
    const fs = require('fs')
    const routeSrc = fs.readFileSync(__dirname + '/../../app/api/admin/vsg-data2-import50/route.ts', 'utf-8')
    t('10. verifierCoherenceOuBloquer appelé AVANT importerLotEntreprises', routeSrc.indexOf('verifierCoherenceOuBloquer') < routeSrc.indexOf('importerLotEntreprises('))
    t('10b. IncoherenceImportError retourne 409, jamais une écriture silencieuse', routeSrc.includes('status: 409'))
  }

  // 11. Compteur nbRattaches — vérification structurelle qu'il compte les lignes réellement affectées
  {
    const fs = require('fs')
    const routeSrc = fs.readFileSync(__dirname + '/../../app/api/admin/vsg-data2-import50/route.ts', 'utf-8')
    t('11. nbRattaches utilise .select(\'id\') après update pour compter les lignes réellement affectées', routeSrc.includes("nbRattaches += lignesMaj?.length"))
    t('11b. Plus de faux "if (!error) nbRattaches++"', !routeSrc.includes('if (!error) nbRattaches++'))
  }

  // 12. BLACK & HOLE jamais recréé — vérification structurelle
  {
    const fs = require('fs')
    const routeSrc = fs.readFileSync(__dirname + '/../../app/api/admin/vsg-data2-import50/route.ts', 'utf-8')
    t('12. BLACK & HOLE (819064395) jamais inclus dans entreprisesAImporter (seulement rattaché)', !/entreprisesAImporter[\s\S]*819064395/.test(routeSrc))
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
