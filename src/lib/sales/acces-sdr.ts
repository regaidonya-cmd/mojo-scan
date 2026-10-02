import { createClient } from '@supabase/supabase-js'
import { recupererProfilCourant, estAdminActif, estSdrActif } from './auth-session'
import type { Profil } from './auth-session'

// ══════════════════════════════════════════════════════════════
// MOJO SALES — SDR / PR3 — Autorisation CENTRALE des pages/routes SDR.
//
// Identité = session Supabase Auth + profil relu en base (PR2,
// recupererProfilCourant). Le cookie legacy admin_auth n'est JAMAIS
// accepté ici : il ne porte aucune identité, donc aucun portefeuille.
//
//   ADMIN actif -> accès global (tous les prospects)
//   SDR actif   -> uniquement prospects_sales.assigned_to = user_id
//   sinon       -> non autorisé
//
// Un prospect hors portefeuille (ou inexistant) renvoie INTROUVABLE
// (404) : on ne révèle jamais l'existence d'un prospect d'un autre SDR.
// Le contrôle est fait côté serveur, sur la valeur EN BASE de
// assigned_to — jamais sur une valeur fournie par le navigateur.
// ══════════════════════════════════════════════════════════════

export type AccesSales =
  | { statut: 'AUTORISE'; profil: Profil; perimetre: 'GLOBAL' | 'PORTEFEUILLE' }
  | { statut: 'NON_AUTORISE' }

export type AccesProspect =
  | { statut: 'AUTORISE'; profil: Profil }
  | { statut: 'INTROUVABLE' }
  | { statut: 'NON_AUTORISE' }

export interface AffectationProspect {
  existe: boolean
  assignedTo: string | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function estUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

/** Fonction PURE — qui peut entrer dans l'espace commercial (pages SDR). */
export function deciderAccesSales(profil: Profil | null): AccesSales {
  if (estAdminActif(profil)) return { statut: 'AUTORISE', profil: profil!, perimetre: 'GLOBAL' }
  if (estSdrActif(profil)) return { statut: 'AUTORISE', profil: profil!, perimetre: 'PORTEFEUILLE' }
  return { statut: 'NON_AUTORISE' }
}

/** Fonction PURE — décision d'accès à UN prospect, à partir de
 * l'affectation lue EN BASE (null = prospect inexistant). */
export function deciderAccesProspect(profil: Profil | null, affectation: AffectationProspect | null): AccesProspect {
  const acces = deciderAccesSales(profil)
  if (acces.statut !== 'AUTORISE') return { statut: 'NON_AUTORISE' }
  if (!affectation || !affectation.existe) return { statut: 'INTROUVABLE' }
  if (acces.perimetre === 'GLOBAL') return { statut: 'AUTORISE', profil: acces.profil }
  return affectation.assignedTo === acces.profil.userId
    ? { statut: 'AUTORISE', profil: acces.profil }
    : { statut: 'INTROUVABLE' }
}

/** Fonction PURE — filtre assigned_to à appliquer DANS la requête de
 * liste : undefined = aucun filtre (ADMIN), sinon user_id du SDR. */
export function filtreAffectation(acces: AccesSales): string | undefined {
  if (acces.statut !== 'AUTORISE') throw new Error('filtreAffectation appelé sans accès autorisé')
  return acces.perimetre === 'GLOBAL' ? undefined : acces.profil.userId
}

export function clientServiceRole() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Lit l'affectation réelle en base. Retourne null si companyId invalide
 * ou si la lecture échoue (=> traité comme INTROUVABLE, jamais autorisé). */
export async function lireAffectationProspect(companyId: string, client: any = null): Promise<AffectationProspect | null> {
  if (!estUuid(companyId)) return null
  const supabase = client ?? clientServiceRole()
  const { data, error } = await supabase
    .from('prospects_sales')
    .select('company_id, assigned_to')
    .eq('company_id', companyId)
    .maybeSingle()
  if (error) return null
  return data ? { existe: true, assignedTo: data.assigned_to ?? null } : { existe: false, assignedTo: null }
}

/** Point d'entrée pages/routes SDR : profil courant (session + profiles). */
export async function exigerAccesSales(): Promise<AccesSales> {
  return deciderAccesSales(await recupererProfilCourant())
}

/** Point d'entrée fiche/route d'un prospect : session + profil + affectation. */
export async function autoriserAccesProspect(companyId: string): Promise<AccesProspect> {
  const profil = await recupererProfilCourant()
  if (deciderAccesSales(profil).statut !== 'AUTORISE') return { statut: 'NON_AUTORISE' }
  return deciderAccesProspect(profil, await lireAffectationProspect(companyId))
}

/** Nombre de prospects affectés à un utilisateur (fallback /sdr/attente). */
export async function compterPortefeuille(userId: string, client: any = null): Promise<number> {
  const supabase = client ?? clientServiceRole()
  const { count, error } = await supabase
    .from('prospects_sales')
    .select('company_id', { count: 'exact', head: true })
    .eq('assigned_to', userId)
  if (error) return 0
  return count ?? 0
}
