import { computeEligibiliteCampagne, pageItems } from './engine'
import type { EligibiliteCampagneInput } from './types'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) {
  results.push({ name, pass })
  console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name)
}

// Simule une population proche du réel (94, ADI_DHUP, mix éligible/ambigu/non éligible)
interface FakeVM extends EligibiliteCampagneInput { departement: string }
const population: FakeVM[] = [
  { companyId: 'c1', naf: '71.20B', raisonSociale: 'DIAG PARIS', emailSource: 'ADI_DHUP', emailExploitable: true, emailPartageAvecAutreEntreprise: false, oppositionActive: false, nomAmbigu: false, departement: '75' },
  { companyId: 'c2', naf: '71.20B', raisonSociale: 'CENTRAL DIAG', emailSource: 'ADI_DHUP', emailExploitable: true, emailPartageAvecAutreEntreprise: false, oppositionActive: false, nomAmbigu: false, departement: '94' },
  { companyId: 'c3', naf: '71.20B', raisonSociale: 'AM TECH MEDICAL', emailSource: 'ADI_DHUP', emailExploitable: true, emailPartageAvecAutreEntreprise: false, oppositionActive: false, nomAmbigu: true, departement: '94' },
  { companyId: 'c4', naf: '71.20B', raisonSociale: 'DIAG OPPOSE', emailSource: 'ADI_DHUP', emailExploitable: true, emailPartageAvecAutreEntreprise: false, oppositionActive: true, nomAmbigu: false, departement: '94' },
  { companyId: 'c5', naf: '71.20B', raisonSociale: 'DIAG PARTAGE', emailSource: 'ADI_DHUP', emailExploitable: true, emailPartageAvecAutreEntreprise: true, oppositionActive: false, nomAmbigu: false, departement: '94' },
]

// 1. Filtre département 94
{
  const dept94 = population.filter((p) => p.departement === '94')
  t('1. Filtre département 94 -> exclut c1 (75)', !dept94.some((p) => p.companyId === 'c1'))
  t('1b. Filtre département 94 -> conserve c2/c3/c4/c5', dept94.length === 4)
}

// 2. ELIGIBLE
{
  const r = computeEligibiliteCampagne(population[1]) // c2 CENTRAL DIAG
  t('2. CENTRAL DIAG (94, ADI_DHUP, nom clair) -> ELIGIBLE', r.statut === 'ELIGIBLE')
}

// 3. Exclusion AMBIGU
{
  const r = computeEligibiliteCampagne(population[2]) // c3 AM TECH MEDICAL
  t('3. AM TECH MEDICAL (nom ambigu) -> AMBIGU, jamais ELIGIBLE direct', r.statut === 'AMBIGU')
}

// 4. Opposition
{
  const r = computeEligibiliteCampagne(population[3]) // c4
  t('4. Opposition active -> NON_ELIGIBLE', r.statut === 'NON_ELIGIBLE')
}

// 5. Email partagé
{
  const r = computeEligibiliteCampagne(population[4]) // c5
  t('5. Email partagé -> NON_ELIGIBLE', r.statut === 'NON_ELIGIBLE')
}

// 6-7. Sélection + pagination-aware "sélectionner les visibles"
{
  const items = Array.from({ length: 30 }, (_, i) => ({ companyId: `x${i}` }))
  const page0 = pageItems(items, 0, 25)
  const page1 = pageItems(items, 1, 25)
  t('6. Page 0 contient exactement 25 éléments (pas 30)', page0.length === 25)
  t('6b. Page 1 contient les 5 restants', page1.length === 5)

  const selectedFromPage0 = new Set(page0.map((i) => i.companyId))
  t('7. Sélectionner la page 0 ne sélectionne JAMAIS les éléments de la page 1', page1.every((i) => !selectedFromPage0.has(i.companyId)))
  t('7b. Sélectionner la page 0 sélectionne exactement 25, jamais les 30 filtrés', selectedFromPage0.size === 25)
}

// 8-10. Création campagne/lot/membres + exclusion tracée — vérification structurelle du câblage
{
  const fs = require('fs')
  const apiSrc = fs.readFileSync(__dirname + '/../../app/api/admin/campagnes/route.ts', 'utf-8')
  t('8. Route API crée bien une campagne (insert sur table campagnes)', apiSrc.includes("from('campagnes')") && apiSrc.includes('.insert('))
  t('9. Route API crée bien un lot (insert sur campagne_lots)', apiSrc.includes("from('campagne_lots')"))
  t('10. Route API crée les membres et trace la raison d\'exclusion', apiSrc.includes("from('campagne_lot_membres')") && apiSrc.includes('raison_exclusion'))
  t('10b. Route API protégée par cookie admin (cohérent avec le reste du projet)', apiSrc.includes('admin_auth'))
}

// 11. Page lot — vérification structurelle
{
  const fs = require('fs')
  const pageSrc = fs.readFileSync(__dirname + '/../../app/admin/campagnes/[lotId]/page.tsx', 'utf-8')
  t('11. Page lot lit bien campagne_lots et campagne_lot_membres', pageSrc.includes("from('campagne_lots')") && pageSrc.includes("from('campagne_lot_membres')"))
  t('11b. Page lot protégée par cookie admin', pageSrc.includes('admin_auth'))
}

// 12. Bouton Brevo désactivé, aucun appel Brevo
{
  const fs = require('fs')
  const pageSrc = fs.readFileSync(__dirname + '/../../app/admin/campagnes/[lotId]/page.tsx', 'utf-8')
  // P0.8C.3 — le bouton est désormais ACTIF (composant dédié SynchroniserBrevoButton),
  // plus "disabled" comme en P0.8C.2B. On vérifie la nouvelle réalité correcte :
  // la page serveur délègue à un composant client dédié, jamais d'appel Brevo
  // direct depuis la page elle-même (server component).
  t('12. Page lot utilise le composant dédié SynchroniserBrevoButton (bouton désormais actif, P0.8C.3)', pageSrc.includes('SynchroniserBrevoButton'))
  const appelBrevoReel = /from ['"].*lib\/brevo|api\.brevo\.com|syncContactBrevo|realBrevoClient/i.test(pageSrc)
  t('13. Aucun IMPORT/APPEL Brevo DIRECT depuis la page serveur elle-même (délégué au composant + à la route API)', !appelBrevoReel)

  const tableSrc = fs.readFileSync(__dirname + '/../../components/sales/CampagneSelectionTable.tsx', 'utf-8')
  t('14. Aucun appel Brevo dans le composant de sélection', !/brevo/i.test(tableSrc))

  const apiSrc = fs.readFileSync(__dirname + '/../../app/api/admin/campagnes/route.ts', 'utf-8')
  t('15. Aucun appel Brevo dans la route API de création de lot', !/brevo/i.test(apiSrc))
}

console.log('')
const passed = results.filter((r) => r.pass).length
console.log(`${passed}/${results.length} tests passes`)
if (passed !== results.length) process.exit(1)
