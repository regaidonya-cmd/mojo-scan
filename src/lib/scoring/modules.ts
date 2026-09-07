// ══════════════════════════════════════════════════════════════
// MOJO LEAD ENGINE — Moteur de modules
// Réponses → Modules détectés → Scoring des 30 programmes
// ══════════════════════════════════════════════════════════════

import { PROGRAMMES, MAPPING_PROG_MOD, PARCOURS, APE_MAPPING } from './catalog'
import type { Programme, Parcours } from './catalog'

// ── Configuration pondération (modifiable sans toucher à l'algo)
export const SCORING_CONFIG = {
  // Poids du bonus parcours métier sur le score des formations
  BONUS_PARCOURS_POIDS: 8,        // points ajoutés par formation prioritaire du parcours
  // Seuil confiance APE pour match fort vs à confirmer
  SEUIL_MATCH_FORT: 'Forte' as const,
  // Nombre de recommandations à retourner
  TOP_N_PROGRAMMES: 3,
}

// ── Types ────────────────────────────────────────────────────────
export interface ModuleScore {
  id_module: string
  score: number
  source: string  // "Q-P3-clients", "Q-I3-daily", etc.
}

export interface ProgrammeScore {
  programme: Programme
  score: number
  modules_contribution: { id_module: string; contribution: number }[]
  bonus_parcours: number
  log: string  // traçabilité : "PROG-013 car MOD-FID-01 +25, MOD-WA-01 +9, bonus PARC-004 +8"
}

export interface ParcoursMatch {
  parcours: Parcours
  confiance: 'MATCH_FORT' | 'MATCH_A_CONFIRMER' | 'AUCUN_PARCOURS_METIER'
  raison: string
}

