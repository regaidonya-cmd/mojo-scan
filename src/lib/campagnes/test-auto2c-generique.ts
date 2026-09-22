import { computeEligibiliteCampagne, computeEligibiliteCampagneGenerique } from './engine'
import { resoudreConfigSegment, resoudreSignalNaf } from './segment-config'
import type { EligibiliteCampagneInput, EligibiliteCampagneInputGenerique } from './types'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) {
  results.push({ name, pass })
  console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name)
}

function diagInput(overrides: Partial<EligibiliteCampagneInput>): EligibiliteCampagneInput {
  return {
    companyId: 'c1', naf: '71.20B', raisonSociale: 'TEST DIAG',
    emailSource: 'ADI_DHUP', emailExploitable: true, emailPartageAvecAutreEntreprise: false,
    oppositionActive: false, nomAmbigu: false,
    ...overrides,
  }
}
function genInput(overrides: Partial<EligibiliteCampagneInputGenerique>): EligibiliteCampagneInputGenerique {
  return {
    companyId: 'c1', raisonSociale: 'TEST', segmentId: 'PARC-002',
    preuveMetierNiveau: 'CONFIRME', contactSource: 'RAFAEL', contactExploitable: true,
    contactPartageAvecAutreEntreprise: false, oppositionActive: false, nomAmbigu: false,
    ...overrides,
  }
}

// 1. DIAG + preuve ADI + email ADI => résultat historique conservé
{
  const r = computeEligibiliteCampagne(diagInput({}))
  t('1. DIAG ADI_DHUP complet -> ELIGIBLE (comportement historique conservé)', r.statut === 'ELIGIBLE')
}

// 2. DIAG confirmé + email site officiel => comportement explicitement testé
{
  const r = computeEligibiliteCampagne(diagInput({ emailSource: 'SITE_WEB_SCAN' }))
  t('2. DIAG + email site officiel (pas ADI_DHUP) -> NON_ELIGIBLE (config DIAG n\'accepte que ADI_DHUP comme preuve ET contact — comportement explicite, pas un crash)', r.statut === 'NON_ELIGIBLE')
}

// 3. AUTO + preuve métier officielle + email site => potentiellement éligible
{
  const config = resoudreConfigSegment('PARC-002')
  const r = computeEligibiliteCampagneGenerique(genInput({ contactSource: 'SITE_WEB_SCAN' }), config)
  t('3. AUTO (RAFAEL confirmé) + contact via site officiel -> ELIGIBLE (sourcesContactAcceptables=ANY pour ce segment)', r.statut === 'ELIGIBLE')
}

// 4. AUTO NAF 85.53Z seul => pas automatiquement CONFIRME
{
  const niveau = resoudreSignalNaf('85.53Z', 'PARC-002')
  t('4. NAF 85.53Z seul -> signal PRINCIPAL (découverte), mais ne vaut PAS preuveMetierNiveau=CONFIRME par lui-même', niveau === 'PRINCIPAL')
  // La preuve métier CONFIRME nécessite RAFAEL, jamais le NAF seul (vérifié structurellement : aucun chemin de code ne dérive preuveMetierNiveau du NAF)
  const fs = require('fs')
  const src = fs.readFileSync(__dirname + '/segment-config.ts', 'utf-8')
  t('4b. resoudreSignalNaf ne retourne jamais "CONFIRME" (seulement PRINCIPAL/SECONDAIRE/AUCUN)', !src.includes("'CONFIRME'"))
}

// 5. AUTO NAF 85.53Y (NAF2025) => reconnu correctement
{
  const niveau = resoudreSignalNaf('85.53Y', 'PARC-002')
  t('5. NAF 2025 85.53Y reconnu comme signal PRINCIPAL, sans hardcode d\'une seule nomenclature', niveau === 'PRINCIPAL')
}

