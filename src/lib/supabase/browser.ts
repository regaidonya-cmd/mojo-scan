import { createBrowserClient } from '@supabase/ssr'

// ══════════════════════════════════════════════════════════════
// Client Supabase NAVIGATEUR — clé publique (anon) uniquement.
// SUPABASE_SERVICE_ROLE_KEY ne doit JAMAIS apparaître ici ni dans
// aucune variable NEXT_PUBLIC_* (vérifié par test structurel).
// ══════════════════════════════════════════════════════════════
export function creerClientSupabaseNavigateur() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
