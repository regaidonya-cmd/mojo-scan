// ══════════════════════════════════════════════════════════════
// P0.5B.1 — Moteur DÉTERMINISTE de priorité commerciale.
// Fonction pure : aucun import Supabase, aucun accès réseau,
// aucun Date.now() interne. Tout est fourni en entrée (`now`).
// Les oppositions sont déjà résolues en amont (P0.4,
// allowedChannels()/canContact()) — ce module ne les recalcule
// jamais, il consomme `ContactMethod.allowed` tel quel.
// ══════════════════════════════════════════════════════════════

import type {
  ProspectInput,
  CommercialPriorityResult,
  Potentiel,
  Temperature,
  Priorite,
  ScoreLine,
  NextBestAction,
  SelectedContact,
  CommercialEvent,
  ContactMethod,
} from './types'
import { NEXT_ACTION_URGENT_TYPES as NEXT_ACTION_URGENT_TYPES_ENGINE } from './types'

const HOURS = 3600 * 1000

function hoursBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / HOURS
}

// ── 1. POTENTIEL ────────────────────────────────────────────────
// Uniquement structurel : fit_cible + preuve_metier. Jamais site_statut,
// jamais qualité du brief, jamais ambiguïté d'adresse, jamais disponibilité
// de contact, jamais température, jamais taille comme proxy de budget.
export function computePotentiel(input: ProspectInput): Potentiel {
  if (input.fitCible !== 'CIBLE') return 'FAIBLE'
  if (input.preuveMetier === 'CONFIRME') return 'FORT'
  if (input.preuveMetier === 'PROBABLE') return 'MOYEN'
  return 'MOYEN' // A_VERIFIER ou null mais fit CIBLE : reste d'intérêt structurel, pas FAIBLE
}

// ── 2. TEMPÉRATURE ──────────────────────────────────────────────
// Règle absolue : uniquement les événements originatedByProspect=true.
// Une action MOJO (ex: PROPOSAL_SENT) ne modifie JAMAIS directement la
// température — elle est simplement ignorée ici. La température hérite
// du dernier signal réellement émis par le prospect.
const PROSPECT_EVENT_TEMPERATURE: Partial<Record<CommercialEvent['kind'], Temperature>> = {
  SCAN_COMPLETED_NO_NEED: 'TIEDE',
  SCAN_COMPLETED_WITH_NEED: 'CHAUD',
  EXPLICIT_CONTACT_REQUEST: 'CHAUD',
  POSITIVE_REPLY: 'CHAUD',
  NEGATIVE_REPLY: 'FROID',
  CALLBACK_REQUESTED: 'CHAUD',
  RDV_SCHEDULED: 'CHAUD',
  RDV_COMPLETED: 'CHAUD',
  QUOTE_REQUESTED: 'CHAUD',
  PROPOSAL_VIEWED_TRACKING: 'TIEDE', // signal secondaire, ne rend jamais CHAUD seul
}

export function computeTemperature(input: ProspectInput): Temperature {
  // P0.7 — source de vérité : si une température a été persistée suite à
  // une interaction humaine réelle, elle fait autorité et n'est jamais
  // recalculée/écrasée silencieusement.
  if (input.persistedTemperature) return input.persistedTemperature

  let current: Temperature = 'FROID'
  for (const ev of input.events) {
    if (!ev.originatedByProspect) continue // action MOJO : jamais prise en compte ici
    const implied = PROSPECT_EVENT_TEMPERATURE[ev.kind]
    if (implied) current = implied // le plus récent gagne (événements triés chronologiquement)
  }
  return current
}

// ── 3. READINESS ────────────────────────────────────────────────
// Indépendante de POTENTIEL, TEMPÉRATURE, site_statut. NOT_FOUND ne
// pénalise jamais automatiquement.
export function computeReadiness(input: ProspectInput): { readiness: boolean; reason: string } {
  const hasAllowedContact = input.contactMethods.some((c) => c.allowed)
  if (!hasAllowedContact) {
    return { readiness: false, reason: 'Aucun moyen de contact autorisé exploitable actuellement' }
  }
  if (!input.hasReliableAngle) {
    return { readiness: false, reason: "Pas d'angle reposant sur un fait/observation/besoin fiable" }
  }
  return { readiness: true, reason: input.angleSource || 'Contact autorisé + angle fiable disponible' }
}

