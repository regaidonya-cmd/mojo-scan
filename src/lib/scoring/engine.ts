// ══════════════════════════════════════════════════════════════
// MOJO SCAN — Moteur de scoring déterministe
// Aucun LLM ne calcule les scores — traçable et testable
// ══════════════════════════════════════════════════════════════

import type { Answer, BusinessScore, LeadScore, Priority, Branch } from '@/types'
import { QUESTIONS } from './questions'

// ── Business Score ──────────────────────────────────────────────
export function computeBusinessScore(answers: Record<string, string>): BusinessScore {
  const get = (code: string): number => {
    const q = QUESTIONS.find(q => q.code === code)
    if (!q) return 0
    const opt = q.options.find(o => o.value === answers[code])
    return opt?.score ?? 0
  }

  // Acquisition (max 20)
  const acquisition = Math.min(20,
    get('A1') + // origine clients
    get('A2') + // fiche Google
    get('A3')   // avis clients
  )

  // Visibilité (max 20)
  const visibilite = Math.min(20,
    get('A4') + // réseaux sociaux
    get('A5') + // site web
    get('P3')   // objectif principal
  )

  // Conversion (max 15)
  const conversion = Math.min(15,
    get('C1') + // suivi des demandes
    get('C2')   // process de relance
  )

  // Fidélisation (max 15)
  const fidelisation = Math.min(15,
    get('C3') + // base clients / CRM
    get('C4')   // campagnes fidélisation
  )

  // Organisation (max 15)
  const organisation = Math.min(15,
    get('I1') + // outils utilisés
    get('I2')   // tâches chronophages
  )

  // IA (max 15)
  const ia = Math.min(15,
    get('I3') + // usage IA actuel
    get('I4')   // automatisations existantes
  )

  const global = Math.min(100, acquisition + visibilite + conversion + fidelisation + organisation + ia)

  return { global, acquisition, visibilite, conversion, fidelisation, organisation, ia }
}

// ── Lead Score ──────────────────────────────────────────────────
export function computeLeadScore(
  answers: Record<string, string>,
  businessScore: BusinessScore
): LeadScore {
  // Besoin détecté = inverse du score business (plus le score est bas, plus le besoin est élevé)
  const need = Math.round((1 - businessScore.global / 100) * 25)

  // Urgence (P4)
  const urgencyMap: Record<string, number> = {
    'now':     20,
    'lt3m':    15,
    '3to6m':   8,
    'later':   3,
  }
  const urgency = urgencyMap[answers['P4']] ?? 5

  // Décideur (P5)
  const decisionMap: Record<string, number> = {
    'yes':  15,
    'co':   10,
    'no':   3,
  }
  const decision = decisionMap[answers['P5']] ?? 5

  // Adéquation catalogue — basée sur la branche détectée
  const branch = detectBranch(answers)
  const fit = branch ? 12 : 6

  // Accompagnement souhaité (P6)
  const accompMap: Record<string, number> = {
    'yes':     10,
    'maybe':   6,
    'no':      2,
  }
  const accomp = accompMap[answers['P6']] ?? 4

  // Financement potentiel — toujours présent avec Qualiopi
  const funding = 10

  // Reste à charge (P7)
  const budgetMap: Record<string, number> = {
    'yes':      5,
    'depends':  3,
    'only100':  1,
  }
  const budget = budgetMap[answers['P7']] ?? 2

  const total = need + urgency + decision + fit + accomp + funding + budget

  const level =
    total >= 85 ? 'priority' :
    total >= 70 ? 'hot' :
    total >= 40 ? 'qualified' : 'cold'

  return { total, level, breakdown: { need, urgency, decision, fit, accomp, funding, budget } }
}

// ── Détection de branche ────────────────────────────────────────
export function detectBranch(answers: Record<string, string>): Branch {
  const obj = answers['P3'] ?? ''
  const acqKeywords = ['clients','google','reseaux','leads','visibilite']
  const convKeywords = ['fidelisation','suivi','relance','crm']
  const iaKeywords  = ['ia','temps','automatisation','organisation']

  if (acqKeywords.some(k => obj.includes(k))) return 'acquisition'
  if (convKeywords.some(k => obj.includes(k))) return 'conversion'
  return 'ia'
}

// ── Priorités (3 points d'action concrets) ─────────────────────
export function computePriorities(
  businessScore: BusinessScore,
  branch: Branch,
  answers: Record<string, string>
): Priority[] {
  const priorities: Priority[] = []

  // Trier les scores par faiblesse
  const dimensions = [
    { key: 'acquisition',   score: businessScore.acquisition,   max: 20 },
    { key: 'visibilite',    score: businessScore.visibilite,     max: 20 },
    { key: 'conversion',    score: businessScore.conversion,     max: 15 },
    { key: 'fidelisation',  score: businessScore.fidelisation,   max: 15 },
    { key: 'organisation',  score: businessScore.organisation,   max: 15 },
    { key: 'ia',            score: businessScore.ia,             max: 15 },
  ]
  .map(d => ({ ...d, pct: Math.round(d.score / d.max * 100) }))
  .sort((a, b) => a.pct - b.pct)

  const PRIORITY_MAP: Record<string, { label: string; detail: string; icon: string }> = {
    acquisition: {
      label: 'Générer plus de leads entrants',
      detail: 'Votre visibilité digitale ne capte pas encore assez de prospects qualifiés. Priorité : optimiser votre fiche Google Business Profile et vos réseaux.',
      icon: '🎯',
    },
    visibilite: {
      label: 'Améliorer votre présence en ligne',
      detail: 'Vos futurs clients vous cherchent mais ne vous trouvent pas. Un travail sur le SEO local et votre site peut changer ça rapidement.',
      icon: '📍',
    },
    conversion: {
      label: 'Convertir plus de prospects en clients',
      detail: 'Des leads arrivent mais ne se transforment pas suffisamment. Un process de suivi et de relance structuré peut doubler vos résultats.',
      icon: '🔄',
    },
    fidelisation: {
      label: 'Fidéliser et faire revenir vos clients',
      detail: 'Vos clients existants sont une mine d\'or sous-exploitée. Un CRM simple + des campagnes de fidélisation peuvent générer 20-30% de CA supplémentaire.',
      icon: '💛',
    },
    organisation: {
      label: 'Gagner du temps sur vos tâches quotidiennes',
      detail: 'Vous passez trop de temps sur des tâches répétitives à faible valeur. Des outils simples peuvent vous libérer 1 à 3h par jour.',
      icon: '⏱️',
    },
    ia: {
      label: 'Exploiter l\'IA dans votre activité',
      detail: 'L\'IA peut automatiser vos emails, vos devis, vos contenus et votre veille. Vous n\'exploitez pas encore ce levier.',
      icon: '🤖',
    },
  }

  for (let i = 0; i < Math.min(3, dimensions.length); i++) {
    const dim = dimensions[i]
    const info = PRIORITY_MAP[dim.key]
    if (info) {
      priorities.push({ rank: (i + 1) as 1 | 2 | 3, ...info })
    }
  }

  return priorities
}
