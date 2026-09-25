import { realGooglePlacesClient, MAX_COMPANIES } from './google-places-client'
import { calculerMatching } from './matching'
import { extraireEmailSite } from './email-extraction'
import { calculerContactabilite } from './contactabilite'
import type { EtablissementReference, FicheEnrichie } from './types'
import type { GooglePlacesClient } from './google-places-client'

export const MAX_TEXT_SEARCH_CALLS = 20
export const MAX_PLACE_DETAILS_CALLS = 20

/**
 * enrichirBatch — garde-fous DURS, vérifiés AVANT chaque appel.
 * `client` est optionnel — la route réelle n'en fournit jamais (utilise
 * realGooglePlacesClient() par défaut) ; les tests injectent un mock pour
 * vérifier réellement le comportement préventif sans appel réseau.
 */
export async function enrichirBatch(
  references: EtablissementReference[],
  fetchPage: (url: string) => Promise<string | null>,
  clientInjecte?: GooglePlacesClient
): Promise<{ fiches: FicheEnrichie[]; nbTextSearch: number; nbPlaceDetails: number }> {
  if (references.length > MAX_COMPANIES) {
    throw new Error(`Garde-fou : ${references.length} entreprises demandées, MAX_COMPANIES=${MAX_COMPANIES}. Refus d'exécuter.`)
  }

  const client = clientInjecte ?? realGooglePlacesClient() // lève une erreur explicite si GOOGLE_PLACES_API_KEY absente, APRÈS le contrôle MAX_COMPANIES
  const fiches: FicheEnrichie[] = []
  let nbTextSearch = 0
  let nbPlaceDetails = 0

  for (const reference of references) {
    // Contrôle PRÉVENTIF avant l'appel Text Search — jamais après coup.
    if (nbTextSearch + 1 > MAX_TEXT_SEARCH_CALLS) {
      throw new Error(`Garde-fou : prochain Text Search dépasserait MAX_TEXT_SEARCH_CALLS=${MAX_TEXT_SEARCH_CALLS} (actuel: ${nbTextSearch}). Appel refusé.`)
    }
    const query = `${reference.enseigne || reference.raisonSociale} ${reference.adresse} ${reference.codePostal} ${reference.commune}`
    const candidats = await client.textSearch(query)
    nbTextSearch++

    const matchGoogle = calculerMatching(reference, candidats)

    let telephone: FicheEnrichie['telephone'] = null
    let siteWeb: FicheEnrichie['siteWeb'] = null
    let googleMapsUri: string | null = null
    let email: FicheEnrichie['email'] = null

    if ((matchGoogle.statut === 'MATCH_FORT' || matchGoogle.statut === 'MATCH_PROBABLE') && matchGoogle.candidatRetenu) {
      // Contrôle PRÉVENTIF avant l'appel Place Details — jamais après coup.
      if (nbPlaceDetails + 1 > MAX_PLACE_DETAILS_CALLS) {
        throw new Error(`Garde-fou : prochain Place Details dépasserait MAX_PLACE_DETAILS_CALLS=${MAX_PLACE_DETAILS_CALLS} (actuel: ${nbPlaceDetails}). Appel refusé.`)
      }
      const details = await client.placeDetails(matchGoogle.candidatRetenu.placeId)
      nbPlaceDetails++
      if (details.telephone) telephone = { valeur: details.telephone, source: 'GOOGLE_PLACES', urlSource: null, niveauConfiance: matchGoogle.statut === 'MATCH_FORT' ? 'CONFIRME' : 'PROBABLE' }
      if (details.siteWeb) siteWeb = { valeur: details.siteWeb, source: 'GOOGLE_PLACES', urlSource: null, niveauConfiance: matchGoogle.statut === 'MATCH_FORT' ? 'CONFIRME' : 'PROBABLE' }
      googleMapsUri = details.googleMapsUri

      if (siteWeb) {
        const domaine = new URL(siteWeb.valeur).hostname
        email = await extraireEmailSite(domaine, fetchPage)
      }
    }

    const { contactabilite, raison } = calculerContactabilite({ telephone, email, siteWeb, matchGoogle }, false)

    fiches.push({
      reference, matchGoogle, placeIdGoogle: matchGoogle.candidatRetenu?.placeId ?? null,
      telephone, siteWeb, email, googleMapsUri, contactabilite, raisonContactabilite: raison,
    })
  }

  // Contrôle final, conservé en complément du contrôle préventif (défense en profondeur).
  if (nbTextSearch > MAX_TEXT_SEARCH_CALLS || nbPlaceDetails > MAX_PLACE_DETAILS_CALLS) {
    throw new Error(`Anomalie : compteur final dépassé (textSearch=${nbTextSearch}, placeDetails=${nbPlaceDetails})`)
  }

  return { fiches, nbTextSearch, nbPlaceDetails }
}