// ── helpers événements ──────────────────────────────────────────
function lastProspectEvent(input: ProspectInput): CommercialEvent | null {
  const prospectEvents = input.events.filter((e) => e.originatedByProspect)
  return prospectEvents.length ? prospectEvents[prospectEvents.length - 1] : null
}

function lastEvent(input: ProspectInput): CommercialEvent | null {
  return input.events.length ? input.events[input.events.length - 1] : null
}

function findLastOfKind(input: ProspectInput, kind: CommercialEvent['kind']): CommercialEvent | null {
  for (let i = input.events.length - 1; i >= 0; i--) {
    if (input.events[i].kind === kind) return input.events[i]
  }
  return null
}

/** Un ProposalSent est "en attente de réponse" s'il n'est suivi d'aucun
 * événement originatedByProspect postérieur. */
function proposalPendingReply(input: ProspectInput): CommercialEvent | null {
  const proposal = findLastOfKind(input, 'PROPOSAL_SENT')
  if (!proposal) return null
  const idx = input.events.indexOf(proposal)
  const hasLaterProspectEvent = input.events.slice(idx + 1).some((e) => e.originatedByProspect)
  return hasLaterProspectEvent ? null : proposal
}

// ── 4. PRIORITÉ ─────────────────────────────────────────────────
// STOP > P0 > P1 > P2 > P3 > P4. due_at<48h seul NE SUFFIT PAS : il faut
// aussi une nature d'événement réellement urgente (risque réel de
// dégradation si non traité).
const P0_WORTHY_KINDS: CommercialEvent['kind'][] = [
  'POSITIVE_REPLY',
  'CALLBACK_REQUESTED',
  'QUOTE_REQUESTED',
]

