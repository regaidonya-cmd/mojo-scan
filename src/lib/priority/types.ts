// ══════════════════════════════════════════════════════════════
// P0.5B.1 — Types du moteur de priorité commerciale (LECTURE SEULE)
// Aucun accès DB dans ce fichier. Tout est fourni en entrée.
// ══════════════════════════════════════════════════════════════

export type Potentiel = 'FORT' | 'MOYEN' | 'FAIBLE'
export type Temperature = 'FROID' | 'TIEDE' | 'CHAUD'
export type Priorite = 'STOP' | 'P0' | 'P1' | 'P2' | 'P3' | 'P4'
export type PipelineStage = 'A_CONTACTER' | 'EN_DISCUSSION' | 'RDV' | 'PROPOSITION' | 'GAGNE' | 'PERDU'

export type NBAType =
  | 'CALL'
  | 'EMAIL'
  | 'QUALIFY'
  | 'PREPARE_RDV'
  | 'FOLLOW_UP'
  | 'SEND_PROPOSAL'
  | 'WAIT'
  | 'NURTURE'
  | 'NO_ACTION'
  | 'NO_ACTION_TEMPORAIRE'
  | 'ENRICH'

export type ContactMethodType = 'telephone' | 'email'

/**
 * Un moyen de contact déjà résolu par la couche de données (P0.4 —
 * allowedChannels()/canContact() ont déjà été appliqués en amont).
 * `allowed` reflète le résultat RÉEL des fonctions P0.4, jamais
 * recalculé ici.
 */
export interface ContactMethod {
  contactMethodId: string
  type: ContactMethodType
  value: string
  personneId?: string
  personneNom?: string
  personnePrenom?: string
  nominatif: boolean
  allowed: boolean // résultat déjà calculé par p04_allowed_channels() côté données
}

/**
 * Un événement commercial déjà normalisé (source, date, nature).
 * La couche de données transforme les lignes réelles (activites,
 * diagnostics, ou événements de simulation) vers cette forme unique.
 */
export type EventKind =
  | 'SCAN_COMPLETED_NO_NEED'
  | 'SCAN_COMPLETED_WITH_NEED'
  | 'EXPLICIT_CONTACT_REQUEST'
  | 'POSITIVE_REPLY'
  | 'NEGATIVE_REPLY'
  | 'CALLBACK_REQUESTED'
  | 'RDV_SCHEDULED'
  | 'RDV_COMPLETED'
  | 'PROPOSAL_SENT' // action MOJO — ne modifie jamais la température seule
  | 'PROPOSAL_VIEWED_TRACKING'
  | 'QUOTE_REQUESTED'
  | 'NO_REPLY_AFTER_DELAY'
  | 'OPPOSITION_GLOBAL'
  | 'LOST_DEFINITIVE'
  | 'WON'

export interface CommercialEvent {
  kind: EventKind
  occurredAt: string // ISO date
  dueAt?: string // pour RDV/callback : échéance associée
  originatedByProspect: boolean // false pour les actions MOJO (ex: PROPOSAL_SENT)
  signalChannel?: ContactMethodType // canal utilisé par le prospect pour ce signal, si connu
  detail?: string
}

export interface ProspectInput {
  companyId: string
  companyName: string

  // Structurel — jamais influencé par la qualité des données
  fitCible: 'CIBLE' | 'HORS_CIBLE' | 'INCONNU'
  preuveMetier: 'CONFIRME' | 'PROBABLE' | 'A_VERIFIER' | null
  proximiteLocale: boolean // boost opérationnel, jamais un signal d'intention

  pipelineStage: PipelineStage

  // Contacts déjà résolus (oppositions déjà appliquées en amont, cf. ContactMethod.allowed)
  contactMethods: ContactMethod[]

  // Angle disponible — fournit la matière du "pourquoi" de READINESS
  hasReliableAngle: boolean // fait fiable / observation fiable / besoin déclaré
  angleSource?: string // ex: "site FOUND crawlé", "besoin déclaré Scan", "NOT_FOUND mais contact clair"

  // Oppositions au niveau entreprise entière (résultat déjà calculé, cf. p04_can_arm_commercially)
  globalOppositionActive: boolean

  // Pipeline terminal
  isLostDefinitive: boolean
  isWon: boolean

  // Événements commerciaux, triés du plus ancien au plus récent
  events: CommercialEvent[]

  now: string // ISO date — injecté, jamais Date.now() interne (déterminisme/testabilité)
}

export interface ScoreLine {
  label: string
  delta: number
}

export interface NextBestAction {
  type: NBAType
  dueAt?: string
  reason: string
}

export interface SelectedContact {
  personneId?: string
  contactMethodId?: string
  type?: ContactMethodType
  value?: string
  nominatif?: boolean
  reason: string
}

export interface CommercialPriorityResult {
  companyId: string
  companyName: string

  potentiel: Potentiel
  temperature: Temperature
  contactable: boolean // je peux techniquement joindre quelqu'un
  readiness: boolean // + angle personnalisé crédible disponible
  priorite: Priorite
  secondaryScore: number
  scoreBreakdown: ScoreLine[]

  nextBestAction: NextBestAction
  selectedContact: SelectedContact | null

  whyNow: string[]
  warnings: string[]
}
