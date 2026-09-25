import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { enrichirBatch } from '@/lib/enrichissement/orchestrateur'
import { BAT_50 } from '@/lib/enrichissement/bat-50-vsg'

function getToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

// ══════════════════════════════════════════════════════════════
// ENRICH.VSG.5B — BAT 50. Jeu figé (BAT_50, codé en dur dans
// bat-50-vsg.ts), jamais lu depuis le body HTTP. Les 10 DEJA_ENRICHI sont
// filtrées AVANT tout appel — enrichirBatch() n'est appelé QUE sur les
// A_INTERROGER (40 max), sous le plafond quotidien Google (50).
// ══════════════════════════════════════════════════════════════
const LIMITE_TEXT_SEARCH_BAT50 = 40 // = nombre exact de A_INTERROGER, sous le plafond Google 50/jour
const LIMITE_PLACE_DETAILS_BAT50 = 40
const LIMITE_COMPANIES_BAT50 = 40 // = uniquement les A_INTERROGER transmises à enrichirBatch

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
  const aInterroger = BAT_50.filter((e) => e.statut === 'A_INTERROGER')

  try {
    const { fiches, nbTextSearch, nbPlaceDetails } = await enrichirBatch(
      aInterroger, fetchPageSimple, undefined,
      LIMITE_COMPANIES_BAT50, LIMITE_TEXT_SEARCH_BAT50, LIMITE_PLACE_DETAILS_BAT50
    )

    const resultatsNouveaux = fiches.map((f) => ({
      siren: f.reference.siren, entreprise: f.reference.raisonSociale,
      secteur: (BAT_50.find((b) => b.siren === f.reference.siren) as any)?.secteur ?? null,
      statut: 'A_INTERROGER',
      matching: f.matchGoogle.statut, score: f.matchGoogle.score,
      candidatsExamines: f.matchGoogle.candidatsExamines,
      placeId: f.placeIdGoogle, telephone: f.telephone?.valeur ?? null, site: f.siteWeb?.valeur ?? null, email: f.email?.valeur ?? null,
      contactabilite: f.contactabilite,
    }))

    const resultatsDejaEnrichis = dejaEnrichi.map((e) => ({
      siren: e.siren, entreprise: e.raisonSociale, secteur: e.secteur, statut: 'DEJA_ENRICHI',
      matching: null, note: 'Déjà interrogé lors du BAT 1 / retest 6 — non réinterrogé ici',
    }))

    return NextResponse.json({
      dejaEnrichi: resultatsDejaEnrichis,
      nouveaux: resultatsNouveaux,
      textSearchCalls: nbTextSearch,
      placeDetailsCalls: nbPlaceDetails,
      nombreDejaEnrichi: dejaEnrichi.length,
      nombreAInterroger: aInterroger.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message?.includes('API_KEY') ? 'Erreur de configuration (clé)' : e.message }, { status: 500 })
  }
}