export function computePriorite(
  input: ProspectInput,
  temperature: Temperature,
  readiness: boolean
): { priorite: Priorite; whyNow: string[] } {
  const whyNow: string[] = []

  // STOP : interdiction/décision globale forte uniquement.
  if (input.globalOppositionActive) {
    return { priorite: 'STOP', whyNow: ['Opposition globale entreprise active'] }
  }
  if (input.isLostDefinitive) {
    return { priorite: 'STOP', whyNow: ['Marqué perdu définitif'] }
  }

  // Client existant (GAGNE) : hors prospection froide, mais ce n'est
  // PAS une interdiction commerciale — on utilise P4 pour l'exclure des
  // flux de prospection sans le confondre avec une opposition/refus.
  if (input.isWon) {
    return { priorite: 'P4', whyNow: ['Client existant — hors prospection froide (upsell éventuel séparé)'] }
  }

  const last = lastEvent(input)

  // P0.7 — Action persistée (prospects_sales.next_action_*), source de
  // vérité pour les résultats d'appel qui ne produisent pas nécessairement
  // un CommercialEvent (ex. "pas de réponse" -> pas de signal prospect,
  // mais un rappel programmé bien réel). RÈGLE VERROUILLÉE : due seule ne
  // suffit JAMAIS — le type doit appartenir à NEXT_ACTION_URGENT_TYPES.
  // NURTURE/WAIT dus n'entrent JAMAIS ici, quelle que soit leur échéance —
  // c'est la NATURE de l'action, pas la date seule, qui détermine P0.
  const pna = input.persistedNextAction
  if (pna && pna.dueAt) {
    const hoursUntil = hoursBetween(input.now, pna.dueAt)
    if (hoursUntil <= 0 && NEXT_ACTION_URGENT_TYPES_ENGINE.has(pna.type)) {
      whyNow.push(pna.reason || 'Action programmée arrivée à échéance')
      return { priorite: 'P0', whyNow }
    }
  }

  // RDV imminent = P0 quelle que soit sa provenance (préparation nécessaire).
  const rdv = findLastOfKind(input, 'RDV_SCHEDULED')
  if (rdv && rdv.dueAt) {
    const hoursUntil = hoursBetween(input.now, rdv.dueAt)
    if (hoursUntil >= 0 && hoursUntil < 48) {
      whyNow.push(`RDV prévu dans moins de 48h (${Math.round(hoursUntil)}h) — préparation nécessaire`)
      return { priorite: 'P0', whyNow }
    }
    if (hoursUntil >= 48) {
      whyNow.push('RDV programmé, pas encore imminent')
      return { priorite: 'P1', whyNow }
    }
  }

  // Callback à échéance proche = P0 (nature intrinsèquement urgente + échéance proche)
  const callback = findLastOfKind(input, 'CALLBACK_REQUESTED')
  if (callback) {
    const dueRef = callback.dueAt || callback.occurredAt
    const hoursUntil = hoursBetween(input.now, dueRef)
    if (hoursUntil < 48) {
      whyNow.push('Rappel explicitement demandé, échéance proche')
      return { priorite: 'P0', whyNow }
    }
  }

  // Réponse positive ou devis demandé non encore traités = P0
  // (nature de l'événement intrinsèquement urgente ; on considère "non
  // traité" tant qu'aucun événement plus récent ne montre une prise en charge).
  if (last && last.originatedByProspect && P0_WORTHY_KINDS.includes(last.kind)) {
    whyNow.push(
      last.kind === 'QUOTE_REQUESTED'
        ? 'Devis explicitement demandé par le prospect'
        : last.kind === 'POSITIVE_REPLY'
        ? 'Réponse positive du prospect non encore traitée'
        : 'Rappel explicitement demandé'
    )
    return { priorite: 'P0', whyNow }
  }

  // Relance arrivée à échéance (proposition envoyée par MOJO, sans réponse
  // après délai) : la priorité redevient P2 (prospection/relance active),
  // jamais un signal de température.
  const pending = proposalPendingReply(input)
  const noReply = findLastOfKind(input, 'NO_REPLY_AFTER_DELAY')
  if (pending && noReply) {
    whyNow.push('Proposition envoyée, aucune réponse après le délai — relance nécessaire')
    return { priorite: 'P2', whyNow }
  }
  if (pending && !noReply) {
    whyNow.push('Proposition envoyée récemment, en attente de réponse')
    return { priorite: 'P3', whyNow }
  }

  // CHAUD sans échéance dure identifiée → P1.
  if (temperature === 'CHAUD') {
    whyNow.push('Signal chaud actif, sans échéance urgente identifiée')
    return { priorite: 'P1', whyNow }
  }

  // Non actionnable actuellement (pas de canal/angle) → P3, jamais STOP.
  if (!readiness) {
    whyNow.push('Non actionnable actuellement (contact ou angle manquant) — pas une exclusion définitive')
    return { priorite: 'P3', whyNow }
  }

  // FROID/TIÈDE, prospectable, potentiel déterminant la file.
  const potentiel = computePotentiel(input)
  if (potentiel === 'FAIBLE') {
    whyNow.push('Potentiel structurel faible')
    return { priorite: 'P4', whyNow }
  }
  whyNow.push(input.fitCible === 'CIBLE' ? 'Prospect CIBLE' : 'Fit à confirmer')
  if (input.preuveMetier) whyNow.push(`Preuve métier ${input.preuveMetier}`)
  whyNow.push('Contact autorisé disponible')
  whyNow.push('Aucun signal d\'intention récent')
  return { priorite: 'P2', whyNow }
}

