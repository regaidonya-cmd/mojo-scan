import { classifyFaitText } from './business-model'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) {
  results.push({ name, pass })
  console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name)
}

// Textes copiés verbatim depuis observations_entreprise (attribut='fait_specifique'), LIVE
const cases: [string, 'UTILISABLE_DANS_ACCROCHE' | 'CONTEXTE_INTERNE' | 'A_VERIFIER'][] = [
  ['Dirigeant Harry ALIMI, creation 2005 (20 ans anciennete)', 'CONTEXTE_INTERNE'], // ELPIS
  ['Perimetre geographique annonce 93/95/60/77, dirigeant Xavier BADETS depuis 2007 (18 ans anciennete)', 'CONTEXTE_INTERNE'], // ADBAT93
  ['Activite elargie: habitat, immobilier, amenagement, renovation, installation, depannage (au-dela du seul diagnostic)', 'UTILISABLE_DANS_ACCROCHE'], // EXPERURBA
  ['Couverture Paris et Ile-de-France, avis client positif observe (amabilite/serieux)', 'CONTEXTE_INTERNE'], // DIAGS EXPERTS (pas de note chiffree)
  ['Active depuis 2013 (12 ans), fonds acquis en 2014 (succession SARL DIAG ET ASSOCIES), dirigeant Francois Principaud', 'CONTEXTE_INTERNE'], // DIAGIMMO ET ASSOCIES
  ['Reservation en ligne, couverture Paris et Ile-de-France, plusieurs annees activite', 'UTILISABLE_DANS_ACCROCHE'], // DIAG IMMO 13
  ['Dessert 4 departements voisins (75/77/92/91), note 5/5 sur 6 avis recents, interlocuteur nomme M. LAKS, assure Allianz, certifie ABCIDIA', 'UTILISABLE_DANS_ACCROCHE'], // CENTRAL DIAG
  ['Dirigeant Gregory CNUDDE, creation 2019 (6 ans anciennete)', 'CONTEXTE_INTERNE'], // DIAGPROEVO
  ['Dirigeant Gregory Rene CNUDDE nomme, creation 2019', 'CONTEXTE_INTERNE'], // DIAGPROEVO
  ['aucun (description en ligne generee automatiquement, non fiable)', 'A_VERIFIER'], // DIAGALIS
  ['Rattache au reseau Diagadom, specialisation Val-de-Marne, creation 2022, dirigeant Laurent SITGES', 'UTILISABLE_DANS_ACCROCHE'], // DIAG HOME SERVICES
  ['3 dirigeants nommes (DA SILVA ALVES president), couverture Val-de-Marne', 'CONTEXTE_INTERNE'], // DIAGACTION
  ['Dirigeant Axel MABIRE egalement associe de AXM INVEST (societe liee); activite reelle confirmee par rapport de diagnostic date', 'CONTEXTE_INTERNE'], // AXM DIAG (fait secondaire)
  ['Creation d une societe soeur AXM ENERGIE en mars 2024 (meme dirigeant, meme adresse) - diversification recente', 'UTILISABLE_DANS_ACCROCHE'], // AXM DIAG (fait principal)
  [
    'Marche public notifie avec Paris Habitat, 12.3M EUR, duree 4 ans, notifie 06/10/2025; ouverture 3eme agence reseau en Val-de-Marne (coherence geographique/temporelle avec la creation de lentite en 07/2023); changement de gouvernance le 09/10/2025 (2L INVEST/SP MERCURY)',
    'UTILISABLE_DANS_ACCROCHE',
  ], // DIAGOBAH — marché public prime sur la mention de gouvernance dans le même texte
  ['Changement complet de direction et actionnariat le 09/10/2025 (SACCOMANDI remplaces par 2L INVEST et SP MERCURY) - evenement recent probable acquisition', 'CONTEXTE_INTERNE'], // DIAGOBAH (2e fait)
]

for (const [texte, attendu] of cases) {
  t(`classifyFaitText("${texte.slice(0, 40)}...") -> ${attendu}`, classifyFaitText(texte) === attendu)
}

// ── Tests adversariaux P0.6C-FIX.1A ──────────────────────────────
const adversarial: [string, 'UTILISABLE_DANS_ACCROCHE' | 'CONTEXTE_INTERNE' | 'A_VERIFIER'][] = [
  ['Le changement de direction a été notifié le 10/10/2025', 'CONTEXTE_INTERNE'],
  ["Changement d'actionnariat, cession de 60% du capital pour 3M€", 'CONTEXTE_INTERNE'],
  ['Changement de gouvernance, ouverture d\'une nouvelle agence de communication non confirmée', 'CONTEXTE_INTERNE'],
  ['Marché public notifié avec un client public, 5M€, durée 3 ans', 'UTILISABLE_DANS_ACCROCHE'],
  ["Ouverture réelle d'une nouvelle agence à Lyon", 'UTILISABLE_DANS_ACCROCHE'],
  ['Diversification réelle vers une nouvelle activité de conseil', 'UTILISABLE_DANS_ACCROCHE'],
  ['Réservation en ligne disponible sur le site', 'UTILISABLE_DANS_ACCROCHE'],
  ['Un fait totalement inconnu et non catégorisable', 'CONTEXTE_INTERNE'],
  ['Information contradictoire sur le statut actif/inactif de la société', 'A_VERIFIER'],
]
for (const [texte, attendu] of adversarial) {
  t(`[adversarial] "${texte.slice(0, 50)}..." -> ${attendu}`, classifyFaitText(texte) === attendu)
}

console.log('')
const passed = results.filter((r) => r.pass).length
console.log(`${passed}/${results.length} tests passes`)
if (passed !== results.length) process.exit(1)
