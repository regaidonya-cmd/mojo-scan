// ══════════════════════════════════════════════════════════════
// MOJO SCAN FLASH — Types TypeScript
// ══════════════════════════════════════════════════════════════

// ── Modes ──────────────────────────────────────────────────────
export type ScanMode = 'site' | 'terrain' | 'call'

// ── Entreprise ─────────────────────────────────────────────────
export interface Company {
  id?: string
  siren?: string
  siret?: string
  name: string
  trade_name?: string
  naf?: string
  naf_label?: string
  address?: string
  postal_code?: string
  city?: string
  employee_band?: EmployeeBand
}

export type EmployeeBand = 'TE' | 'BE' | 'PE' | 'ME' | 'GE'
// TE: 0, BE: 1-9, PE: 10-49, ME: 50-249, GE: 250+

// ── Questions & réponses ───────────────────────────────────────
export type Branch = 'acquisition' | 'conversion' | 'ia'

export interface Question {
  code: string
  text: string
  hint?: string
  type: 'single' | 'multi'
  options: Option[]
  branch?: Branch // undefined = question commune
  condition?: (answers: Record<string, string>) => boolean
}

export interface Option {
  value: string
  label: string
  score: number
  tags?: string[]
}

export interface Answer {
  question_code: string
  value: string
  score: number
}

// ── Scores ──────────────────────────────────────────────────────
export interface BusinessScore {
  global: number      // /100
  acquisition: number
  visibilite: number
  conversion: number
  fidelisation: number
  organisation: number
  ia: number
}

export interface LeadScore {
  total: number       // /100
  level: 'cold' | 'qualified' | 'hot' | 'priority'
  breakdown: {
    need: number       // /25
    urgency: number    // /20
    decision: number   // /15
    fit: number        // /15
    accomp: number     // /10
    funding: number    // /10
    budget: number     // /5
  }
}

// ── Priorités ──────────────────────────────────────────────────
export interface Priority {
  rank: 1 | 2 | 3
  label: string
  detail: string
  icon: string
}

// ── Financement ────────────────────────────────────────────────
// ── OPCO — rattachement de l'entreprise ──────────────────────
export interface OpcoResult {
  opco_name: string
  opco_status: 'identified' | 'probable' | 'to_confirm' | 'unknown'
  opco_confidence: 'high' | 'medium' | 'low'
  opco_source: 'siret_api' | 'naf_orientation' | 'unknown'
  opco_note: string
}

// ── Financeur — dispositif du bénéficiaire ────────────────────
export interface FundingBody {
  funding_body: string
  funding_status: 'identified' | 'probable' | 'to_confirm' | 'unknown'
  funding_confidence: 'high' | 'medium' | 'low'
  funding_reason: string
  funding_note: string
}

// ── Résultat financement complet ──────────────────────────────
export interface FundingResult {
  // Champs legacy (conservés pour compatibilité route submit)
  funder: string
  coverage_label: string
  // Nouveaux champs structurés
  opco?: OpcoResult
  funding_body?: FundingBody
  // Texte affiché au prospect — jamais de % absolu
  prospect_text: string
  // Version NAF utilisée
  naf_version: 'NAF_REV2_2008'
}

// ── Catalogue ──────────────────────────────────────────────────
export interface CatalogItem {
  code: string
  title: string
  description?: string
  duration_h: number
  price_ht: number
  tags: string[]
  audience: string[]
  active: boolean
}

export interface Recommendation {
  item: CatalogItem
  rank: 1 | 2
  reason: string
}

// ── État global du diagnostic ──────────────────────────────────
export interface DiagnosticState {
  // Meta
  id?: string
  mode: ScanMode
  step: DiagnosticStep
  // Entreprise
  company?: Company
  // Profil
  role?: string
  beneficiary?: string
  // Réponses
  answers: Record<string, string>
  branch?: Branch
  // Résultats
  businessScore?: BusinessScore
  leadScore?: LeadScore
  priorities?: Priority[]
  recommendations?: Recommendation[]
  funding?: FundingResult[]
  // Capture
  contact?: { firstname: string; lastname?: string; email: string; phone?: string; statut_juridique?: string }
  consentDiag: boolean
  consentMarketing: boolean
  // Report
  reportToken?: string
  parcoursMatch?: any
  calendlyUrl?: string  // ParcoursMatch sérialisé depuis l'API
}

export type DiagnosticStep =
  | 'company'       // écran 1 : recherche entreprise
  | 'profile'       // écran 2 : profil
  | 'objective'     // écran 3 : objectif
  | 'questions'     // écran 4 : questions dynamiques
  | 'project'       // écran 5 : urgence / budget
  | 'teaser'        // écran 6 : aperçu résultat
  | 'capture'       // écran 7 : email
  | 'report'        // écran 8 : rapport complet

// ── API ────────────────────────────────────────────────────────
export interface ApiCompanySearchResult {
  siren: string
  siret?: string
  name: string
  trade_name?: string
  naf?: string
  naf_label?: string
  address?: string
  postal_code?: string
  city?: string
  employee_band?: EmployeeBand
}

export interface ApiDiagnosticPayload {
  mode: ScanMode
  company?: Partial<Company>
  answers: Answer[]
  contact?: { firstname: string; email: string; phone?: string }
  consentDiag: boolean
  consentMarketing: boolean
}

export interface ApiDiagnosticResult {
  diagnosticId: string
  reportToken: string
  reportUrl: string
  businessScore: BusinessScore
  leadScore: LeadScore
  priorities: Priority[]
  recommendations: Recommendation[]
  funding: FundingResult[]
}
