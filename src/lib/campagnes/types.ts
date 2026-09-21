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
