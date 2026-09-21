// ══════════════════════════════════════════════════════════════
// P0.8C.2 — Moteurs PURS, aucun accès DB direct (adaptateur séparé,
// non fourni ici). Deux responsabilités distinctes :
//   1. computeEligibiliteCampagne — READY ≠ ELIGIBLE_CAMPAGNE, calculée
//      à la lecture, jamais depuis qualifications_courantes.preuve_metier.
//   2. controleAjoutMembreLot — contrôles avant d'ajouter un membre à un
//      lot, jamais un blocage silencieux.
// ══════════════════════════════════════════════════════════════

import type {
  EligibiliteCampagneInput, EligibiliteCampagneResult,
  ControleAjoutMembreResult, MembreLotCandidat,
} from './types'

/**
 * computeEligibiliteCampagne — distincte de READY commercial individuel.
 * Pour le pilote diagnostiqueurs : ADI_DHUP direct + email exploitable +
 * email non partagé + aucune opposition + nom non ambigu.
 * Ne consulte JAMAIS qualifications_courantes.preuve_metier (champ
 * historique, inchangé, hors périmètre de ce calcul).
 */
export function computeEligibiliteCampagne(input: EligibiliteCampagneInput): EligibiliteCampagneResult {
  const raisons: string[] = []

  if (input.oppositionActive) {
    return { statut: 'NON_ELIGIBLE', raisons: ['Opposition active — exclusion campagne'] }
  }
  if (!input.emailExploitable) {
    return { statut: 'NON_ELIGIBLE', raisons: ['Aucun email professionnel exploitable'] }
  }
  if (input.emailPartageAvecAutreEntreprise) {
    return { statut: 'NON_ELIGIBLE', raisons: ['Email partagé avec une autre entreprise — risque de doublon destinataire'] }
  }

  const signalMetierFort = input.emailSource === 'ADI_DHUP'
  if (!signalMetierFort) {
    return { statut: 'NON_ELIGIBLE', raisons: ['Aucun signal métier fort disponible (pas de rattachement ADI_DHUP)'] }
  }

  if (input.nomAmbigu) {
    raisons.push(`Signal métier fort (ADI_DHUP) mais raison sociale ambiguë ("${input.raisonSociale}") — à confirmer manuellement`)
    return { statut: 'AMBIGU', raisons }
  }

  raisons.push('Rattachement ADI_DHUP direct, email exploitable et non partagé, aucune opposition')
  return { statut: 'ELIGIBLE', raisons }
}

/**
 * controleAjoutMembreLot — contrôles avant ajout d'un membre à UN lot
 * précis. `companyIdsDejaDansLot` = uniquement les company_id déjà
 * présents dans CE lot (l'unicité est scoping au lot, jamais transversale
 * entre lots — la même entreprise reste autorisée dans deux lots
 * différents, cf. P0.8C.2 §2).
 */
export function controleAjoutMembreLot(
  candidat: MembreLotCandidat,
  companyIdsDejaDansLot: Set<string>
): ControleAjoutMembreResult {
  if (companyIdsDejaDansLot.has(candidat.companyId)) {
    return { statut: 'EXCLU', raisonExclusion: 'Entreprise déjà présente dans ce lot' }
  }
  if (candidat.oppositionActive) {
    return { statut: 'EXCLU', raisonExclusion: 'Opposition active' }
  }
  if (!candidat.emailExploitable) {
    return { statut: 'EXCLU', raisonExclusion: 'Email non exploitable' }
  }
  return { statut: 'VALIDE', raisonExclusion: null }
}

/**
 * pageItems — retourne EXACTEMENT les éléments de la page courante, jamais
 * l'ensemble filtré. Utilisé par "Sélectionner cette page" pour garantir
 * qu'on ne sélectionne jamais plus que ce qui est réellement affiché.
 */
export function pageItems<T>(items: T[], page: number, pageSize: number): T[] {
  return items.slice(page * pageSize, (page + 1) * pageSize)
}
