// ══════════════════════════════════════════════════════════════
// P0.7B — Boucle terrain : résultat d'appel -> conséquences déterministes.
// Fonction PURE, aucun accès DB. Produit :
//  - l'événement à ajouter au journal (mappé sur les EventKind déjà
//    compris par engine.ts — aucune modification d'engine.ts nécessaire) ;
//  - les champs à persister sur prospects_sales (temperature/pipeline/next_action_*) ;
//  - si applicable, la portée d'opposition à créer (jamais automatique
//    au-delà du choix humain explicite).
// ══════════════════════════════════════════════════════════════

import type { EventKind, Temperature, PipelineStage } from './types'
export { NEXT_ACTION_URGENT_TYPES, NEXT_ACTION_RELANCE_TYPES } from './types'

export type ResultatAppel =
  | 'PAS_DE_REPONSE'
  | 'A_RAPPELER'
  | 'ECHANGE_OBTENU'
  | 'INTERESSE'
  | 'RDV_OBTENU'
  | 'PAS_INTERESSE_REACTIVABLE'
  | 'OPPORTUNITE_CLOTUREE'
  | 'DEMANDE_NE_PLUS_CONTACTER'
  | 'MAUVAIS_INTERLOCUTEUR'
  | 'COORDONNEES_INCORRECTES'

export const RESULTAT_LABEL: Record<ResultatAppel, string> = {
  PAS_DE_REPONSE: 'Pas de réponse',
  A_RAPPELER: 'À rappeler',
  ECHANGE_OBTENU: 'Échange obtenu',
  INTERESSE: 'Intéressé',
  RDV_OBTENU: 'RDV obtenu',
  PAS_INTERESSE_REACTIVABLE: 'Pas intéressé (pour le moment)',
  OPPORTUNITE_CLOTUREE: 'Opportunité clôturée',
  DEMANDE_NE_PLUS_CONTACTER: 'Ne plus contacter',
  MAUVAIS_INTERLOCUTEUR: 'Mauvais interlocuteur',
  COORDONNEES_INCORRECTES: 'Coordonnées incorrectes',
}

export type OppositionScope = 'PERSONNE' | 'MOYEN' | 'ENTREPRISE'

const RESULTATS_VALIDES = new Set<string>([
  'PAS_DE_REPONSE', 'A_RAPPELER', 'ECHANGE_OBTENU', 'INTERESSE', 'RDV_OBTENU',
  'PAS_INTERESSE_REACTIVABLE', 'OPPORTUNITE_CLOTUREE', 'DEMANDE_NE_PLUS_CONTACTER',
  'MAUVAIS_INTERLOCUTEUR', 'COORDONNEES_INCORRECTES',
])
const SCOPES_VALIDES = new Set<string>(['PERSONNE', 'MOYEN', 'ENTREPRISE'])

/** P0.7C-HARDENING §1 — validation pure des valeurs closes reçues du
 * client, testable indépendamment de Next.js/Request. Toute valeur hors
 * de ces ensembles est rejetée avant même d'atteindre computeConsequence(). */
export function isResultatValide(v: unknown): v is ResultatAppel {
  return typeof v === 'string' && RESULTATS_VALIDES.has(v)
}
export function isOppositionScopeValide(v: unknown): v is OppositionScope {
  return typeof v === 'string' && SCOPES_VALIDES.has(v)
}

export interface ConsequenceInput {
  resultat: ResultatAppel
  now: string // ISO
  dateRappelSaisie?: string // ISO, requis pour A_RAPPELER
  dateRdvSaisie?: string // ISO, requis pour RDV_OBTENU
  oppositionScope?: OppositionScope // requis pour DEMANDE_NE_PLUS_CONTACTER
}

export interface Consequence {
  eventKind: EventKind | null
  eventDueAt: string | null
  temperature: Temperature | null // null = ne pas modifier la temperature persistee
  pipelineStage: PipelineStage | null // null = ne pas modifier
  nextActionType: string
  nextActionDueAt: string | null
  nextActionReason: string
  oppositionScope: OppositionScope | null
  isStop: boolean // opportunite cloturee -> pipeline PERDU, jamais une opposition
}

function addBusinessDays(iso: string, days: number): string {
  const d = new Date(iso)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    const day = d.getDay()
    if (day !== 0 && day !== 6) added++
  }
  return d.toISOString()
}
function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

/**
 * Calcule la conséquence déterministe d'un résultat d'appel.
 * Ne persiste rien — l'appelant (route serveur) applique le résultat.
 */
