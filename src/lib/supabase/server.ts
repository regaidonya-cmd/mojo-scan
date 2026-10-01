import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ══════════════════════════════════════════════════════════════
// Client Supabase SERVEUR pour Supabase Auth (session utilisateur,
// jamais service_role). Utilise la clé publique (anon) — l'identité de
// l'utilisateur vient de sa session, jamais d'un secret serveur.
// SUPABASE_SERVICE_ROLE_KEY n'est JAMAIS utilisée ici.
// ══════════════════════════════════════════════════════════════
export function creerClientSupabaseServeur() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try { cookieStore.set({ name, value, ...options }) } catch { /* appelé depuis un Server Component, lecture seule — sans effet, normal */ }
        },
        remove(name: string, options: any) {
          try { cookieStore.set({ name, value: '', ...options }) } catch { /* idem */ }
        },
      },
    }
  )
}