// ── 5. SCORE SECONDAIRE (départage intra-priorité uniquement) ──
export function computeSecondaryScore(
  input: ProspectInput,
  readiness: boolean
): { score: number; breakdown: ScoreLine[] } {
  const lines: ScoreLine[] = []
  if (input.fitCible === 'CIBLE') lines.push({ label: 'fit CIBLE', delta: 3 })

  if (input.preuveMetier === 'CONFIRME') lines.push({ label: 'preuve CONFIRME', delta: 2 })
  else if (input.preuveMetier === 'PROBABLE') lines.push({ label: 'preuve PROBABLE', delta: 1 })

  const hasNominatif = input.contactMethods.some((c) => c.allowed && c.nominatif)
  const hasGeneric = input.contactMethods.some((c) => c.allowed && !c.nominatif)
  if (hasNominatif) lines.push({ label: 'contact nominatif exploitable', delta: 2 })
  else if (hasGeneric) lines.push({ label: 'contact entreprise générique exploitable', delta: 1 })

  if (input.proximiteLocale) lines.push({ label: 'proximité locale', delta: 1 })

  if (readiness) lines.push({ label: 'brief actionnable (readiness)', delta: 1 })

  const score = lines.reduce((s, l) => s + l.delta, 0)
  return { score, breakdown: lines }
}

// ── 6. SÉLECTION DU CONTACT ─────────────────────────────────────
// Ne jamais proposer un moyen opposé (ContactMethod.allowed=false exclu).
// Le canal du signal récent peut primer sur "nominatif > générique".
export function selectContact(input: ProspectInput): { contact: SelectedContact | null; warnings: string[] } {
  const warnings: string[] = []
  const allowed = input.contactMethods.filter((c) => c.allowed)
  if (allowed.length === 0) {
    return { contact: null, warnings: ['Aucun moyen de contact autorisé disponible'] }
  }

  // Le canal du dernier signal prospect prime si connu et disponible.
  const last = lastProspectEvent(input)
  const signalChannel = (last as any)?.signalChannel as ContactMethod['type'] | undefined
  if (signalChannel) {
    const matching = allowed.filter((c) => c.type === signalChannel)
    if (matching.length === 1) {
      const c = matching[0]
      return {
        contact: {
          personneId: c.personneId,
          contactMethodId: c.contactMethodId,
          type: c.type,
          value: c.value,
          nominatif: c.nominatif,
          reason: `Canal utilisé par le prospect lors de son dernier signal (${last!.kind})`,
        },
        warnings,
      }
    }
  }

  const nominatifs = allowed.filter((c) => c.nominatif)
  const distinctPersonnes = new Set(nominatifs.map((c) => c.personneId))

  if (distinctPersonnes.size === 1) {
    // Une seule personne, même si plusieurs moyens de contact (téléphone + email) :
    // aucune ambiguïté d'interlocuteur. Préférence par défaut : téléphone > email
    // à qualité égale (le canal du signal récent, géré plus haut, prime toujours).
    const preferred = nominatifs.find((c) => c.type === 'telephone') || nominatifs[0]
    return {
      contact: {
        personneId: preferred.personneId,
        contactMethodId: preferred.contactMethodId,
        type: preferred.type,
        value: preferred.value,
        nominatif: true,
        reason:
          nominatifs.length > 1
            ? 'Seul interlocuteur nominatif exploitable (plusieurs moyens de contact disponibles pour cette même personne)'
            : 'Seul contact nominatif exploitable',
      },
      warnings,
    }
  }
  if (distinctPersonnes.size > 1) {
    warnings.push(
      `${distinctPersonnes.size} personnes rattachées avec contact autorisé — interlocuteur à choisir avant l'appel`
    )
    return { contact: null, warnings }
  }

  const generic = allowed[0]
  return {
    contact: {
      contactMethodId: generic.contactMethodId,
      type: generic.type,
      value: generic.value,
      nominatif: false,
      reason: 'Contact entreprise générique (aucun contact nominatif disponible)',
    },
    warnings,
  }
}