export function computeConsequence(input: ConsequenceInput): Consequence {
  const { resultat, now } = input

  switch (resultat) {
    case 'PAS_DE_REPONSE': {
      const dueAt = addBusinessDays(now, 3)
      return {
        eventKind: null, // action MOJO seule -> aucun signal prospect, temperature inchangee
        eventDueAt: null,
        temperature: null,
        pipelineStage: null,
        nextActionType: 'CALLBACK',
        nextActionDueAt: dueAt,
        nextActionReason: 'Aucune réponse à cette tentative — rappel proposé',
        oppositionScope: null,
        isStop: false,
      }
    }
    case 'A_RAPPELER': {
      const dueAt = input.dateRappelSaisie ?? addBusinessDays(now, 3)
      return {
        eventKind: 'CALLBACK_REQUESTED',
        eventDueAt: dueAt,
        temperature: null, // demande de rappel = signal prospect reel, mais la temperature
        // n'est chauffee que si le moteur le juge (CALLBACK_REQUESTED est deja gere par
        // engine.ts au niveau PRIORITE ; on laisse la temperature strictement inchangee
        // ici, cf. regle verrouillee P0.5 : seule une intention explicite d'achat/interet
        // chauffe, un rappel demande est un signal d'engagement, pas necessairement d'interet)
        pipelineStage: null,
        nextActionType: 'CALLBACK',
        nextActionDueAt: dueAt,
        nextActionReason: 'Rappel explicitement demandé par le prospect',
        oppositionScope: null,
        isStop: false,
      }
    }
    case 'ECHANGE_OBTENU': {
      const dueAt = addDays(now, 7)
      return {
        eventKind: null,
        eventDueAt: null,
        temperature: null,
        pipelineStage: 'EN_DISCUSSION',
        nextActionType: 'FOLLOW_UP',
        nextActionDueAt: dueAt,
        nextActionReason: 'Échange obtenu — suivi à prévoir',
        oppositionScope: null,
        isStop: false,
      }
    }
    case 'INTERESSE': {
      // TEMPÉRATURE = intention prospect (CHAUD, réel) — PRIORITÉ = urgence
      // opérationnelle, distincte. Un intérêt exprimé seul, sans échéance
      // dure, est P1 (chaud actif), PAS automatiquement P0. Le suivi devient
      // P0 seulement lorsque son échéance (J+1, explicite/modifiable) est
      // réellement atteinte — jamais au moment même de l'enregistrement.
      const dueAt = addDays(now, 1)
      return {
        eventKind: 'POSITIVE_REPLY',
        eventDueAt: null,
        temperature: 'CHAUD',
        pipelineStage: 'EN_DISCUSSION',
        nextActionType: 'FOLLOW_UP',
        nextActionDueAt: dueAt, // PAS due immédiatement -> P1 tant que non atteinte
        nextActionReason: 'Intérêt exprimé par le prospect — suivi à prévoir',
        oppositionScope: null,
        isStop: false,
      }
    }
    case 'RDV_OBTENU': {
      if (!input.dateRdvSaisie) throw new Error('dateRdvSaisie requise pour RDV_OBTENU')
      // Fenetre de preparation = veille du RDV, jamais immediatement des la prise du RDV.
      const prepDue = addDays(input.dateRdvSaisie, -1)
      return {
        eventKind: 'RDV_SCHEDULED',
        eventDueAt: input.dateRdvSaisie,
        temperature: 'CHAUD',
        pipelineStage: 'RDV',
        nextActionType: 'PREPARE_MEETING',
        nextActionDueAt: prepDue,
        nextActionReason: `RDV obtenu le ${input.dateRdvSaisie} — préparation à prévoir`,
        oppositionScope: null,
        isStop: false,
      }
    }
    case 'PAS_INTERESSE_REACTIVABLE': {
      const dueAt = addDays(now, 90)
      return {
        eventKind: 'NEGATIVE_REPLY',
        eventDueAt: null,
        temperature: 'FROID',
        pipelineStage: null,
        nextActionType: 'NURTURE',
        nextActionDueAt: dueAt,
        nextActionReason: 'Pas intéressé pour le moment — à réévaluer plus tard',
        oppositionScope: null,
        isStop: false,
      }
    }
    case 'OPPORTUNITE_CLOTUREE': {
      return {
        eventKind: 'NEGATIVE_REPLY',
        eventDueAt: null,
        temperature: null,
        pipelineStage: 'PERDU',
        nextActionType: 'NO_ACTION',
        nextActionDueAt: null,
        nextActionReason: 'Opportunité clôturée — pas une opposition, ré-approche possible plus tard',
        oppositionScope: null,
        isStop: false, // jamais une opposition/STOP -> decision commerciale, pas une interdiction
      }
    }
    case 'DEMANDE_NE_PLUS_CONTACTER': {
      if (!input.oppositionScope) throw new Error('oppositionScope requis pour DEMANDE_NE_PLUS_CONTACTER')
      return {
        eventKind: 'NEGATIVE_REPLY',
        eventDueAt: null,
        temperature: null,
        pipelineStage: input.oppositionScope === 'ENTREPRISE' ? 'PERDU' : null,
        nextActionType: 'NO_ACTION',
        nextActionDueAt: null,
        nextActionReason: 'Demande explicite de ne plus être contacté',
        oppositionScope: input.oppositionScope,
        isStop: input.oppositionScope === 'ENTREPRISE',
      }
    }
    case 'MAUVAIS_INTERLOCUTEUR': {
      return {
        eventKind: null,
        eventDueAt: null,
        temperature: null,
        pipelineStage: null,
        nextActionType: 'QUALIFY',
        nextActionDueAt: now,
        nextActionReason: 'Mauvais interlocuteur — identifier le bon contact',
        oppositionScope: null,
        isStop: false,
      }
    }
    case 'COORDONNEES_INCORRECTES': {
      return {
        eventKind: null,
        eventDueAt: null,
        temperature: null,
        pipelineStage: null,
        nextActionType: 'ENRICH',
        nextActionDueAt: now,
        nextActionReason: 'Coordonnées incorrectes — vérifier/compléter',
        oppositionScope: null,
        isStop: false,
      }
    }
  }
}
