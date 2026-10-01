import { NextRequest, NextResponse } from 'next/server'
import { creerClientSupabaseServeur } from '@/lib/supabase/server'
import { estAdminActif, estSdrActif } from '@/lib/sales/auth-session'
import type { Profil } from '@/lib/sales/auth-session'

// ══════════════════════════════════════════════════════════════
// PR2 FIX — BUG BAT PRODUCTION corrigé : recupererProfilCourant()
// recréait un NOUVEAU client Supabase qui tentait de relire la session
// via cookies() — mais dans un Route Handler Next.js, cookies() en
// lecture reflète la requête ENTRANTE, jamais les écritures faites
// pendant le traitement de cette même requête. Résultat : getUser()
// trouvait toujours user=null juste après signInWithPassword().
//
// Correctif : on réutilise le MÊME client déjà authentifié en mémoire
// par signInWithPassword() (jamais besoin de relire les cookies pour
// connaître sa propre session) et son data.user.id directement retourné
// — jamais une nouvelle instance, jamais un rôle fourni par le
// navigateur. La lecture de profiles reste soumise à la RLS de la
// session de CET utilisateur (jamais service_role).
// ══════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const email = formData.get('email')?.toString() ?? ''
  const password = formData.get('password')?.toString() ?? ''

  const supabase = creerClientSupabaseServeur()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return NextResponse.redirect(new URL('/connexion?error=1', req.url))
  }

  // Même client (déjà authentifié par le signIn ci-dessus), même
  // session — la RLS profiles_select_own s'applique normalement.
  const { data: ligneProfil, error: erreurProfil } = await supabase
    .from('profiles')
    .select('user_id, nom, role, actif')
    .eq('user_id', data.user.id)
    .maybeSingle()

  const profil: Profil | null = (!erreurProfil && ligneProfil && (ligneProfil.role === 'ADMIN' || ligneProfil.role === 'SDR'))
    ? { userId: ligneProfil.user_id, nom: ligneProfil.nom, role: ligneProfil.role, actif: ligneProfil.actif }
    : null

  if (estAdminActif(profil)) {
    return NextResponse.redirect(new URL('/admin', req.url))
  }
  if (estSdrActif(profil)) {
    return NextResponse.redirect(new URL('/sdr/attente', req.url))
  }

  // Profil absent ou inactif -> accès refusé proprement, déconnexion immédiate.
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/connexion?error=inactif', req.url))
}
