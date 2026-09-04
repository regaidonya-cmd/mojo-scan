// ══════════════════════════════════════════════════════════════
// MOJO SCAN — Questionnaire FLASH avec branchement
// ══════════════════════════════════════════════════════════════

import type { Question } from '@/types'

export const QUESTIONS: Question[] = [

  // ── QUESTIONS COMMUNES ─────────────────────────────────────────

  {
    code: 'P1',
    text: 'Quel est votre rôle dans l\'entreprise ?',
    type: 'single',
    options: [
      { value: 'dirigeant',  label: 'Dirigeant / Gérant',   score: 0 },
      { value: 'rh',         label: 'RH / Formation',        score: 0 },
      { value: 'manager',    label: 'Manager / Responsable', score: 0 },
      { value: 'salarie',    label: 'Salarié',               score: 0 },
      { value: 'autre',      label: 'Autre',                 score: 0 },
    ],
  },

  {
    code: 'P2',
    text: 'Qui souhaitez-vous former ou accompagner ?',
    type: 'single',
    options: [
      { value: 'me',        label: 'Moi uniquement',          score: 0 },
      { value: 'team',      label: 'Mes salariés',            score: 0 },
      { value: 'both',      label: 'Moi + mon équipe',        score: 0 },
      { value: 'undefined', label: 'À définir ensemble',      score: 0 },
    ],
  },

  {
    code: 'P3',
    text: 'Quel résultat souhaitez-vous obtenir en priorité ?',
    hint: 'Choisissez ce qui compte le plus pour vous aujourd\'hui.',
    type: 'single',
    options: [
      { value: 'clients',        label: 'Attirer plus de clients',            score: 8, tags: ['acquisition'] },
      { value: 'google',         label: 'Être visible sur Google',            score: 7, tags: ['visibilite','seo-local'] },
      { value: 'reseaux',        label: 'Développer mes réseaux sociaux',     score: 6, tags: ['acquisition','reseaux'] },
      { value: 'fidelisation',   label: 'Fidéliser mes clients existants',    score: 6, tags: ['fidelisation','crm'] },
      { value: 'site',           label: 'Créer ou améliorer mon site web',    score: 5, tags: ['site','wordpress'] },
      { value: 'temps',          label: 'Gagner du temps au quotidien',       score: 7, tags: ['productivite','automatisation'] },
      { value: 'automatisation', label: 'Automatiser des tâches répétitives', score: 7, tags: ['automatisation','ia'] },
      { value: 'ia',             label: 'Utiliser l\'IA dans mon activité',   score: 8, tags: ['ia','chatgpt'] },
      { value: 'organisation',   label: 'Mieux organiser mon activité',       score: 5, tags: ['organisation'] },
      { value: 'competences',    label: 'Monter en compétences digitales',    score: 4, tags: ['formation'] },
    ],
  },

  {
    code: 'P4',
    text: 'Quand souhaitez-vous agir ?',
    type: 'single',
    options: [
      { value: 'now',   label: 'Maintenant — c\'est urgent', score: 20 },
      { value: 'lt3m',  label: 'Dans moins de 3 mois',       score: 15 },
      { value: '3to6m', label: 'Dans 3 à 6 mois',            score: 8  },
      { value: 'later', label: 'Plus tard, je me renseigne', score: 3  },
    ],
  },

  {
    code: 'P5',
    text: 'Êtes-vous la personne qui prend la décision ?',
    type: 'single',
    options: [
      { value: 'yes', label: 'Oui, je décide seul(e)',        score: 15 },
      { value: 'co',  label: 'Je co-décide avec quelqu\'un',  score: 10 },
      { value: 'no',  label: 'Non, je dois en référer',        score: 3  },
    ],
  },

  {
    code: 'P6',
    text: 'Souhaitez-vous être accompagné(e) dans la mise en œuvre ?',
    hint: 'Pas seulement formé(e), mais suivi(e) pour appliquer.',
    type: 'single',
    options: [
      { value: 'yes',   label: 'Oui, je veux un accompagnement complet', score: 10 },
      { value: 'maybe', label: 'Peut-être, selon l\'offre',               score: 6  },
      { value: 'no',    label: 'Non, la formation seule me suffit',       score: 2  },
    ],
  },

  {
    code: 'P7',
    text: 'Si le financement est partiel, êtes-vous prêt(e) à compléter ?',
    hint: 'La grande majorité de nos formations sont finançables à 100%.',
    type: 'single',
    options: [
      { value: 'yes',      label: 'Oui, si ça reste raisonnable',     score: 5 },
      { value: 'depends',  label: 'Ça dépend du montant',              score: 3 },
      { value: 'only100',  label: 'Uniquement si c\'est 100% financé', score: 1 },
    ],
  },

  // ── BRANCHE ACQUISITION / VISIBILITÉ ───────────────────────────

  {
    code: 'A1',
    text: 'D\'où viennent principalement vos clients aujourd\'hui ?',
    branch: 'acquisition',
    type: 'single',
    options: [
      { value: 'bouche',   label: 'Bouche à oreille uniquement',              score: 0 },
      { value: 'google',   label: 'Google / recherche en ligne',              score: 8 },
      { value: 'reseaux',  label: 'Réseaux sociaux',                          score: 6 },
      { value: 'mixed',    label: 'Plusieurs canaux digitaux',                 score: 10},
      { value: 'physique', label: 'Terrain / salon / prescription physique',  score: 2 },
    ],
  },

  {
    code: 'A2',
    text: 'Avez-vous une fiche Google Business Profile (anciennement Google My Business) ?',
    branch: 'acquisition',
    type: 'single',
    options: [
      { value: 'optimized',    label: 'Oui, optimisée et à jour',             score: 10 },
      { value: 'basic',        label: 'Oui, mais basique / pas à jour',       score: 5  },
      { value: 'no',           label: 'Non, je n\'en ai pas',                  score: 0  },
      { value: 'dontknow',     label: 'Je ne sais pas',                       score: 1  },
    ],
  },

  {
    code: 'A3',
    text: 'Combien d\'avis Google avez-vous environ ?',
    branch: 'acquisition',
    type: 'single',
    options: [
      { value: 'more50',  label: 'Plus de 50 avis (bonne note)',  score: 10 },
      { value: '20to50',  label: '20 à 50 avis',                  score: 7  },
      { value: 'lt20',    label: 'Moins de 20 avis',              score: 3  },
      { value: 'none',    label: 'Aucun avis ou presque',         score: 0  },
    ],
  },

  {
    code: 'A4',
    text: 'Êtes-vous actif sur les réseaux sociaux pour votre activité ?',
    branch: 'acquisition',
    type: 'single',
    options: [
      { value: 'active',    label: 'Oui, régulièrement (1+ posts/semaine)', score: 8 },
      { value: 'sometimes', label: 'Parfois, mais pas régulièrement',        score: 4 },
      { value: 'rarely',    label: 'Rarement ou jamais',                     score: 0 },
    ],
  },

  {
    code: 'A5',
    text: 'Avez-vous un site web professionnel ?',
    branch: 'acquisition',
    type: 'single',
    options: [
      { value: 'optimized', label: 'Oui, moderne et bien référencé',      score: 8 },
      { value: 'basic',     label: 'Oui, mais ancien ou peu visible',     score: 4 },
      { value: 'no',        label: 'Non, pas de site',                    score: 0 },
    ],
  },

  // ── BRANCHE CONVERSION / FIDÉLISATION ─────────────────────────

  {
    code: 'C1',
    text: 'Comment gérez-vous le suivi de vos demandes et prospects ?',
    branch: 'conversion',
    type: 'single',
    options: [
      { value: 'crm',      label: 'CRM ou outil dédié',                        score: 8 },
      { value: 'sheets',   label: 'Tableur Excel / Google Sheets',             score: 5 },
      { value: 'memory',   label: 'De tête ou post-it',                        score: 0 },
      { value: 'nothing',  label: 'Je ne suis pas systématiquement',           score: 0 },
    ],
  },

  {
    code: 'C2',
    text: 'Relancez-vous automatiquement vos prospects qui ne répondent pas ?',
    branch: 'conversion',
    type: 'single',
    options: [
      { value: 'auto',    label: 'Oui, de façon automatisée',         score: 8 },
      { value: 'manual',  label: 'Oui, manuellement et régulièrement', score: 5 },
      { value: 'rarely',  label: 'Rarement, faute de temps',           score: 2 },
      { value: 'never',   label: 'Non, jamais',                        score: 0 },
    ],
  },

  {
    code: 'C3',
    text: 'Avez-vous une base de données clients organisée ?',
    branch: 'conversion',
    type: 'single',
    options: [
      { value: 'crm',    label: 'Oui, dans un CRM',                score: 8 },
      { value: 'sheets', label: 'Oui, dans un tableur',            score: 5 },
      { value: 'basic',  label: 'Oui, mais pas à jour / incomplète', score: 2 },
      { value: 'no',     label: 'Non',                              score: 0 },
    ],
  },

  {
    code: 'C4',
    text: 'Faites-vous des actions régulières pour faire revenir vos clients ?',
    hint: 'Emailing, offres, SMS, parrainage, anniversaire...',
    branch: 'conversion',
    type: 'single',
    options: [
      { value: 'regular',   label: 'Oui, régulièrement et automatiquement', score: 8 },
      { value: 'sometimes', label: 'Parfois, ponctuellement',               score: 4 },
      { value: 'no',        label: 'Non, jamais',                           score: 0 },
    ],
  },

  // ── BRANCHE IA / PRODUCTIVITÉ ──────────────────────────────────

  {
    code: 'I1',
    text: 'Quels outils digitaux utilisez-vous au quotidien ?',
    branch: 'ia',
    type: 'single',
    options: [
      { value: 'many',   label: 'Plusieurs outils bien intégrés',         score: 8 },
      { value: 'some',   label: 'Quelques outils, mais peu connectés',    score: 5 },
      { value: 'few',    label: 'Email + téléphone uniquement',           score: 2 },
      { value: 'none',   label: 'Peu ou pas d\'outils digitaux',          score: 0 },
    ],
  },

  {
    code: 'I2',
    text: 'Combien de temps perdez-vous chaque semaine sur des tâches répétitives ?',
    hint: 'Emails, relances, devis, facturation, posts réseaux...',
    branch: 'ia',
    type: 'single',
    options: [
      { value: 'lt2h',  label: 'Moins de 2h',               score: 8 },
      { value: '2to5h', label: '2 à 5h par semaine',         score: 4 },
      { value: '5to10h',label: '5 à 10h par semaine',        score: 2 },
      { value: 'more10h',label: 'Plus de 10h — c\'est énorme', score: 0},
    ],
  },

  {
    code: 'I3',
    text: 'Utilisez-vous déjà l\'intelligence artificielle (ChatGPT, Copilot, etc.) ?',
    branch: 'ia',
    type: 'single',
    options: [
      { value: 'daily',     label: 'Oui, tous les jours, je maîtrise',    score: 10 },
      { value: 'sometimes', label: 'Oui, de temps en temps',              score: 6  },
      { value: 'tried',     label: 'J\'ai essayé mais je ne l\'utilise pas vraiment', score: 3 },
      { value: 'never',     label: 'Non, jamais',                         score: 0  },
    ],
  },

  {
    code: 'I4',
    text: 'Avez-vous des automatisations en place dans votre activité ?',
    hint: 'Rappels automatiques, emails déclenchés, workflows...',
    branch: 'ia',
    type: 'single',
    options: [
      { value: 'several', label: 'Oui, plusieurs automatisations actives',  score: 8 },
      { value: 'one',     label: 'Oui, une ou deux',                        score: 5 },
      { value: 'no',      label: 'Non, tout est manuel',                    score: 0 },
    ],
  },
]

// ── Helpers ────────────────────────────────────────────────────

export function getQuestionsForBranch(branch: string): Question[] {
  return QUESTIONS.filter(q => !q.branch || q.branch === branch)
}

export function getNextQuestion(
  currentCode: string,
  answers: Record<string, string>,
  branch: string
): Question | null {
  const eligible = getQuestionsForBranch(branch)
  const idx = eligible.findIndex(q => q.code === currentCode)
  if (idx === -1 || idx >= eligible.length - 1) return null
  const next = eligible[idx + 1]
  // Appliquer les conditions si présentes
  if (next.condition && !next.condition(answers)) {
    return getNextQuestion(next.code, answers, branch)
  }
  return next
}

export function getTotalSteps(branch: string): number {
  return getQuestionsForBranch(branch).length
}
