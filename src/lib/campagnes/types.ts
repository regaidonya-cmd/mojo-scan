// ══════════════════════════════════════════════════════════════
// P0.8C.2 — Types purs, aucune duplication de companies/prospects_sales.
// ══════════════════════════════════════════════════════════════

export interface EligibiliteCampagneInput {
  companyId: string
  naf: string | null
  raisonSociale: string
  /** Source de l'email principal — 'ADI_DHUP' est le signal fort pour le
   * pilote diagnostiqueurs, jamais qualifications_courantes.preuve_metier
   * (champ historique, inchangé, non consulté ici). */
  emailSource: string | null
  emailExploitable: boolean
  emailPartageAvecAutreEntreprise: boolean
  oppositionActive: boolean
  /** Termes détectés dans la raison sociale évoquant une activité hors
   * cible (médical/industriel/etc.) — cf. audit campagne 94. */
  nomAmbigu: boolean
}

export type EligibiliteCampagneStatut = 'ELIGIBLE' | 'AMBIGU' | 'NON_ELIGIBLE'

export interface EligibiliteCampagneResult {
  statut: EligibiliteCampagneStatut
  raisons: string[]
}

export type StatutMembreLot = 'VALIDE' | 'EXCLU'

export interface ControleAjoutMembreResult {
  statut: StatutMembreLot
  raisonExclusion: string | null
}

export interface MembreLotCandidat {
  companyId: string
  emailExploitable: boolean
  oppositionActive: boolean
}

// ══════════════════════════════════════════════════════════════
// AUTO.2C LOT 1 — Modèle générique multi-secteur. Le moteur
// (computeEligibiliteCampagneGenerique) ne connaît AUCUN nom de source
// ('ADI_DHUP', 'RAFAEL', etc.) ni AUCUN métier en dur — ces valeurs
// vivent uniquement dans SegmentEligibiliteConfig (segment-config.ts).
// ══════════════════════════════════════════════════════════════

export type PreuveMetierNiveau = 'CONFIRME' | 'PROBABLE' | 'AMBIGU' | 'HORS_CIBLE'

/** Configuration propre à UN segment — jamais lue par le moteur générique
 * autrement que via ses champs, jamais par nom de segment codé en dur
 * dans engine.ts. */
export interface SegmentEligibiliteConfig {
  segmentId: string
  /** Sources acceptées comme PREUVE MÉTIER pour ce segment (ex. ['ADI_DHUP'] pour diag, ['RAFAEL'] pour auto-école). */
  sourcesPreuveMetierAcceptables: string[]
  /** Sources acceptées comme CONTACT exploitable — 'ANY' si toute source suffisamment fiable convient (ex. site officiel). */
  sourcesContactAcceptables: string[] | 'ANY'
}

/** Entrée du moteur générique — chaque champ est déjà résolu EN AMONT
 * (par segment-config.ts + la couche d'appel), jamais par le moteur
 * lui-même. */
export interface EligibiliteCampagneInputGenerique {
  companyId: string
  raisonSociale: string
  segmentId: string | null
  preuveMetierNiveau: PreuveMetierNiveau
  contactSource: string | null
  contactExploitable: boolean
  contactPartageAvecAutreEntreprise: boolean
  oppositionActive: boolean
  nomAmbigu: boolean
}