// ── Mapping Questions → Modules ──────────────────────────────────
// Construit à partir des mots-clés des réponses et de la logique métier
// Structure : { [questionCode_valeurReponse]: { [moduleId]: poids } }
const QUESTION_MODULE_MAP: Record<string, Record<string, number>> = {

  // P3 — Objectif principal
  'P3_clients':        { 'MOD-ACQ-01':5, 'MOD-GBP-01':4, 'MOD-SEO-02':4, 'MOD-SOC-01':3 },
  'P3_google':         { 'MOD-SEO-02':5, 'MOD-GBP-01':5, 'MOD-SEO-01':4, 'MOD-REP-01':3 },
  'P3_reseaux':        { 'MOD-SOC-01':5, 'MOD-CONT-01':4, 'MOD-SOC-02':4, 'MOD-CONT-03':3 },
  'P3_fidelisation':   { 'MOD-FID-01':5, 'MOD-CRM-01':4, 'MOD-EMAIL-01':3, 'MOD-WA-01':3 },
  'P3_site':           { 'MOD-WEB-01':5, 'MOD-WEB-04':4, 'MOD-WEB-03':3, 'MOD-UX-03':2 },
  'P3_temps':          { 'MOD-IA-05':5, 'MOD-AUTO-01':5, 'MOD-ORG-02':4, 'MOD-PROC-02':3 },
  'P3_automatisation': { 'MOD-AUTO-01':5, 'MOD-AUTO-05':5, 'MOD-IA-02':4, 'MOD-PROC-01':3 },
  'P3_ia':             { 'MOD-IA-01':5, 'MOD-IA-02':5, 'MOD-IA-03':4, 'MOD-IA-04':4 },
  'P3_organisation':   { 'MOD-ORG-02':5, 'MOD-PROC-01':4, 'MOD-ORG-01':4, 'MOD-ORG-06':3 },
  'P3_competences':    { 'MOD-IA-01':4, 'MOD-SEO-02':3, 'MOD-SOC-01':3, 'MOD-CRM-01':3 },

  // A1 — Origine des clients (acquisition)
  'A1_bouche':   { 'MOD-GBP-01':5, 'MOD-SEO-02':5, 'MOD-REP-01':4, 'MOD-SOC-01':3 },
  'A1_google':   { 'MOD-SEO-01':4, 'MOD-SEO-02':4, 'MOD-GBP-01':3 },
  'A1_reseaux':  { 'MOD-SOC-01':4, 'MOD-CONT-01':3 },
  'A1_mixed':    { 'MOD-ACQ-01':3, 'MOD-DATA-07':3 },
  'A1_physique': { 'MOD-GBP-01':4, 'MOD-SEO-02':4, 'MOD-ACQ-01':3 },

  // A2 — Google Business Profile
  'A2_optimized':  { 'MOD-REP-01':3, 'MOD-GBP-02':2 },
  'A2_basic':      { 'MOD-GBP-01':5, 'MOD-REP-01':4, 'MOD-GBP-02':3 },
  'A2_no':         { 'MOD-GBP-01':5, 'MOD-SEO-02':5, 'MOD-GBP-02':4 },
  'A2_dontknow':   { 'MOD-GBP-01':5, 'MOD-SEO-02':4 },

  // A3 — Avis Google
  'A3_more50':  { 'MOD-REP-01':1 },
  'A3_20to50':  { 'MOD-REP-01':3, 'MOD-GBP-01':2 },
  'A3_lt20':    { 'MOD-REP-01':5, 'MOD-GBP-01':3 },
  'A3_none':    { 'MOD-REP-01':5, 'MOD-GBP-01':4, 'MOD-SEO-02':3 },

  // A4 — Réseaux sociaux
  'A4_active':    { 'MOD-CONT-03':3, 'MOD-SOC-01':2 },
  'A4_sometimes': { 'MOD-SOC-01':4, 'MOD-CONT-01':4, 'MOD-CONT-03':3 },
  'A4_rarely':    { 'MOD-SOC-01':5, 'MOD-CONT-01':5, 'MOD-CONT-03':4, 'MOD-SOC-02':3 },

  // A5 — Site web
  'A5_optimized': { 'MOD-WEB-04':3, 'MOD-DATA-07':2 },
  'A5_basic':     { 'MOD-WEB-01':4, 'MOD-WEB-04':4, 'MOD-WEB-06':3, 'MOD-UX-03':3 },
  'A5_no':        { 'MOD-WEB-01':5, 'MOD-WEB-03':4, 'MOD-SEO-01':4 },

  // C1 — Suivi des demandes
  'C1_crm':     { 'MOD-CRM-02':3, 'MOD-DATA-03':2 },
  'C1_sheets':  { 'MOD-CRM-01':4, 'MOD-CRM-02':4, 'MOD-CRM-05':3 },
  'C1_memory':  { 'MOD-CRM-01':5, 'MOD-CRM-02':5, 'MOD-CRM-03':4, 'MOD-CRM-05':4 },
  'C1_nothing': { 'MOD-CRM-01':5, 'MOD-CRM-03':5, 'MOD-CRM-05':4, 'MOD-AUTO-01':3 },

  // C2 — Relances
  'C2_auto':   { 'MOD-AUTO-05':2, 'MOD-CRM-05':2 },
  'C2_manual': { 'MOD-AUTO-01':4, 'MOD-CRM-05':3 },
  'C2_rarely': { 'MOD-CRM-05':5, 'MOD-AUTO-01':4, 'MOD-AUTO-05':4 },
  'C2_never':  { 'MOD-CRM-05':5, 'MOD-AUTO-01':5, 'MOD-AUTO-05':5 },

  // C3 — Base clients
  'C3_crm':    { 'MOD-CRM-04':3, 'MOD-FID-01':2 },
  'C3_sheets': { 'MOD-CRM-01':3, 'MOD-CRM-04':3 },
  'C3_basic':  { 'MOD-CRM-01':4, 'MOD-CRM-04':4, 'MOD-FID-01':3 },
  'C3_no':     { 'MOD-CRM-01':5, 'MOD-CRM-03':5, 'MOD-FID-01':4 },

  // C4 — Fidélisation
  'C4_regular':   { 'MOD-FID-01':2, 'MOD-EMAIL-01':2 },
  'C4_sometimes': { 'MOD-FID-01':4, 'MOD-EMAIL-01':3, 'MOD-WA-01':3 },
  'C4_no':        { 'MOD-FID-01':5, 'MOD-FID-02':4, 'MOD-EMAIL-01':4, 'MOD-WA-01':4 },

  // I1 — Outils digitaux
  'I1_many':  { 'MOD-IA-02':3, 'MOD-AUTO-01':2 },
  'I1_some':  { 'MOD-ORG-02':3, 'MOD-AUTO-01':3, 'MOD-IA-02':3 },
  'I1_few':   { 'MOD-ORG-01':5, 'MOD-ORG-02':4, 'MOD-IA-01':4, 'MOD-AUTO-01':3 },
  'I1_none':  { 'MOD-ORG-01':5, 'MOD-IA-01':5, 'MOD-ORG-02':5, 'MOD-AUTO-01':4 },

  // I2 — Temps perdu sur tâches répétitives
  'I2_lt2h':   { 'MOD-IA-05':1 },
  'I2_2to5h':  { 'MOD-AUTO-01':4, 'MOD-IA-05':3, 'MOD-PROC-02':3 },
  'I2_5to10h': { 'MOD-AUTO-01':5, 'MOD-AUTO-05':4, 'MOD-IA-05':4, 'MOD-PROC-02':4 },
  'I2_more10h':{ 'MOD-AUTO-01':5, 'MOD-AUTO-05':5, 'MOD-IA-05':5, 'MOD-PROC-01':4, 'MOD-PROC-02':5 },

  // I3 — Usage IA
  'I3_daily':    { 'MOD-IA-04':3, 'MOD-IA-08':3 },
  'I3_sometimes':{ 'MOD-IA-03':4, 'MOD-IA-04':4, 'MOD-IA-05':3 },
  'I3_tried':    { 'MOD-IA-01':4, 'MOD-IA-03':4, 'MOD-IA-04':4, 'MOD-IA-05':4 },
  'I3_never':    { 'MOD-IA-01':5, 'MOD-IA-02':5, 'MOD-IA-03':4, 'MOD-IA-04':4, 'MOD-IA-05':5 },

  // I4 — Automatisations existantes
  'I4_several': { 'MOD-AUTO-05':2, 'MOD-IA-08':3 },
  'I4_one':     { 'MOD-AUTO-01':3, 'MOD-AUTO-05':3 },
  'I4_no':      { 'MOD-AUTO-01':5, 'MOD-AUTO-05':5, 'MOD-AUTO-02':4, 'MOD-PROC-01':4 },
}

