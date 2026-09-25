import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { enrichirBatch, MAX_TEXT_SEARCH_CALLS, MAX_PLACE_DETAILS_CALLS } from '@/lib/enrichissement/orchestrateur'
import type { EtablissementReference } from '@/lib/enrichissement/types'

function getToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

// ══════════════════════════════════════════════════════════════
// ENRICH.VSG.4 — RETEST des 6 anciens AMBIGU UNIQUEMENT. Les 4 MATCH_FORT
// du premier BAT ne sont PAS réinterrogés (économie de quota, non-
// régression déjà démontrée par test-matching-v2.ts). Jeu figé, codé en
// dur — le body HTTP n'est jamais lu, aucun moyen d'ajouter une
// entreprise.
// ══════════════════════════════════════════════════════════════
const RETEST_6: (EtablissementReference & { secteur: string })[] = [
  { siren: '453757973', siret: '45375797300012', raisonSociale: 'CCPJJ', enseigne: null, adresse: '181 AVENUE DE LA DIVISION LECLERC', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '71.20A', secteur: 'Immobilier' },
  { siren: '966201717', siret: '96620171700024', raisonSociale: 'INTEGRALE DE CHAUFFAGE ET PLOMBERIE', enseigne: null, adresse: '21 B AVENUE CARNOT', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '43.22B', secteur: 'Bâtiment & artisans' },
  { siren: '444928923', siret: '44492892300028', raisonSociale: 'AMINATA SY', enseigne: null, adresse: '3 RUE ROLAND GARROS', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '70.21Z', secteur: 'Professions libérales & conseil' },
  { siren: '823882006', siret: '82388200600013', raisonSociale: 'FABIEN LEJEUNE', enseigne: 'LEJEUNE NETTOYAGE', adresse: '70 AVENUE DE VALENTON', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '81.21Z', secteur: 'Nettoyage & services aux entreprises' },
  { siren: '883261752', siret: '88326175200017', raisonSociale: 'BKS EXOTIQUE', enseigne: null, adresse: '26 RUE EMILE ZOLA', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '47.11B', secteur: 'Commerces de proximité' },
  { siren: '904898863', siret: '90489886300025', raisonSociale: 'SAYED BEN FRADJ', enseigne: null, adresse: '1 RUE HENRI SELLIER', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '86.90D', secteur: 'Santé' },
]

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

  try {
    const { fiches, nbTextSearch, nbPlaceDetails } = await enrichirBatch(RETEST_6, fetchPageSimple)

    if (nbTextSearch > MAX_TEXT_SEARCH_CALLS || nbPlaceDetails > MAX_PLACE_DETAILS_CALLS) {
      return NextResponse.json({ error: `Anomalie : compteur d'appels dépassé (textSearch=${nbTextSearch}, placeDetails=${nbPlaceDetails})` }, { status: 500 })
    }

    const resultats = fiches.map((f) => ({
      siren: f.reference.siren,
      entreprise: f.reference.raisonSociale,
      secteur: (RETEST_6.find((b) => b.siren === f.reference.siren) as any)?.secteur ?? null,
      matching: f.matchGoogle.statut,
      score: f.matchGoogle.score,
      raisons: f.matchGoogle.raisons,
      // ENRICH.VSG.4 §1 — observabilité : max 3 candidats, jamais la clé.
      candidatsExamines: f.matchGoogle.candidatsExamines,
      placeId: f.placeIdGoogle,
      telephone: f.telephone?.valeur ?? null,
      site: f.siteWeb?.valeur ?? null,
      email: f.email?.valeur ?? null,
      sources: { telephone: f.telephone?.source ?? null, email: f.email?.source ?? null, site: f.siteWeb?.source ?? null },
      contactabilite: f.contactabilite,
    }))

    return NextResponse.json({
      resultats,
      textSearchCalls: nbTextSearch,
      placeDetailsCalls: nbPlaceDetails,
      nombreMatchFort: fiches.filter((f) => f.matchGoogle.statut === 'MATCH_FORT').length,
      nombreMatchProbable: fiches.filter((f) => f.matchGoogle.statut === 'MATCH_PROBABLE').length,
      nombreAmbigu: fiches.filter((f) => f.matchGoogle.statut === 'AMBIGU').length,
      nombreNonTrouve: fiches.filter((f) => f.matchGoogle.statut === 'NON_TROUVE').length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message?.includes('API_KEY') ? 'Erreur de configuration (clé)' : e.message }, { status: 500 })
  }
}
