import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { lireLotDepuisDB } from '@/lib/enrichissement/lecture-lot-sdr'
import { enrichirBatchAvecReprise } from '@/lib/enrichissement/orchestrateur-reprise'
import { supabasePersistanceClient } from '@/lib/enrichissement/persistance'
import { construireRapportPostLot } from '@/lib/enrichissement/rapport-post-lot'
import { compterTelephonesFiables } from '@/lib/enrichissement/compteur-objectif-sdr'

function getToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

const LOT_CODE = 'VSG_SDR_ENRICH_01'
const SOURCE = 'GOOGLE_PLACES'
const MAX_TEXT_SEARCH = 50
const MAX_PLACE_DETAILS = 50
const OBJECTIF_SDR = 100

async function fetchPageSimple(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

// ══════════════════════════════════════════════════════════════
// SDR.VSG.5 — Enrichissement Google du lot VSG_SDR_ENRICH_01.
// Source OBLIGATOIRE : enrichissement_resultats (jamais une constante
// TS). Réutilise intégralement enrichirBatchAvecReprise (VSG.6B) et
// supabasePersistanceClient (ENRICH.VSG.6) — aucun second moteur créé.
// ══════════════════════════════════════════════════════════════
export async function POST() {
  const cookieStore = cookies()
  if (cookieStore.get('admin_auth')?.value !== getToken()) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY absente — aucun appel effectué' }, { status: 500 })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Lecture OBLIGATOIRE depuis la DB — jamais une liste codée en dur.
  const { membres, lignesExclues } = await lireLotDepuisDB(supabase, LOT_CODE)

  const resultat = await enrichirBatchAvecReprise(
    membres, SOURCE, supabasePersistanceClient(), fetchPageSimple,
    MAX_TEXT_SEARCH, MAX_PLACE_DETAILS
  )

  // Relecture post-exécution pour construire le rapport (jamais déduit en mémoire).
  const { data: lignesFinales } = await supabase
    .from('enrichissement_resultats')
    .select('siren, company_id, famille_metier, statut, telephone, site_web, erreur')
    .eq('lot_code', LOT_CODE)

  const rapportLot = construireRapportPostLot(
    (lignesFinales ?? []).map((l: any) => ({
      siren: l.siren, companyId: l.company_id, familleMetier: l.famille_metier,
      statut: l.statut, telephone: l.telephone, siteWeb: l.site_web, erreur: l.erreur,
    }))
  )

  // Compteur global (tous lots confondus) — recalculé après ce lot.
  const { data: tousLesTelephones } = await supabase
    .from('enrichissement_resultats')
    .select('siren, company_id, telephone, statut')
    .not('telephone', 'is', null)
    .in('statut', ['MATCH_FORT', 'MATCH_PROBABLE'])
  const compteurGlobal = compterTelephonesFiables(
    (tousLesTelephones ?? []).map((l: any) => ({ companyId: l.company_id, siren: l.siren, telephone: l.telephone, statut: l.statut })),
    OBJECTIF_SDR
  )

  return NextResponse.json({
    statutGlobal: resultat.statutGlobal,
    textSearchCalls: resultat.nbTextSearch, placeDetailsCalls: resultat.nbPlaceDetails,
    lignesExclues,
    rapportLot,
    compteurGlobal: { fiables: compteurGlobal.fiables, aVerifier: compteurGlobal.aVerifier, manquants: compteurGlobal.manquants },
  })
}