// ── Étape 1 : Réponses → Scores de modules ───────────────────────
export function computeModuleScores(answers: Record<string, string>): ModuleScore[] {
  const accumulator: Record<string, { score: number; sources: string[] }> = {}

  for (const [qCode, value] of Object.entries(answers)) {
    // Multi-select : P3 peut contenir "fidelisation,temps"
    const values = value.split(',').map(v => v.trim())

    for (const v of values) {
      const key = `${qCode}_${v}`
      const moduleWeights = QUESTION_MODULE_MAP[key]
      if (!moduleWeights) continue

      for (const [modId, poids] of Object.entries(moduleWeights)) {
        if (!accumulator[modId]) accumulator[modId] = { score: 0, sources: [] }
        accumulator[modId].score += poids
        accumulator[modId].sources.push(`${key}:+${poids}`)
      }
    }
  }

  return Object.entries(accumulator)
    .map(([id_module, { score, sources }]) => ({
      id_module,
      score,
      source: sources.join(', '),
    }))
    .sort((a, b) => b.score - a.score)
}

// ── Étape 2 : Scores modules → Scoring des 30 programmes ─────────
export function computeProgrammeScores(
  moduleScores: ModuleScore[],
  parcoursMatch: ParcoursMatch | null
): ProgrammeScore[] {
  const moduleMap: Record<string, number> = {}
  for (const ms of moduleScores) {
    moduleMap[ms.id_module] = ms.score
  }

  const scores: ProgrammeScore[] = []

  for (const prog of PROGRAMMES.filter(p => p.actif)) {
    const mappings = MAPPING_PROG_MOD.filter(m => m.id_programme === prog.id)
    let score = 0
    const contributions: { id_module: string; contribution: number }[] = []

    for (const m of mappings) {
      const modScore = moduleMap[m.id_module] ?? 0
      const contribution = modScore * m.poids
      if (contribution > 0) {
        score += contribution
        contributions.push({ id_module: m.id_module, contribution })
      }
    }

    // Bonus parcours métier
    let bonusParcours = 0
    if (parcoursMatch && parcoursMatch.confiance !== 'AUCUN_PARCOURS_METIER') {
      const isPrioritaire = parcoursMatch.parcours.programmes_prioritaires.includes(prog.id)
      if (isPrioritaire) {
        const multiplicateur = parcoursMatch.confiance === 'MATCH_FORT' ? 1.0 : 0.5
        bonusParcours = Math.round(SCORING_CONFIG.BONUS_PARCOURS_POIDS * multiplicateur)
        score += bonusParcours
      }
    }

    if (score > 0) {
      // Log traçabilité
      const topContribs = contributions
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 3)
        .map(c => `${c.id_module} +${c.contribution}`)
        .join(', ')
      const logParcours = bonusParcours > 0 ? `, bonus ${parcoursMatch?.parcours.id} +${bonusParcours}` : ''
      const log = `${prog.id} recommandé car ${topContribs}${logParcours}`

      scores.push({ programme: prog, score, modules_contribution: contributions, bonus_parcours: bonusParcours, log })
    }
  }

  return scores.sort((a, b) => b.score - a.score)
}

