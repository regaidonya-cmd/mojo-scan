import type { CandidatGooglePlace } from './types'

/** Erreur dédiée 429 — distincte de toute autre erreur HTTP, pour que
 * l'orchestrateur puisse réagir différemment (arrêt fatal du batch, pas
 * une simple erreur locale à une entreprise). */
export class QuotaAtteinteError extends Error {
  constructor(public endpoint: 'textSearch' | 'placeDetails') {
    super(`Google Places ${endpoint}: 429 (quota atteint)`)
    this.name = 'QuotaAtteinteError'
  }
}

/** ENRICH.VSG.6B — Erreur 4xx NON retryable (400/401/403/404) : un
 * réessai immédiat ou lors d'une reprise ultérieure échouerait à
 * l'identique (requête malformée, clé invalide, ressource introuvable).
 * Distincte d'une erreur 5xx/réseau, elle-même transitoire et retryable
 * lors d'une prochaine reprise. */
export class ErreurNonRetryable extends Error {
  constructor(public endpoint: 'textSearch' | 'placeDetails', public statusCode: number) {
    super(`Google Places ${endpoint}: ${statusCode} (non retryable)`)
    this.name = 'ErreurNonRetryable'
  }
}

const CODES_NON_RETRYABLES = [400, 401, 403, 404]

// FieldMask EXPLICITE et MINIMAL — jamais "*". Documenté : chaque champ
// déclenche le SKU indiqué en commentaire (cf. rapport ENRICH.VSG.1 pour
// le détail des coûts).
const TEXT_SEARCH_FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.primaryType,places.types' // Pro SKU (Text Search) — primaryType/types = champs Essentials, n'augmentent pas le tier déjà requis par displayName/formattedAddress
const PLACE_DETAILS_FIELD_MASK = 'id,displayName,formattedAddress,nationalPhoneNumber,websiteUri,googleMapsUri' // Pro SKU (Place Details — "Contact" fields)

/** Garde-fou dur — appliqué explicitement par l'orchestrateur, pas une simple convention. */
export const MAX_COMPANIES = 10

export interface GooglePlacesClient {
  textSearch(query: string): Promise<CandidatGooglePlace[]>
  placeDetails(placeId: string): Promise<{ telephone: string | null; siteWeb: string | null; googleMapsUri: string | null }>
}

/**
 * realGooglePlacesClient — implémentation réelle. Lit GOOGLE_PLACES_API_KEY
 * depuis l'environnement. Lève une erreur EXPLICITE si absente — jamais un
 * appel silencieusement dégradé ou une donnée inventée.
 */
export function realGooglePlacesClient(): GooglePlacesClient {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    throw new Error(
      "GOOGLE_PLACES_API_KEY absente de l'environnement. " +
      "Variable nécessaire pour exécuter ce client réellement — aucun appel Google Places n'a lieu tant qu'elle n'est pas fournie."
    )
  }

  return {
    async textSearch(query: string): Promise<CandidatGooglePlace[]> {
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': TEXT_SEARCH_FIELD_MASK, // SKU: Text Search Pro
        },
        body: JSON.stringify({ textQuery: query }),
      })
      if (res.status === 429) throw new QuotaAtteinteError('textSearch')
      if (CODES_NON_RETRYABLES.includes(res.status)) throw new ErreurNonRetryable('textSearch', res.status)
      if (!res.ok) throw new Error(`Google Places textSearch: ${res.status}`)
      const json = await res.json()
      return (json.places ?? []).map((p: any) => ({
        placeId: p.id, displayName: p.displayName?.text ?? '', formattedAddress: p.formattedAddress ?? '',
        primaryType: p.primaryType ?? null, types: p.types ?? [],
      }))
    },
    async placeDetails(placeId: string) {
      const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK }, // SKU: Place Details Pro
      })
      if (res.status === 429) throw new QuotaAtteinteError('placeDetails')
      if (CODES_NON_RETRYABLES.includes(res.status)) throw new ErreurNonRetryable('placeDetails', res.status)
      if (!res.ok) throw new Error(`Google Places placeDetails: ${res.status}`)
      const json = await res.json()
      return {
        telephone: json.nationalPhoneNumber ?? null,
        siteWeb: json.websiteUri ?? null,
        googleMapsUri: json.googleMapsUri ?? null,
      }
    },
  }
}
