import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { enrichirBatchAvecReprise } from '@/lib/enrichissement/orchestrateur-reprise'
import { supabasePersistanceClient } from '@/lib/enrichissement/persistance'
import { BAT_50 } from '@/lib/enrichissement/bat-50-vsg'

function getToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

// ══════════════════════════════════════════════════════════════
// ENRICH.VSG.6 + VSG.6B — BAT 50 avec reprise par étape et hard-stops
// applicatifs explicites. Jeu figé (BAT_50, codé en dur), jamais lu
// depuis le body HTTP. Les 10 DEJA_ENRICHI restent exclues en amont
// (bat-50-vsg.ts, Option A — jamais insérées dans enrichissement_resultats).
//
// Limites FOURNIES EXPLICITEMENT par cette route (jamais un défaut
// implicite lié à MAX_COMPANIES de l'ancien POC) — exactement le nombre
// de A_INTERROGER (40), sous le plafond quotidien Google (50).
// ══════════════════════════════════════════════════════════════
const LOT_CODE = 'VSG_BAT50'
const SOURCE = 'GOOGLE_PLACES'
const MAX_TEXT_SEARCH_BAT50 = 40
const MAX_PLACE_DETAILS_BAT50 = 40

async function fetchPageSimple(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

export async function POST() {
  const cookieStore = cookies()
  if (cookieStore.get('admin_auth')?.value !== getToken()) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY absente — aucun appel effectué' }, { status: 500 })
  }

  const dejaEnrichi = BAT_50.filter((e) => e.statut === 'DEJA_ENRICHI')
  const aInterroger = BAT_50.filter((e) => e.statut === 'A_INTERROGER').map((e) => ({ ...e, lotCode: LOT_CODE }))

  try {
    const resultat = await enrichirBatchAvecReprise(
      aInterroger, SOURCE, supabasePersistanceClient(), fetchPageSimple,
      MAX_TEXT_SEARCH_BAT50, MAX_PLACE_DETAILS_BAT50
    )

    return NextResponse.json({
      statutGlobal: resultat.statutGlobal, // 'TERMINE' | 'PARTIEL_QUOTA_ATTEINT'
      traites: resultat.traites,
      restants: resultat.restants,
      sirenRestants: resultat.sirenRestants,
      textSearchCalls: resultat.nbTextSearch,
      placeDetailsCalls: resultat.nbPlaceDetails,
      nombreDejaEnrichi: dejaEnrichi.length,
      nombreAInterroger: aInterroger.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message?.includes('API_KEY') ? 'Erreur de configuration (clé)' : e.message }, { status: 500 })
  }
}
