// ══════════════════════════════════════════════════════════════
// MOJO LEAD ENGINE — Moteur de scoring v2
// Aucune association Question→Module n'est codée en dur ici.
// Toutes les associations viennent de MAPPING_QUESTIONS_MODULES.
// ══════════════════════════════════════════════════════════════

import { PROGRAMMES, MAPPING_PROG_MOD, PARCOURS, APE_MAPPING } from './catalog'
import { MAPPING_QUESTIONS_MODULES } from './mapping_questions_modules'
import { MAPPING_PARCOURS_PROGRAMMES } from './mapping_parcours_programmes'
import type { Programme, Parcours } from './catalog'

// ── Configuration — tous les paramètres modifiables ici ────────
export const SCORING_CONFIG = {
  BONUS_PARCOURS_POIDS: 8,
  // Seuil de poids pour qu'un module soit "fortement concordant" (départage ex-aequo)
  SEUIL_MODULE_FORT: 3,
  TOP_N_PROGRAMMES: 3,
}

// ── Types ────────────────────────────────────────────────────────
export interface ModuleScore {
  id_module: string
  score: number
  sources: string[]
}

export interface ProgrammeScore {
  programme: Programme
  score_total: number
  score_besoins: number         // score hors bonus parcours (pour départage ex-aequo)
  score_bonus_parcours: number
  modules_forts: number         // nb modules avec poids_prog_mod >= SEUIL_MODULE_FORT (ex-aequo)
  contributions: { id_module: string; score_module: number; poids_prog_mod: number; contribution: number }[]
  log: string
}

export interface ParcoursMatch {
  parcours: Parcours | null
  confiance: 'MATCH_FORT' | 'MATCH_A_CONFIRMER' | 'AUCUN_PARCOURS_METIER'
  raison: string
}

export interface PrerequisCheck {
  status: 'PREREQUIS_OK' | 'PREREQUIS_A_VERIFIER' | 'PREREQUIS_NON_REMPLI'
  detail?: string
}

// ── Étape 1 : Réponses → Scores de modules (depuis Mapping_Questions_Modules) ──
export function computeModuleScores(answers: Record<string, string>): ModuleScore[] {
  const accumulator: Record<string, { score: number; sources: string[] }> = {}

  // Filtrer les associations actives uniquement
  const activeMapping = MAPPING_QUESTIONS_MODULES.filter(m => m.actif)

  for (const [qCode, value] of Object.entries(answers)) {
    // Multi-select : P3 peut contenir "fidelisation,temps"
    const values = value.split(',').map(v => v.trim())

    for (const v of values) {
      // Chercher toutes les associations pour cette question + réponse
      const associations = activeMapping.filter(
        m => m.id_question === qCode && m.valeur_reponse === v
      )

      for (const assoc of associations) {
        if (!accumulator[assoc.id_module]) {
          accumulator[assoc.id_module] = { score: 0, sources: [] }
        }
        accumulator[assoc.id_module].score += assoc.poids
        accumulator[assoc.id_module].sources.push(
          `${qCode}_${v} → ${assoc.id_module} (+${assoc.poids})`
        )
      }
    }
  }

  return Object.entries(accumulator)
    .map(([id_module, { score, sources }]) => ({ id_module, score, sources }))
    .sort((a, b) => b.score - a.score)
}

// ── Étape 2 : Scores modules → Scoring des 30 programmes ─────────
export function computeProgrammeScores(
  moduleScores: ModuleScore[],
  parcoursMatch: ParcoursMatch
): ProgrammeScore[] {
  const moduleMap: Record<string, number> = {}
  for (const ms of moduleScores) {
    moduleMap[ms.id_module] = ms.score
  }

  // Récupérer les programmes prioritaires du parcours depuis Mapping_Parcours_Programmes
  const parcoursPrioProgIds = parcoursMatch.parcours
    ? MAPPING_PARCOURS_PROGRAMMES
        .filter(m => m.id_parcours === parcoursMatch.parcours!.id && m.actif)
        .map(m => m.id_programme)
    : []

  const scores: ProgrammeScore[] = []

  for (const prog of PROGRAMMES.filter(p => p.actif)) {
    const mappings = MAPPING_PROG_MOD.filter(m => m.id_programme === prog.id)
    let score_besoins = 0
    let modules_forts = 0
    const contributions: ProgrammeScore['contributions'] = []

    for (const m of mappings) {
      const modScore = moduleMap[m.id_module] ?? 0
      const contribution = modScore * m.poids
      if (contribution > 0) {
        score_besoins += contribution
        contributions.push({
          id_module: m.id_module,
          score_module: modScore,
          poids_prog_mod: m.poids,
          contribution,
        })
        // Module fortement concordant : poids_prog_mod >= seuil
        if (m.poids >= SCORING_CONFIG.SEUIL_MODULE_FORT) {
          modules_forts++
        }
      }
    }

    // Bonus parcours métier — uniquement si programme dans les prioritaires du parcours
    let score_bonus_parcours = 0
    if (
      parcoursMatch.parcours &&
      parcoursMatch.confiance !== 'AUCUN_PARCOURS_METIER' &&
      parcoursPrioProgIds.includes(prog.id)
    ) {
      const multiplicateur = parcoursMatch.confiance === 'MATCH_FORT' ? 1.0 : 0.5
      score_bonus_parcours = Math.round(SCORING_CONFIG.BONUS_PARCOURS_POIDS * multiplicateur)
    }

    const score_total = score_besoins + score_bonus_parcours

    if (score_total > 0) {
      // Log traçabilité complet
      const topContribs = [...contributions]
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 4)
        .map(c => `${c.id_module} [${c.score_module}×${c.poids_prog_mod}=+${c.contribution}]`)
        .join(', ')
      const logBonus = score_bonus_parcours > 0
        ? `, bonus ${parcoursMatch.parcours!.id} (${parcoursMatch.confiance}) +${score_bonus_parcours}`
        : ''
      const log = `${prog.id} — Score: ${score_total} | Besoins: ${score_besoins} | ${topContribs}${logBonus}`

      scores.push({ programme: prog, score_total, score_besoins, score_bonus_parcours, modules_forts, contributions, log })
    }
  }

  // Tri déterministe avec départage ex-aequo :
  // 1. Score total décroissant
  // 2. Score besoins hors bonus décroissant
  // 3. Nombre de modules fortement concordants décroissant (poids_prog_mod >= SEUIL_MODULE_FORT=3)
  // 4. ID_Programme croissant (garantit reproductibilité absolue)
  return scores.sort((a, b) => {
    if (b.score_total !== a.score_total) return b.score_total - a.score_total
    if (b.score_besoins !== a.score_besoins) return b.score_besoins - a.score_besoins
    if (b.modules_forts !== a.modules_forts) return b.modules_forts - a.modules_forts
    return a.programme.id.localeCompare(b.programme.id)
  })
}

