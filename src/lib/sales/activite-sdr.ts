import {
  computeConsequence, isResultatValide, isOppositionScopeValide, isValidFutureIsoDate,
  type ResultatAppel, type OppositionScope,
} from '@/lib/priority/activite-consequence'
import { deciderAccesSales, deciderAccesProspect, estUuid, type AffectationProspect } from './acces-sdr'
import type { Profil } from './auth-session'

// ══════════════════════════════════════════════════════════════
// MOJO SALES — SDR / PR3 — Enregistrement d'un résultat d'appel SDR.
//
// Ordre OBLIGATOIRE (chaque étape bloque les suivantes) :
//   1. session utilisateur            -> 401
//   2. profil actif (ADMIN|SDR)       -> 401
//   3. contrôle assigned_to (base)    -> 404 (existence jamais révélée)
//   4. personneId ∈ companyId         -> 400
//   5. moyenContactId ∈ companyId     -> 400 (entreprise, une de ses
//                                         personnes ou établissements)
//   6. validation activite-consequence (identique route ADMIN)
//   7. RPC p07_enregistrer_resultat_appel EXISTANTE (PR1, non modifiée)
//   8. besoin identifié : uniquement si nouvelle activité
//      (deja_existant=false) -> un rejeu idempotent n'écrit jamais rien.
//
// Les dépendances (session, base) sont injectées : la logique est
// testée sans réseau, et la route n'est qu'un adaptateur fin.
// ══════════════════════════════════════════════════════════════

export const NOTES_MAX = 4000
export const BESOIN_MAX = 2000

export interface ParamsRpcResultatAppel {
  p_company_id: string
  p_personne_id: string | null
  p_moyen_contact_id: string | null
  p_opposition_scope: OppositionScope | null
  p_resultat: ResultatAppel
  p_idempotency_key: string
  p_description: string
  p_temperature: string | null
  p_pipeline_stage: string | null
  p_next_action_type: string
  p_next_action_due_at: string | null
  p_next_action_reason: string
  p_source_id: null
}

export interface DepsActiviteSdr {
  profilCourant(): Promise<Profil | null>
  lireAffectation(companyId: string): Promise<AffectationProspect | null>
  personneAppartient(personneId: string, companyId: string): Promise<boolean>
  moyenAppartient(moyenContactId: string, companyId: string): Promise<boolean>
  appelerRpc(params: ParamsRpcResultatAppel): Promise<{ data: any; error: { message: string } | null }>
  enregistrerBesoin(companyId: string, besoin: string, restreindreA: string | null): Promise<{ error: { message: string } | null }>
  now(): string
}

export interface ReponseActivite {
  status: number
  body: Record<string, any>
}

function texteOptionnel(v: unknown): string | null | undefined {
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'string') return null // type invalide
  return v
}

