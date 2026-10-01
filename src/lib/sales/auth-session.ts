import { cookies } from 'next/headers'
import crypto from 'crypto'
import { creerClientSupabaseServeur } from '@/lib/supabase/server'

// ══════════════════════════════════════════════════════════════
// MOJO SALES — SDR / PR2 — Helper d'autorisation CENTRALISÉ.
//
// Remplace les ~17 vérifications dupliquées de admin_auth par UN SEUL
// point de vérité, testé, réutilisé partout. L'ancien mécanisme
// admin_auth est CONSERVÉ EN PARALLÈLE (filet de sécurité explicite
// demandé) — jamais supprimé dans cette PR.
//
// Règle d'or : authentification ≠ autorisation. Le rôle est TOUJOURS
// relu depuis `profiles` côté serveur via la session Supabase Auth —
// jamais fait confiance à une valeur envoyée par le navigateur.
// ══════════════════════════════════════════════════════════════

export interface Profil {
  userId: string
  nom: string
  role: 'ADMIN' | 'SDR'
  actif: boolean
}

/** Valeur du cookie admin_auth attendue — IDENTIQUE à l'ancien mécanisme,
 * recopiée ici une seule fois (au lieu de dupliquée dans 17 fichiers). */
export function tokenAdminAuthAttendu(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

/** true si le cookie admin_auth (ancien mécanisme) est valide — comportement
 * STRICTEMENT identique à l'existant, jamais modifié. */
export function adminAuthCookieValide(): boolean {
  const cookieStore = cookies()
  return cookieStore.get('admin_auth')?.value === tokenAdminAuthAttendu()
}

/** Récupère l'utilisateur Supabase Auth courant + son profil (role/actif),
 * en relisant TOUJOURS depuis la base via la session — jamais une valeur
 * client. Retourne null si non authentifié ou profil absent. */
export async function recupererProfilCourant(): Promise<Profil | null> {
  const supabase = creerClientSupabaseServeur()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // RLS garantit que cette requête ne peut lire QUE le profil de
  // l'utilisateur authentifié courant (policy profiles_select_own).
  const { data: profil, error } = await supabase
    .from('profiles')
    .select('user_id, nom, role, actif')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !profil) return null
  if (profil.role !== 'ADMIN' && profil.role !== 'SDR') return null // jamais une valeur inattendue

  return { userId: profil.user_id, nom: profil.nom, role: profil.role, actif: profil.actif }
}

/** true si le profil est un ADMIN actif. Fonction PURE — testable sans DB. */
export function estAdminActif(profil: Profil | null): boolean {
  return !!profil && profil.role === 'ADMIN' && profil.actif === true
}

/** true si le profil est un SDR actif. Fonction PURE — testable sans DB. */
export function estSdrActif(profil: Profil | null): boolean {
  return !!profil && profil.role === 'SDR' && profil.actif === true
}

/**
 * estAutoriseAdmin — point de vérité UNIQUE pour toute route/page admin.
 * Autorisé si : (a) ancien cookie admin_auth valide (filet de sécurité,
 * conservé), OU (b) session Supabase Auth avec profil ADMIN actif.
 * Un SDR authentifié (même avec une session Supabase valide) n'est
 * JAMAIS autorisé par cette fonction — seul (a) ou (b) avec rôle ADMIN
 * suffisent.
 */
export async function estAutoriseAdmin(): Promise<boolean> {
  if (adminAuthCookieValide()) return true
  const profil = await recupererProfilCourant()
  return estAdminActif(profil)
}
