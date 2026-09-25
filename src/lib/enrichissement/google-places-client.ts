import type { CandidatGooglePlace } from './types'

// FieldMask EXPLICITE et MINIMAL — jamais "*". Documenté : chaque champ
// déclenche le SKU indiqué en commentaire (cf. rapport ENRICH.VSG.1 pour
// le détail des coûts).
const TEXT_SEARCH_FIELD_MASK = 'places.id,places.displayName,places.formattedAddress' // Pro SKU (Text Search)
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
      if (!res.ok) throw new Error(`Google Places textSearch: ${res.status}`)
      const json = await res.json()
      return (json.places ?? []).map((p: any) => ({
        placeId: p.id, displayName: p.displayName?.text ?? '', formattedAddress: p.formattedAddress ?? '',
      }))
    },
    async placeDetails(placeId: string) {
      const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK }, // SKU: Place Details Pro
      })
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