export async function traiterActiviteSdr(deps: DepsActiviteSdr, companyId: string, body: any): Promise<ReponseActivite> {
  // 1 + 2. Session + profil actif (jamais le cookie admin_auth).
  const profil = await deps.profilCourant()
  const acces = deciderAccesSales(profil)
  if (acces.statut !== 'AUTORISE') return { status: 401, body: { error: 'unauthorized' } }

  // 3. Affectation lue en base.
  const affectation = estUuid(companyId) ? await deps.lireAffectation(companyId) : null
  const accesProspect = deciderAccesProspect(profil, affectation)
  if (accesProspect.statut !== 'AUTORISE') return { status: 404, body: { error: 'not_found' } }

  const b = body ?? {}
  const {
    resultat, idempotencyKey, personneId, moyenContactId,
    dateRappelSaisie, dateRdvSaisie, dateProchaineActionSaisie, oppositionScope,
  } = b

  // 4. personneId éventuel : doit appartenir à CETTE entreprise.
  if (personneId !== undefined && personneId !== null) {
    if (!estUuid(personneId) || !(await deps.personneAppartient(personneId, companyId))) {
      return { status: 400, body: { error: 'personneId invalide pour ce prospect' } }
    }
  }
  // 5. moyenContactId éventuel : rattaché à l'entreprise ou à une de ses personnes.
  if (moyenContactId !== undefined && moyenContactId !== null) {
    if (!estUuid(moyenContactId) || !(await deps.moyenAppartient(moyenContactId, companyId))) {
      return { status: 400, body: { error: 'moyenContactId invalide pour ce prospect' } }
    }
  }

  // 6. Validation (même liste fermée et mêmes règles que la route ADMIN).
  const now = deps.now()
  if (!isResultatValide(resultat)) {
    return { status: 400, body: { error: `resultat invalide : ${resultat}` } }
  }
  if (oppositionScope !== undefined && !isOppositionScopeValide(oppositionScope)) {
    return { status: 400, body: { error: `oppositionScope invalide : ${oppositionScope}` } }
  }
  for (const [label, val] of [
    ['dateRappelSaisie', dateRappelSaisie],
    ['dateRdvSaisie', dateRdvSaisie],
    ['dateProchaineActionSaisie', dateProchaineActionSaisie],
  ] as const) {
    if (val !== undefined && (typeof val !== 'string' || !isValidFutureIsoDate(val, now))) {
      return { status: 400, body: { error: `${label} invalide ou trop dans le passé : ${val}` } }
    }
  }
  if (typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
    return { status: 400, body: { error: 'idempotencyKey requise' } }
  }
  if (resultat === 'DEMANDE_NE_PLUS_CONTACTER') {
    if (!oppositionScope) return { status: 400, body: { error: 'oppositionScope requis pour DEMANDE_NE_PLUS_CONTACTER' } }
    if (oppositionScope === 'PERSONNE' && !personneId) return { status: 400, body: { error: 'personneId requis pour une opposition PERSONNE' } }
    if (oppositionScope === 'MOYEN' && !moyenContactId) return { status: 400, body: { error: 'moyenContactId requis pour une opposition MOYEN' } }
  }

  const notes = texteOptionnel(b.notes)
  const besoin = texteOptionnel(b.besoinIdentifie)
  if (notes === null || besoin === null) return { status: 400, body: { error: 'notes/besoinIdentifie doivent être du texte' } }
  if ((notes ?? '').length > NOTES_MAX) return { status: 400, body: { error: `notes trop longues (max ${NOTES_MAX})` } }
  if ((besoin ?? '').length > BESOIN_MAX) return { status: 400, body: { error: `besoin identifié trop long (max ${BESOIN_MAX})` } }

  let consequence
  try {
    consequence = computeConsequence({
      resultat, now, dateRappelSaisie, dateRdvSaisie, dateProchaineActionSaisie, oppositionScope,
    })
  } catch (e: any) {
    return { status: 400, body: { error: e.message } }
  }

  // 7. RPC existante (PR1) — notes d'appel = activites.description.
  const { data, error } = await deps.appelerRpc({
    p_company_id: companyId,
    p_personne_id: personneId ?? null,
    p_moyen_contact_id: moyenContactId ?? null,
    p_opposition_scope: consequence.oppositionScope,
    p_resultat: resultat,
    p_idempotency_key: idempotencyKey,
    p_description: (notes ?? '').trim(),
    p_temperature: consequence.temperature,
    p_pipeline_stage: consequence.pipelineStage,
    p_next_action_type: consequence.nextActionType,
    p_next_action_due_at: consequence.nextActionDueAt,
    p_next_action_reason: consequence.nextActionReason,
    p_source_id: null,
  })
  if (error) return { status: 500, body: { error: error.message } }

  // 8. Besoin identifié : jamais sur un rejeu idempotent, jamais vide.
  const besoinNettoye = (besoin ?? '').trim()
  let besoinEnregistre = false
  if (besoinNettoye && data?.deja_existant !== true) {
    const restreindreA = profil!.role === 'SDR' ? profil!.userId : null
    const res = await deps.enregistrerBesoin(companyId, besoinNettoye, restreindreA)
    if (res.error) {
      return { status: 500, body: { error: `Résultat enregistré, mais besoin non enregistré : ${res.error.message}`, result: data } }
    }
    besoinEnregistre = true
  }

  return { status: 200, body: { ok: true, consequence, result: data, besoinEnregistre } }
}