// ── 7. NEXT BEST ACTION ─────────────────────────────────────────
export function computeNBA(
  input: ProspectInput,
  priorite: Priorite,
  readiness: boolean,
  selected: SelectedContact | null
): NextBestAction {
  if (priorite === 'STOP') {
    return { type: 'NO_ACTION', reason: 'STOP : opposition globale ou perdu définitif' }
  }
  if (input.isWon) {
    return { type: 'NO_ACTION', reason: 'Client existant — hors prospection froide' }
  }

  const rdv = findLastOfKind(input, 'RDV_SCHEDULED')
  if (rdv && priorite === 'P0') {
    return { type: 'PREPARE_RDV', dueAt: rdv.dueAt, reason: 'RDV imminent à préparer' }
  }

  const last = lastEvent(input)
  if (priorite === 'P0' && last?.originatedByProspect) {
    const preferredChannel = (last as any)?.signalChannel as ContactMethod['type'] | undefined
    if (preferredChannel === 'email' && selected?.type === 'email') {
      return { type: 'EMAIL', reason: `Le prospect a signalé via email (${last.kind}) — répondre sur le même canal` }
    }
    if (selected?.type === 'telephone') {
      return { type: 'CALL', reason: `Signal fort du prospect (${last.kind}) — action immédiate` }
    }
    if (selected?.type === 'email') {
      return { type: 'EMAIL', reason: `Signal fort du prospect (${last.kind}), seul canal email disponible` }
    }
  }

  const pending = proposalPendingReply(input)
  const noReply = findLastOfKind(input, 'NO_REPLY_AFTER_DELAY')
  if (pending && noReply) {
    return { type: 'FOLLOW_UP', reason: 'Proposition envoyée, relance après absence de réponse' }
  }
  if (pending && !noReply) {
    return { type: 'WAIT', reason: 'Proposition envoyée récemment, en attente de réponse' }
  }

  if (!readiness) {
    const hasAnyContact = input.contactMethods.some((c) => c.allowed)
    return hasAnyContact
      ? { type: 'QUALIFY', reason: "Contact disponible mais angle insuffisant — qualifier avant d'agir" }
      : { type: 'NO_ACTION_TEMPORAIRE', reason: 'Aucun canal exploitable actuellement — non actionnable, pas définitif' }
  }

  if (!selected) {
    return { type: 'QUALIFY', reason: 'Plusieurs interlocuteurs possibles — choisir avant d\'appeler' }
  }

  if (priorite === 'P1' || priorite === 'P2') {
    return selected.type === 'telephone'
      ? { type: 'CALL', reason: 'Contact autorisé disponible, aucune urgence particulière' }
      : { type: 'EMAIL', reason: 'Seul canal email disponible' }
  }

  if (priorite === 'P3') {
    return { type: 'NURTURE', reason: 'Potentiel correct, aucun signal — nurturing bas rythme' }
  }

  return { type: 'NURTURE', reason: 'Faible priorité' }
}

// ── ORCHESTRATEUR PUR ────────────────────────────────────────────
export function evaluateProspect(input: ProspectInput): CommercialPriorityResult {
  const warnings: string[] = []

  const potentiel = computePotentiel(input)
  const temperature = computeTemperature(input)
  const contactable = input.contactMethods.some((c) => c.allowed)
  const { readiness, reason: readinessReason } = computeReadiness(input)
  const { priorite, whyNow } = computePriorite(input, temperature, readiness)
  const { score, breakdown } = computeSecondaryScore(input, readiness)
  const { contact: selectedContact, warnings: contactWarnings } = selectContact(input)
  warnings.push(...contactWarnings)

  if (readiness) whyNow.unshift(readinessReason)

  const nextBestAction = computeNBA(input, priorite, readiness, selectedContact)

  if (!input.preuveMetier) warnings.push('Aucune preuve métier disponible')
  if (input.contactMethods.length === 0) warnings.push('Aucun moyen de contact connu pour cette entreprise')

  return {
    companyId: input.companyId,
    companyName: input.companyName,
    potentiel,
    temperature,
    contactable,
    readiness,
    priorite,
    secondaryScore: score,
    scoreBreakdown: breakdown,
    nextBestAction,
    selectedContact,
    whyNow,
    warnings,
  }
}
