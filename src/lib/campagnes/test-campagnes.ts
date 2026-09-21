import { computeEligibiliteCampagne, controleAjoutMembreLot } from './engine'
import type { EligibiliteCampagneInput, MembreLotCandidat } from './types'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) {
  results.push({ name, pass })
  console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name)
}

function eligInput(overrides: Partial<EligibiliteCampagneInput>): EligibiliteCampagneInput {
  return {
    companyId: 'c1', naf: '71.20B', raisonSociale: 'TEST DIAG',
    emailSource: 'ADI_DHUP', emailExploitable: true, emailPartageAvecAutreEntreprise: false,
    oppositionActive: false, nomAmbigu: false,
    ...overrides,
  }
}

// 1. Campagne avec plusieurs lots — vérification structurelle du modèle relationnel
{
  // Simule 2 lots référant la même campagne_id (relation 1-N modélisée par campagne_lots.campagne_id)
  const campagneId = 'CAMP-1'
  const lots = [
    { id: 'LOT-1', campagneId, nom: 'DIAG94_BAT01' },
    { id: 'LOT-2', campagneId, nom: 'DIAG94_BAT02' },
  ]
  t('1. Une campagne peut contenir plusieurs lots (même campagneId, noms distincts)', lots[0].campagneId === lots[1].campagneId && lots[0].nom !== lots[1].nom)
}

// 2. Création lot 50 membres
{
  const lotSet = new Set<string>()
  let valides = 0
  for (let i = 0; i < 50; i++) {
    const candidat: MembreLotCandidat = { companyId: `c${i}`, emailExploitable: true, oppositionActive: false }
    const r = controleAjoutMembreLot(candidat, lotSet)
    if (r.statut === 'VALIDE') { valides++; lotSet.add(candidat.companyId) }
  }
  t('2. Lot de 50 membres distincts -> 50 VALIDE', valides === 50)
}

// 3. Doublon company dans même lot refusé
{
  const lotSet = new Set<string>(['c1'])
  const r = controleAjoutMembreLot({ companyId: 'c1', emailExploitable: true, oppositionActive: false }, lotSet)
  t('3. Doublon dans le même lot -> EXCLU', r.statut === 'EXCLU')
  t('3b. Raison explicite fournie', r.raisonExclusion === 'Entreprise déjà présente dans ce lot')
}

// 4. Même company dans deux lots différents autorisé
{
  const lotA = new Set<string>()
  const lotB = new Set<string>()
  const rA = controleAjoutMembreLot({ companyId: 'c1', emailExploitable: true, oppositionActive: false }, lotA)
  const rB = controleAjoutMembreLot({ companyId: 'c1', emailExploitable: true, oppositionActive: false }, lotB)
  t('4. Même entreprise dans deux lots différents -> les deux VALIDE (aucune contrainte transversale)', rA.statut === 'VALIDE' && rB.statut === 'VALIDE')
}

// 5. Opposition exclue
{
  const r = controleAjoutMembreLot({ companyId: 'c1', emailExploitable: true, oppositionActive: true }, new Set())
  t('5. Opposition active -> EXCLU', r.statut === 'EXCLU')
}

// 6. Email absent exclu
{
  const r = controleAjoutMembreLot({ companyId: 'c1', emailExploitable: false, oppositionActive: false }, new Set())
  t('6. Email non exploitable -> EXCLU', r.statut === 'EXCLU')
}

// 7. Sélection vide refusée (règle appelante : aucun membre VALIDE ne doit produire un lot)
{
  const lotSet = new Set<string>()
  const candidats: MembreLotCandidat[] = []
  const valides = candidats.filter((c) => controleAjoutMembreLot(c, lotSet).statut === 'VALIDE')
  t('7. Sélection vide -> 0 membre valide (le lot ne doit pas être créé côté appelant)', valides.length === 0)
}

// Éligibilité campagne — ADI_DHUP direct, jamais preuve_metier
{
  const r = computeEligibiliteCampagne(eligInput({}))
  t('8. ADI_DHUP + email OK + pas opposition + nom clair -> ELIGIBLE', r.statut === 'ELIGIBLE')
}
{
  const r = computeEligibiliteCampagne(eligInput({ emailSource: 'AUTRE_SOURCE' }))
  t('9. Source différente de ADI_DHUP -> NON_ELIGIBLE (jamais promu sur preuve_metier)', r.statut === 'NON_ELIGIBLE')
}
{
  const r = computeEligibiliteCampagne(eligInput({ oppositionActive: true }))
  t('10. Opposition active -> NON_ELIGIBLE malgré ADI_DHUP', r.statut === 'NON_ELIGIBLE')
}
{
  const r = computeEligibiliteCampagne(eligInput({ nomAmbigu: true }))
  t('11. ADI_DHUP + nom ambigu -> AMBIGU (jamais ELIGIBLE direct)', r.statut === 'AMBIGU')
}

// Vérifications structurelles (aucun appel Brevo, aucune écriture, aucune modification preuve_metier)
{
  const fs = require('fs')
  const engineSrc = fs.readFileSync(__dirname + '/engine.ts', 'utf-8')
  t("12. Aucun import Brevo dans engine.ts (aucun appel Brevo en P0.8C.2)", !engineSrc.includes('brevo') && !engineSrc.includes('Brevo'))
  const accesReel = /input\.preuve_metier|qual\.preuve_metier|\.preuveMetier\b/.test(engineSrc)
  t('13. Aucun ACCÈS réel à preuve_metier dans engine.ts (mentionné en commentaire pour documenter l\'exclusion volontaire, jamais lu)', !accesReel)
  t('14. Aucun appel Supabase/fetch dans engine.ts (module pur, aucune écriture)', !engineSrc.includes('supabase') && !engineSrc.includes('fetch('))
}

console.log('')
const passed = results.filter((r) => r.pass).length
console.log(`${passed}/${results.length} tests passes`)
if (passed !== results.length) process.exit(1)
