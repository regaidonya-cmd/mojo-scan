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
  EligibiliteCampagneInputGenerique, SegmentEligibiliteConfig,
} from './types'
import { resoudreConfigSegment } from './segment-config'

/**
 * computeEligibiliteCampagneGenerique — AUTO.2C LOT 1. Cœur du moteur,
 * NE CONNAÎT AUCUN nom de source ('ADI_DHUP', 'RAFAEL', etc.) ni AUCUN
 * métier en dur. Toute la logique propre à un segment vit dans `config`
 * (résolue en amont via segment-config.ts). Un segment inconnu/non
 * configuré retombe prudemment sur NON_ELIGIBLE — jamais un crash, jamais
 * une éligibilité par défaut.
 */
export function computeEligibiliteCampagneGenerique(
  input: EligibiliteCampagneInputGenerique,
  config: SegmentEligibiliteConfig | null
): EligibiliteCampagneResult {
  const raisons: string[] = []

  if (input.oppositionActive) {
    return { statut: 'NON_ELIGIBLE', raisons: ['Opposition active — exclusion campagne'] }
  }
  if (!input.contactExploitable) {
    return { statut: 'NON_ELIGIBLE', raisons: ['Aucun contact professionnel exploitable'] }
  }
  if (input.contactPartageAvecAutreEntreprise) {
    return { statut: 'NON_ELIGIBLE', raisons: ['Contact partagé avec une autre entreprise — risque de doublon destinataire'] }
  }

  if (!config) {
    return { statut: 'NON_ELIGIBLE', raisons: ["Segment inconnu ou non configuré — comportement prudent, aucune règle d'éligibilité disponible"] }
  }

  if (input.preuveMetierNiveau !== 'CONFIRME') {
    return { statut: 'NON_ELIGIBLE', raisons: [`Preuve métier insuffisante pour ce segment (niveau : ${input.preuveMetierNiveau})`] }
  }

  const sourceContactAcceptable = config.sourcesContactAcceptables === 'ANY'
    || (input.contactSource != null && config.sourcesContactAcceptables.includes(input.contactSource))
  if (!sourceContactAcceptable) {
    return { statut: 'NON_ELIGIBLE', raisons: [`Provenance du contact non acceptée pour ce segment (source : ${input.contactSource ?? 'inconnue'})`] }
  }

  if (input.nomAmbigu) {
    raisons.push(`Preuve métier confirmée mais raison sociale ambiguë ("${input.raisonSociale}") — à confirmer manuellement`)
    return { statut: 'AMBIGU', raisons }
  }

  raisons.push('Preuve métier confirmée, contact exploitable et non partagé, provenance acceptable, aucune opposition')
  return { statut: 'ELIGIBLE', raisons }
}

/**
 * computeEligibiliteCampagne — API HISTORIQUE (pilote diagnostiqueurs),
 * CONSERVÉE À L'IDENTIQUE pour compatibilité ascendante avec
 * fetch-reservoir.ts (garantit zéro régression DIAG94, LOT 2). Délègue
 * intégralement au moteur générique ci-dessus via la config du segment
 * PARC-001 — mathématiquement équivalente à l'ancien comportement.
 */
export function computeEligibiliteCampagne(input: EligibiliteCampagneInput): EligibiliteCampagneResult {
  const config = resoudreConfigSegment('PARC-001') // diagnostiqueurs — seul segment câblé sur cette API historique
  const preuveMetierNiveau = input.emailSource != null && config?.sourcesPreuveMetierAcceptables.includes(input.emailSource)
    ? 'CONFIRME' as const
    : 'HORS_CIBLE' as const

  return computeEligibiliteCampagneGenerique({
    companyId: input.companyId,
    raisonSociale: input.raisonSociale,
    segmentId: 'PARC-001',
    preuveMetierNiveau,
    contactSource: input.emailSource,
    contactExploitable: input.emailExploitable,
    contactPartageAvecAutreEntreprise: input.emailPartageAvecAutreEntreprise,
    oppositionActive: input.oppositionActive,
    nomAmbigu: input.nomAmbigu,
  }, config)
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

// P0.8C FIX.3 — Décision pure : quels membres sont réellement
// synchronisables au moment du sync, en réutilisant l'éligibilité déjà
// recalculée (jamais des valeurs hardcodées). Extraite pour être testable
// indépendamment de tout appel réseau externe.
export interface MembreEligibiliteRecalculee {
  companyId: string
  eligibiliteCampagne: 'ELIGIBLE' | 'AMBIGU' | 'NON_ELIGIBLE'
}

export function determinerMembresSynchronisables<T extends MembreEligibiliteRecalculee>(
  membres: T[]
): { synchronisables: T[]; nonSynchronisables: T[] } {
  const synchronisables = membres.filter((m) => m.eligibiliteCampagne === 'ELIGIBLE')
  const nonSynchronisables = membres.filter((m) => m.eligibiliteCampagne !== 'ELIGIBLE')
  return { synchronisables, nonSynchronisables }
}
