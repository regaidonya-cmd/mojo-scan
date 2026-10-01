import { NextRequest, NextResponse } from 'next/server'
import { creerClientSupabaseServeur } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = creerClientSupabaseServeur()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/connexion', req.url))
}