// 6. 85.59B seul => jamais CONFIRME (signal secondaire uniquement)
{
  const niveau = resoudreSignalNaf('85.59B', 'PARC-002')
  t('6. NAF 85.59B -> signal SECONDAIRE uniquement, jamais PRINCIPAL', niveau === 'SECONDAIRE')
}

// 7. Email partagé => non éligible (générique)
{
  const config = resoudreConfigSegment('PARC-002')
  const r = computeEligibiliteCampagneGenerique(genInput({ contactPartageAvecAutreEntreprise: true }), config)
  t('7. Contact partagé (AUTO) -> NON_ELIGIBLE', r.statut === 'NON_ELIGIBLE')
}

// 8. Opposition email => non éligible email (via contactExploitable=false simulant un canal opposé)
{
  const config = resoudreConfigSegment('PARC-002')
  const r = computeEligibiliteCampagneGenerique(genInput({ contactExploitable: false }), config)
  t('8. Contact non exploitable (ex. opposition sur ce canal) -> NON_ELIGIBLE', r.statut === 'NON_ELIGIBLE')
}

// 9. Opposition entreprise => non éligible
{
  const config = resoudreConfigSegment('PARC-002')
  const r = computeEligibiliteCampagneGenerique(genInput({ oppositionActive: true }), config)
  t('9. Opposition entreprise (AUTO) -> NON_ELIGIBLE', r.statut === 'NON_ELIGIBLE')
}

// 10. Aucun email => non éligible campagne email
{
  const config = resoudreConfigSegment('PARC-002')
  const r = computeEligibiliteCampagneGenerique(genInput({ contactExploitable: false, contactSource: null }), config)
  t('10. Aucun contact -> NON_ELIGIBLE', r.statut === 'NON_ELIGIBLE')
}

// 11. Segment inconnu => comportement prudent, aucun crash
{
  let crashed = false
  let r
  try {
    r = computeEligibiliteCampagneGenerique(genInput({ segmentId: 'PARC-999-INCONNU' }), resoudreConfigSegment('PARC-999-INCONNU'))
  } catch { crashed = true }
  t('11. Segment inconnu -> aucun crash', !crashed)
  t('11b. Segment inconnu -> NON_ELIGIBLE (jamais éligible par défaut)', r?.statut === 'NON_ELIGIBLE')
}

// 12. Aucune règle géographique dans la qualification métier — vérification structurelle
{
  const fs = require('fs')
  const engineSrc = fs.readFileSync(__dirname + '/engine.ts', 'utf-8')
  const configSrc = fs.readFileSync(__dirname + '/segment-config.ts', 'utf-8')
  t('12. Aucune mention de département/région dans engine.ts (moteur générique)', !/département|departement|\brégion\b|\b94\b/i.test(engineSrc))
  t('12b. Aucune règle géographique dans segment-config.ts (config par segment)', !/département|departement|région/i.test(configSrc))
}

// Vérification structurelle supplémentaire : le moteur générique ne connaît aucun nom de source en dur
{
  const fs = require('fs')
  const engineSrc = fs.readFileSync(__dirname + '/engine.ts', 'utf-8')
  // La fonction computeEligibiliteCampagneGenerique elle-même ne doit jamais contenir 'ADI_DHUP'/'RAFAEL'
  const genFnMatch = engineSrc.match(/export function computeEligibiliteCampagneGenerique[\s\S]*?\n}/)?.[0] ?? ''
  t('13. computeEligibiliteCampagneGenerique ne contient aucun nom de source en dur (ADI_DHUP/RAFAEL)', !genFnMatch.includes('ADI_DHUP') && !genFnMatch.includes('RAFAEL'))
  t('13b. computeEligibiliteCampagneGenerique ne contient aucun nom de métier en dur', !/diagnostiqueur|auto.école/i.test(genFnMatch))
}

console.log('')
const passed = results.filter((r) => r.pass).length
console.log(`${passed}/${results.length} tests passes`)
if (passed !== results.length) process.exit(1)
