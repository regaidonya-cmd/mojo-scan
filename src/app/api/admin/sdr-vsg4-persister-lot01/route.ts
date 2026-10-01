import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { MEMBRES_VSG_SDR_ENRICH_01 } from '@/lib/enrichissement/donnees-lot-sdr-vsg-enrich-01'
import { persisterLotSdr } from '@/lib/enrichissement/persister-lot-sdr'
import { creerPersistanceImportSupabase } from '@/lib/enrichissement/persistance-import-supabase'
import { creerPersistanceLotSdrSupabase } from '@/lib/enrichissement/persistance-lot-sdr-supabase'

function getToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

const LOT_CODE = 'VSG_SDR_ENRICH_01'
const SOURCE_CODE = 'SIRENE_SDR_VSG'

// ══════════════════════════════════════════════════════════════
// SDR.VSG.4 — PERSISTANCE UNIQUEMENT. Aucun appel Google, aucune écriture
// prospects_sales, aucune température/NBA. Rend le lot VSG_SDR_ENRICH_01
// immuable et relisible, pour une exécution Google future séparée.
// ══════════════════════════════════════════════════════════════
export async function POST() {
  const cookieStore = cookies()
  if (cookieStore.get('admin_auth')?.value !== getToken()) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const rapport = await persisterLotSdr(
    LOT_CODE, MEMBRES_VSG_SDR_ENRICH_01, SOURCE_CODE,
    creerPersistanceImportSupabase(supabase), creerPersistanceLotSdrSupabase(supabase)
  )

  return NextResponse.json(rapport)
}
