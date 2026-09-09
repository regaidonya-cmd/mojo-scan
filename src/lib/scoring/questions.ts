// ══════════════════════════════════════════════════════════════
// MOJO SCAN — Questionnaire FLASH v2
// Feedback ChatGPT intégré : libellés, options, branchement
// ══════════════════════════════════════════════════════════════

import type { Question } from '@/types'

export const QUESTIONS: Question[] = [

  // ── P1 — Rôle ─────────────────────────────────────────────────
  {
    code: 'P1',
    text: 'Quel est votre rôle dans l\'entreprise ?',
    type: 'single',
    options: [
      { value: 'dirigeant', label: 'Dirigeant / Gérant',   score: 0 },
      { value: 'rh',        label: 'RH / Formation',        score: 0 },
      { value: 'manager',   label: 'Manager / Responsable', score: 0 },
      { value: 'salarie',   label: 'Salarié',               score: 0 },
      { value: 'autre',     label: 'Autre',                 score: 0 },
    ],
  },

  // ── P2 — Bénéficiaire ─────────────────────────────────────────
  {
    code: 'P2',
    text: 'Qui souhaitez-vous former ou accompagner ?',
    type: 'single',
    options: [
      { value: 'me',        label: 'Moi uniquement',       score: 0 },
      { value: 'team',      label: 'Mes salariés',          score: 0 },
      { value: 'both',      label: 'Moi + mon équipe',      score: 0 },
      { value: 'undefined', label: 'À définir ensemble',    score: 0 },
    ],
  },



  // ── P8 — Statut juridique bénéficiaire ───────────────────────
  // Question simple, compréhensible par une TPE
  // Utilisée uniquement par le moteur de financement
  {
    code: 'P8',
    text: 'Quel est votre statut professionnel ?',
    hint: "Cette information nous permet d'identifier les dispositifs de financement auxquels vous pouvez prétendre.",
    type: 'single' as const,
    options: [
      { value: 'tns',     label: 'Indépendant / Gérant non-salarié (TNS)', score: 0 },
      { value: 'salarie', label: "Salarié de l'entreprise",               score: 0 },
      { value: 'other',   label: 'Autre statut',                            score: 0 },
    ],
  },
  // ── P3 — Objectif (multi-select) ──────────────────────────────
  // v2 : libellés orientés résultat (gain > action)
  {
    code: 'P3',
    text: 'Quel résultat voulez-vous obtenir en priorité ?',
    hint: 'Choisissez ce qui correspond le mieux à votre situation aujourd\'hui.',
    type: 'single',
    options: [
      { value: 'clients',        label: 'Avoir plus de clients',                     score: 8, tags: ['acquisition'] },
      { value: 'google',         label: 'Être trouvé sur Google par mes prospects',  score: 7, tags: ['visibilite','seo-local'] },
      { value: 'reseaux',        label: 'Développer ma visibilité sur les réseaux',  score: 6, tags: ['acquisition','reseaux'] },
      { value: 'fidelisation',   label: 'Faire revenir mes clients existants',       score: 6, tags: ['fidelisation','crm'] },
      { value: 'site',           label: 'Avoir un site web qui génère des contacts', score: 5, tags: ['site','wordpress'] },
      { value: 'temps',          label: 'Gagner du temps sur mes tâches courantes',  score: 7, tags: ['productivite','automatisation'] },
      { value: 'automatisation', label: 'Automatiser ce qui me prend trop de temps', score: 7, tags: ['automatisation','ia'] },
      { value: 'ia',             label: 'Utiliser l\'IA pour travailler plus vite',  score: 8, tags: ['ia','chatgpt'] },
      { value: 'organisation',   label: 'Mieux m\'organiser au quotidien',           score: 5, tags: ['organisation'] },
      { value: 'competences',    label: 'Monter en compétences sur le digital',      score: 4, tags: ['formation'] },
    ],
  },

  // ── P4 — Urgence ──────────────────────────────────────────────
  // v2 : libellé "maintenant" reformulé sans "urgent" (anxiogène)
  {
    code: 'P4',
    text: 'Sur quel horizon envisagez-vous d\'agir ?',
    type: 'single',
    options: [
      { value: 'now',   label: 'Le plus tôt possible',          score: 20 },
      { value: 'lt3m',  label: 'Dans les 3 prochains mois',     score: 15 },
      { value: '3to6m', label: 'Dans 3 à 6 mois',               score: 8  },
      { value: 'later', label: 'Je me renseigne pour plus tard', score: 3  },
    ],
  },

  // ── P5 — Décideur ─────────────────────────────────────────────
  {
    code: 'P5',
    text: 'Êtes-vous la personne qui prendra la décision ?',
    type: 'single',
    options: [
      { value: 'yes', label: 'Oui, je décide seul(e)',        score: 15 },
      { value: 'co',  label: 'Je co-décide avec quelqu\'un',  score: 10 },
      { value: 'no',  label: 'Non, je dois en référer',        score: 3  },
    ],
  },

  // ── P6 — Accompagnement ───────────────────────────────────────
  // v2 : reformulé pour valoriser l'accompagnement sans dévaloriser la formation seule
  {
    code: 'P6',
    text: 'Qu\'est-ce qui vous correspond le mieux ?',
    type: 'single',
    options: [
      { value: 'yes',   label: 'Je veux être formé(e) ET accompagné(e) dans la mise en œuvre', score: 10 },
      { value: 'maybe', label: 'Une formation suffit, mais je suis ouvert(e) à un suivi',       score: 6  },
      { value: 'no',    label: 'Une formation seule me convient parfaitement',                   score: 2  },
    ],
  },

  // ── P7 — Budget ───────────────────────────────────────────────
  // v2 : reformulé de façon positive (possibilité > contrainte)
  // Hint mis à jour : 80% (plus prudent que "grande majorité")
  {
    code: 'P7',
    text: 'Si un reste à charge est demandé, comment vous positionnez-vous ?',
    hint: 'Une prise en charge partielle ou totale peut être possible selon votre statut, votre entreprise et les critères du financeur.',
    type: 'single',
    options: [
      { value: 'yes',     label: 'Je peux compléter si le montant est raisonnable', score: 5 },
      { value: 'depends', label: 'Ça dépend du montant — à voir au cas par cas',    score: 3 },
      { value: 'only100', label: 'Je préfère un financement à 100%',                score: 1 },
    ],
  },

  // ── BRANCHE ACQUISITION ──────────────────────────────────────

  // A1 — Origine clients (reformulé)
  {
    code: 'A1',
    text: 'Aujourd\'hui, comment vos clients vous trouvent-ils principalement ?',
    branch: 'acquisition',
    type: 'single',
    options: [
      { value: 'bouche',   label: 'Bouche à oreille et recommandations',    score: 0 },
      { value: 'google',   label: 'Google / recherche en ligne',            score: 8 },
      { value: 'reseaux',  label: 'Réseaux sociaux',                        score: 6 },
      { value: 'mixed',    label: 'Plusieurs canaux à la fois',             score: 10 },
      { value: 'physique', label: 'Salon, foire, réseau physique',          score: 2 },
    ],
  },

  // A2 — Google Business Profile (reformulé + option "Je ne sais pas" mieux positionnée)
  {
    code: 'A2',
    text: 'Avez-vous une fiche Google Business Profile ?',
    hint: 'C\'est la fiche qui apparaît quand on cherche votre activité sur Google ou Maps.',
    branch: 'acquisition',
    type: 'single',
    options: [
      { value: 'optimized', label: 'Oui, elle est complète et à jour',              score: 10 },
      { value: 'basic',     label: 'Oui, mais elle n\'est pas très complète',        score: 5  },
      { value: 'no',        label: 'Non, je n\'en ai pas',                           score: 0  },
      { value: 'dontknow',  label: 'Je ne suis pas sûr(e)',                          score: 1  },
    ],
  },

  // A3 — Avis Google (reformulé : "note" → "avis")
  {
    code: 'A3',
    text: 'Combien d\'avis clients avez-vous environ sur Google ?',
    branch: 'acquisition',
    type: 'single',
    options: [
      { value: 'more50', label: 'Plus de 50 avis',  score: 10 },
      { value: '20to50', label: 'Entre 20 et 50',   score: 7  },
      { value: 'lt20',   label: 'Moins de 20',      score: 3  },
      { value: 'none',   label: 'Très peu ou aucun', score: 0 },
    ],
  },

  // A4 — Réseaux sociaux (reformulé : clarifier "pour votre activité")
  {
    code: 'A4',
    text: 'Publiez-vous régulièrement sur les réseaux sociaux pour votre activité ?',
    branch: 'acquisition',
    type: 'single',
    options: [
      { value: 'active',    label: 'Oui, plusieurs fois par semaine',  score: 8 },
      { value: 'sometimes', label: 'De temps en temps, mais irrégulièrement', score: 4 },
      { value: 'rarely',    label: 'Rarement ou jamais',              score: 0 },
    ],
  },

  // A5 — Site web (reformulé : "moderne" → "visible sur Google")
  {
    code: 'A5',
    text: 'Avez-vous un site web professionnel ?',
    branch: 'acquisition',
    type: 'single',
    options: [
      { value: 'optimized', label: 'Oui, et il m\'apporte des contacts',   score: 8 },
      { value: 'basic',     label: 'Oui, mais il est peu visible ou ancien', score: 4 },
      { value: 'no',        label: 'Non, je n\'en ai pas',                  score: 0 },
    ],
  },

  // ── BRANCHE CONVERSION / FIDÉLISATION ────────────────────────

  // C1 — Suivi prospects (reformulé : plus concret)
  {
    code: 'C1',
    text: 'Comment suivez-vous vos prospects et demandes de devis ?',
    branch: 'conversion',
    type: 'single',
    options: [
      { value: 'crm',     label: 'Dans un CRM ou logiciel dédié',          score: 8 },
      { value: 'sheets',  label: 'Dans un tableau Excel ou Google Sheets',  score: 5 },
      { value: 'memory',  label: 'De tête ou sur des notes',               score: 0 },
      { value: 'nothing', label: 'Je ne les suis pas vraiment',             score: 0 },
    ],
  },

  // C2 — Relances (reformulé : "automatiquement" → exemple concret)
  {
    code: 'C2',
    text: 'Quand un prospect ne répond pas, que faites-vous ?',
    branch: 'conversion',
    type: 'single',
    options: [
      { value: 'auto',   label: 'Un système le relance automatiquement',     score: 8 },
      { value: 'manual', label: 'Je le relance manuellement, régulièrement', score: 5 },
      { value: 'rarely', label: 'Je le relance parfois, faute de temps',     score: 2 },
      { value: 'never',  label: 'Je ne le relance généralement pas',         score: 0 },
    ],
  },

  // C3 — Base clients (reformulé : plus direct)
  {
    code: 'C3',
    text: 'Avez-vous une liste organisée de vos clients actuels ?',
    branch: 'conversion',
    type: 'single',
    options: [
      { value: 'crm',    label: 'Oui, dans un CRM ou logiciel',           score: 8 },
      { value: 'sheets', label: 'Oui, dans un tableau',                   score: 5 },
      { value: 'basic',  label: 'Oui, mais elle n\'est pas à jour',        score: 2 },
      { value: 'no',     label: 'Non, pas vraiment',                       score: 0 },
    ],
  },

  // C4 — Fidélisation (hint enrichi avec exemples concrets)
  {
    code: 'C4',
    text: 'Faites-vous des actions pour que vos clients reviennent ?',
    hint: 'Ex : email de suivi, offre de retour, message anniversaire, programme de parrainage...',
    branch: 'conversion',
    type: 'single',
    options: [
      { value: 'regular',   label: 'Oui, j\'ai un système en place',         score: 8 },
      { value: 'sometimes', label: 'Parfois, de façon ponctuelle',            score: 4 },
      { value: 'no',        label: 'Non, je n\'ai rien de structuré',         score: 0 },
    ],
  },

  // ── BRANCHE IA / PRODUCTIVITÉ ─────────────────────────────────

  // I1 — Outils digitaux (reformulé : moins vague)
  {
    code: 'I1',
    text: 'Quels outils numériques utilisez-vous dans votre travail quotidien ?',
    branch: 'ia',
    type: 'single',
    options: [
      { value: 'many',  label: 'Plusieurs outils bien en main (CRM, agenda, email...)', score: 8 },
      { value: 'some',  label: 'Quelques outils, mais je ne les maîtrise pas bien',     score: 5 },
      { value: 'few',   label: 'Surtout email et téléphone',                             score: 2 },
      { value: 'none',  label: 'Très peu d\'outils numériques',                          score: 0 },
    ],
  },

  // I2 — Temps perdu (exemples enrichis dans le hint)
  {
    code: 'I2',
    text: 'Combien de temps perdez-vous par semaine sur des tâches répétitives ?',
    hint: 'Ex : rédiger les mêmes emails, saisir des données, publier sur les réseaux, relancer des clients...',
    branch: 'ia',
    type: 'single',
    options: [
      { value: 'lt2h',   label: 'Moins de 2h — c\'est gérable',        score: 8 },
      { value: '2to5h',  label: '2 à 5h par semaine',                   score: 4 },
      { value: '5to10h', label: '5 à 10h — ça commence à peser',        score: 2 },
      { value: 'more10h',label: 'Plus de 10h — c\'est vraiment trop',   score: 0 },
    ],
  },

  // I3 — Usage IA (reformulé : "Copilot" → plus universel)
  {
    code: 'I3',
    text: 'Utilisez-vous déjà des outils d\'IA comme ChatGPT, Gemini ou d\'autres ?',
    branch: 'ia',
    type: 'single',
    options: [
      { value: 'daily',     label: 'Oui, tous les jours — je suis à l\'aise',          score: 10 },
      { value: 'sometimes', label: 'Oui, de temps en temps',                            score: 6  },
      { value: 'tried',     label: 'J\'ai essayé, mais je n\'ai pas vraiment accroché', score: 3  },
      { value: 'never',     label: 'Non, pas encore',                                   score: 0  },
    ],
  },

  // I4 — Automatisations (hint enrichi)
  {
    code: 'I4',
    text: 'Avez-vous des automatisations en place dans votre activité ?',
    hint: 'Ex : rappel de RDV automatique, email de suivi déclenché, publication planifiée...',
    branch: 'ia',
    type: 'single',
    options: [
      { value: 'several', label: 'Oui, plusieurs — ça tourne tout seul', score: 8 },
      { value: 'one',     label: 'Une ou deux, basiques',                  score: 5 },
      { value: 'no',      label: 'Non, tout est encore manuel',            score: 0 },
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
  if (next.condition && !next.condition(answers)) {
    return getNextQuestion(next.code, answers, branch)
  }
  return next
}

export function getTotalSteps(branch: string): number {
  return getQuestionsForBranch(branch).length
}

export function detectBranch(answers: Record<string, string>): string {
  const obj = (answers['P3'] ?? '').split(',')[0]
  const acq = ['clients','google','reseaux','site']
  const conv = ['fidelisation','clients']
  const ia   = ['ia','temps','automatisation','organisation','competences']
  if (ia.includes(obj)) return 'ia'
  if (conv.includes(obj) && !acq.includes(obj)) return 'conversion'
  return 'acquisition'
}
