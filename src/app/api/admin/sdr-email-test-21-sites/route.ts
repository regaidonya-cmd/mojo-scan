import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { executerExtractionEmailSdr } from '@/lib/enrichissement/orchestrateur-email-sdr'

function getToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

// ══════════════════════════════════════════════════════════════
// ÉTAPE 1 — Test de la brique email sur les sites réels déjà obtenus.
// READ-ONLY sur enrichissement_resultats, AUCUNE écriture nulle part
// (ni personnes_moyens_contact, ni prospects_sales). Jamais appelée
// pendant cette phase de développement — nécessite un GO séparé.
// ══════════════════════════════════════════════════════════════
export async function POST() {
  const cookieStore = cookies()
  if (cookieStore.get('admin_auth')?.value !== getToken()) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: lignes, error } = await supabase
    .from('enrichissement_resultats')
    .select('company_id, siren, site_web')
    .not('site_web', 'is', null)
    .not('company_id', 'is', null)

  if (error) return NextResponse.json({ error: `Lecture enrichissement_resultats: ${error.message}` }, { status: 500 })

  const sites = (lignes ?? []).map((l: any) => ({ companyId: l.company_id, siren: l.siren, siteWeb: l.site_web }))
  const rapport = await executerExtractionEmailSdr(sites)

  return NextResponse.json(rapport)
}