// ── Étape 3 : Détection du parcours métier via APE ───────────────
export function detectParcours(
  nafCode?: string,
  nafLabel?: string
): ParcoursMatch {
  if (!nafCode) {
    return { parcours: null as any, confiance: 'AUCUN_PARCOURS_METIER', raison: 'Pas de code APE disponible' }
  }

  // Normaliser le code APE (enlever espaces, mettre en majuscules)
  const ape = nafCode.replace(/\s/g, '').toUpperCase()

  // Chercher une correspondance exacte
  const match = APE_MAPPING.find(m => m.actif && m.code_ape.replace(/\s/g, '').toUpperCase() === ape)

  if (!match) {
    return { parcours: null as any, confiance: 'AUCUN_PARCOURS_METIER', raison: `Code APE ${nafCode} non mappé` }
  }

  const parcours = PARCOURS.find(p => p.id === match.id_parcours && p.actif)
  if (!parcours) {
    return { parcours: null as any, confiance: 'AUCUN_PARCOURS_METIER', raison: `Parcours ${match.id_parcours} inactif` }
  }

  const confiance: ParcoursMatch['confiance'] =
    match.confiance === 'Forte' ? 'MATCH_FORT' : 'MATCH_A_CONFIRMER'

  return {
    parcours,
    confiance,
    raison: match.confiance === 'Forte'
      ? `APE ${nafCode} correspond au métier "${parcours.metier}"`
      : `APE ${nafCode} (${match.regle_validation})`,
  }
}

// ── Fonction principale : tout en un ────────────────────────────
export function computeRecommendations(
  answers: Record<string, string>,
  nafCode?: string,
  nafLabel?: string,
  topN = SCORING_CONFIG.TOP_N_PROGRAMMES
): {
  moduleScores: ModuleScore[]
  programmeScores: ProgrammeScore[]
  top: ProgrammeScore[]
  parcoursMatch: ParcoursMatch
  logs: string[]
} {
  const moduleScores = computeModuleScores(answers)
  const parcoursMatch = detectParcours(nafCode, nafLabel)
  const programmeScores = computeProgrammeScores(moduleScores, parcoursMatch)
  const top = programmeScores.slice(0, topN)
  const logs = top.map(p => p.log)

  return { moduleScores, programmeScores, top, parcoursMatch, logs }
}
