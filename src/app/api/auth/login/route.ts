import { NextRequest, NextResponse } from 'next/server'
import { creerClientSupabaseServeur } from '@/lib/supabase/server'
import { estAdminActif, estSdrActif, recupererProfilCourant } from '@/lib/sales/auth-session'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const email = formData.get('email')?.toString() ?? ''
  const password = formData.get('password')?.toString() ?? ''

  const supabase = creerClientSupabaseServeur()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.redirect(new URL('/connexion?error=1', req.url))
  }

  // Le rôle est TOUJOURS relu depuis profiles côté serveur, jamais
  // déduit d'une donnée fournie par le formulaire/navigateur.
  const profil = await recupererProfilCourant()

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