// ── Étape 3 : Détection parcours via APE (3 niveaux) ─────────────
export function detectParcours(nafCode?: string): ParcoursMatch {
  if (!nafCode) {
    return { parcours: null, confiance: 'AUCUN_PARCOURS_METIER', raison: 'Pas de code APE disponible' }
  }

  const ape = nafCode.replace(/\s/g, '').toUpperCase()
  const match = APE_MAPPING.find(m => m.actif && m.code_ape.replace(/\s/g, '').toUpperCase() === ape)

  if (!match) {
    return { parcours: null, confiance: 'AUCUN_PARCOURS_METIER', raison: `Code APE ${nafCode} non mappé` }
  }

  const parcours = PARCOURS.find(p => p.id === match.id_parcours && p.actif)
  if (!parcours) {
    return { parcours: null, confiance: 'AUCUN_PARCOURS_METIER', raison: `Parcours ${match.id_parcours} inactif` }
  }

  const confiance: ParcoursMatch['confiance'] =
    match.confiance === 'Forte' ? 'MATCH_FORT' : 'MATCH_A_CONFIRMER'

  return {
    parcours,
    confiance,
    raison: match.confiance === 'Forte'
      ? `APE ${nafCode} → métier "${parcours.metier}" (confiance forte)`
      : `APE ${nafCode} : ${match.regle_validation} (confiance moyenne — à confirmer)`,
  }
}

// ── Vérification prérequis (V1 conservative) ─────────────────────
export function checkPrerequisProgramme(
  prog: Programme,
  answers: Record<string, string>
): PrerequisCheck {
  // PROG-026 WordPress : nécessite des bases en navigation web
  // On ne peut pas le déduire formellement du questionnaire actuel → PREREQUIS_A_VERIFIER
  if (prog.id === 'PROG-026') {
    return {
      status: 'PREREQUIS_A_VERIFIER',
      detail: 'WordPress Pro (21h) nécessite une maîtrise courante d\'Internet et d\'un ordinateur. À confirmer avant inscription.',
    }
  }

  // PROG-009 Assistants IA : pratique préalable IA recommandée
  if (prog.id === 'PROG-009') {
    const iaUsage = answers['I3'] ?? ''
    if (iaUsage === 'never') {
      return {
        status: 'PREREQUIS_A_VERIFIER',
        detail: 'La création d\'assistants IA métier est plus accessible après une formation de base à ChatGPT (PROG-006).',
      }
    }
  }

  // PROG-005 Campagnes publicitaires : nécessite idéalement une présence et une offre existantes
  if (prog.id === 'PROG-005') {
    const site = answers['A5'] ?? ''
    if (site === 'no') {
      return {
        status: 'PREREQUIS_A_VERIFIER',
        detail: 'Les campagnes publicitaires sont plus efficaces avec un site web ou une landing page existante.',
      }
    }
  }

  // PROG-021 GA4 : nécessite un accès GA4 — impossible à vérifier via le questionnaire
  if (prog.id === 'PROG-021') {
    return {
      status: 'PREREQUIS_A_VERIFIER',
      detail: 'Google Analytics 4 nécessite un accès à une propriété GA4 existante ou à créer. À confirmer.',
    }
  }

  return { status: 'PREREQUIS_OK' }
}

// ── Fonction principale ──────────────────────────────────────────
export function computeRecommendations(
  answers: Record<string, string>,
  nafCode?: string,
  topN = SCORING_CONFIG.TOP_N_PROGRAMMES
): {
  moduleScores: ModuleScore[]
  programmeScores: ProgrammeScore[]
  top: ProgrammeScore[]
  topWithPrerequisite: (ProgrammeScore & { prerequis: PrerequisCheck })[]
  parcoursMatch: ParcoursMatch
  logs: string[]
} {
  const moduleScores = computeModuleScores(answers)
  const parcoursMatch = detectParcours(nafCode)
  const programmeScores = computeProgrammeScores(moduleScores, parcoursMatch)

  // Filtrer PREREQUIS_NON_REMPLI du Top N (V1 : aucun cas actuellement)
  const eligible = programmeScores.filter(ps => {
    const prereq = checkPrerequisProgramme(ps.programme, answers)
    return prereq.status !== 'PREREQUIS_NON_REMPLI'
  })

  const top = eligible.slice(0, topN)
  const topWithPrerequisite = top.map(ps => ({
    ...ps,
    prerequis: checkPrerequisProgramme(ps.programme, answers),
  }))
  const logs = top.map(ps => ps.log)

  return { moduleScores, programmeScores, top, topWithPrerequisite, parcoursMatch, logs }
}
