import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { membresDuLot } from '@/lib/enrichissement/registre-lots-sdr'
import { persisterLotSdr } from '@/lib/enrichissement/persister-lot-sdr'
import { creerPersistanceImportSupabase } from '@/lib/enrichissement/persistance-import-supabase'
import { creerPersistanceLotSdrSupabase } from '@/lib/enrichissement/persistance-lot-sdr-supabase'

function getToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

const LOT_CODE_DEFAUT = 'VSG_SDR_ENRICH_01' // comportement inchangé si aucun lotCode fourni (non-breaking)
const SOURCE_CODE = 'SIRENE_SDR_VSG'

// ══════════════════════════════════════════════════════════════
// SDR.VSG.4 — PERSISTANCE UNIQUEMENT. Aucun appel Google, aucune écriture
// prospects_sales, aucune température/NBA. Rend le lot immuable et
// relisible, pour une exécution Google future séparée.
//
// GÉNÉRALISATION (lot paramétrable, sécurisée) : lotCode est lu depuis le
// corps de la requête, mais JAMAIS utilisé tel quel — il doit correspondre
// exactement à une entrée du registre serveur (registre-lots-sdr.ts).
// Un lot_code inconnu est refusé (400), jamais traité silencieusement.
// La persistance elle-même reste idempotente (persisterLotSdr, inchangé) :
// relancer cet appel sur un lot déjà persisté ne crée ni ne modifie rien.
// ══════════════════════════════════════════════════════════════
export async function POST(request: Request) {
  const cookieStore = cookies()
  if (cookieStore.get('admin_auth')?.value !== getToken()) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  let lotCode = LOT_CODE_DEFAUT
  try {
    const body = await request.json()
    if (body?.lotCode) lotCode = String(body.lotCode)
  } catch {
    // Pas de corps JSON fourni -> comportement par défaut (lot 01), non-breaking.
  }

  const membres = membresDuLot(lotCode)
  if (!membres) {
    return NextResponse.json({ error: `lot_code inconnu du registre serveur: "${lotCode}" — refusé` }, { status: 400 })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const rapport = await persisterLotSdr(
    lotCode, membres, SOURCE_CODE,
    creerPersistanceImportSupabase(supabase), creerPersistanceLotSdrSupabase(supabase)
  )

  return NextResponse.json(rapport)
}
