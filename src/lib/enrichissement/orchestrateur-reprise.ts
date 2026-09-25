import { realGooglePlacesClient, QuotaAtteinteError, ErreurNonRetryable } from './google-places-client'
import { calculerMatching } from './matching'
import { extraireEmailSite } from './email-extraction'
import { determinerActionReprise, marquerErreurNonRetryable } from './persistance'
import type { PersistanceClient, LigneEnrichissement } from './persistance'
import type { EtablissementReference } from './types'
import type { GooglePlacesClient } from './google-places-client'

export interface ResultatReprise {
  statutGlobal: 'TERMINE' | 'PARTIEL_QUOTA_ATTEINT'
  traites: number
  restants: number
  sirenRestants: string[]
  nbTextSearch: number
  nbPlaceDetails: number
}

/**
 * enrichirBatchAvecReprise — ENRICH.VSG.6 + VSG.6B. Sauvegarde
 * IMMÉDIATEMENT chaque étape réussie via `persistance`. Reprend
 * exactement là où un lot précédent s'est arrêté :
 *   - jamais tenté / Text Search jamais réussi -> refait le Text Search
 *   - Text Search réussi (place_id connu) + Place Details manquant
 *     -> reprend UNIQUEMENT Place Details, jamais un nouveau Text Search
 *   - terminal (MATCH_FORT/MATCH_PROBABLE/AMBIGU/NON_TROUVE) -> aucun appel
 *   - erreur NON_RETRYABLE (4xx Google) -> aucun appel, jamais retentée
 *
 * GARDE-FOUS DURS (ENRICH.VSG.6B) — `maxTextSearch`/`maxPlaceDetails`
 * sont OBLIGATOIRES (aucune valeur par défaut liée à MAX_COMPANIES de
 * l'ancien POC), vérifiés AVANT CHAQUE appel individuel. Même avec un
 * nombre de références largement supérieur, jamais plus de
 * `maxTextSearch` Text Search ni `maxPlaceDetails` Place Details ne
 * sont exécutés — le batch s'arrête proprement, retourne un état
 * PARTIEL_QUOTA_ATTEINT (même forme que pour un 429 Google) avec les
 * SIREN restants, permettant une reprise ultérieure.
 *
 * Un 429 (Text Search OU Place Details) reste également FATAL pour le
 * batch : arrêt immédiat, tout ce qui précède reste déjà sauvegardé.
 * Une erreur 5xx/réseau reste locale à une entreprise (statut ERREUR,
 * retryable lors d'une prochaine reprise, le batch courant continue).
 * Aucun mécanisme automatique de nouvelle tentative n'existe sur 429
 * ni sur les hard-stops applicatifs.
 */
export async function enrichirBatchAvecReprise(
  references: (EtablissementReference & { lotCode: string })[],
  source: string,
  persistance: PersistanceClient,
  fetchPage: (url: string) => Promise<string | null>,
  maxTextSearch: number,
  maxPlaceDetails: number,
  clientInjecte?: GooglePlacesClient
): Promise<ResultatReprise> {
  if (references.length === 0) {
    return { statutGlobal: 'TERMINE', traites: 0, restants: 0, sirenRestants: [], nbTextSearch: 0, nbPlaceDetails: 0 }
  }

  const lotCode = references[0].lotCode
  const client = clientInjecte ?? realGooglePlacesClient()
  const lotExistant = await persistance.lireLot(lotCode, source)

  let nbTextSearch = 0
  let nbPlaceDetails = 0
  let traites = 0

  for (let i = 0; i < references.length; i++) {
    const reference = references[i]
    const ligneExistante = lotExistant.get(reference.siren)
    const action = determinerActionReprise(ligneExistante)

    if (action === 'AUCUNE') {
      traites++ // déjà terminé (ou erreur non-retryable, ou état résiduel prudent) — 0 quota consommé
      continue
    }

    // ── Hard-stop DUR, vérifié AVANT CHAQUE appel, quelle que soit la
    // taille de `references` — arrêt propre, jamais un dépassement. ──
    if (action === 'TEXT_SEARCH' && nbTextSearch + 1 > maxTextSearch) {
      return {
        statutGlobal: 'PARTIEL_QUOTA_ATTEINT',
        traites, restants: references.length - traites,
        sirenRestants: references.slice(traites).map((r) => r.siren),
        nbTextSearch, nbPlaceDetails,
      }
    }
    if (action === 'PLACE_DETAILS_UNIQUEMENT' && nbPlaceDetails + 1 > maxPlaceDetails) {
      return {
        statutGlobal: 'PARTIEL_QUOTA_ATTEINT',
        traites, restants: references.length - traites,
        sirenRestants: references.slice(traites).map((r) => r.siren),
        nbTextSearch, nbPlaceDetails,
      }
    }

    const ligne: LigneEnrichissement = ligneExistante ? { ...ligneExistante } : {
      siren: reference.siren, companyId: null, lotCode, source,
      textSearchTermine: false, placeDetailsTermine: false, statut: 'A_TRAITER', verdictMatching: null,
      scoreMatching: null, placeId: null, telephone: null, siteWeb: null, email: null,
      candidatsExamines: null, erreur: null,
    }

    try {
      if (action === 'TEXT_SEARCH') {
        const query = `${reference.enseigne || reference.raisonSociale} ${reference.adresse} ${reference.codePostal} ${reference.commune}`
        const candidats = await client.textSearch(query)
        nbTextSearch++

        const matchGoogle = calculerMatching(reference, candidats)
        ligne.textSearchTermine = true
        ligne.scoreMatching = matchGoogle.score
        ligne.candidatsExamines = matchGoogle.candidatsExamines
        ligne.placeId = matchGoogle.candidatRetenu?.placeId ?? null
        ligne.verdictMatching = matchGoogle.statut

        if (matchGoogle.statut === 'AMBIGU' || matchGoogle.statut === 'NON_TROUVE') {
          ligne.statut = matchGoogle.statut
          ligne.placeDetailsTermine = true
          ligne.erreur = null
          await persistance.sauvegarderEtape(ligne)
          traites++
          continue
        }

        // MATCH_FORT/MATCH_PROBABLE : Place Details nécessaire ensuite —
        // vérifier le hard-stop AVANT cet appel, même dans ce même tour.
        if (nbPlaceDetails + 1 > maxPlaceDetails) {
          ligne.statut = 'ERREUR'
          ligne.erreur = 'Text Search réussi, Place Details différé (hard-stop applicatif atteint)'
          await persistance.sauvegarderEtape(ligne)
          return {
            statutGlobal: 'PARTIEL_QUOTA_ATTEINT',
            traites, restants: references.length - traites,
            sirenRestants: references.slice(traites).map((r) => r.siren),
            nbTextSearch, nbPlaceDetails,
          }
        }

        ligne.statut = 'ERREUR'
        ligne.erreur = 'Text Search réussi, Place Details en attente'
        await persistance.sauvegarderEtape(ligne)
      }

      if (ligne.placeId && !ligne.placeDetailsTermine) {
        const details = await client.placeDetails(ligne.placeId)
        nbPlaceDetails++
        ligne.placeDetailsTermine = true
        ligne.telephone = details.telephone
        ligne.siteWeb = details.siteWeb
        ligne.erreur = null

        if (details.siteWeb) {
          const domaine = new URL(details.siteWeb).hostname
          const email = await extraireEmailSite(domaine, fetchPage)
          ligne.email = email?.valeur ?? null
        }

        ligne.statut = ligne.verdictMatching ?? 'ERREUR'
      }

      await persistance.sauvegarderEtape(ligne)
      traites++
    } catch (e) {
      if (e instanceof QuotaAtteinteError) {
        // FATAL — arrêt immédiat, tout ce qui précède est déjà sauvegardé.
        return {
          statutGlobal: 'PARTIEL_QUOTA_ATTEINT',
          traites, restants: references.length - traites,
          sirenRestants: references.slice(traites).map((r) => r.siren),
          nbTextSearch, nbPlaceDetails,
        }
      }
      if (e instanceof ErreurNonRetryable) {
        // 4xx Google — erreur locale mais JAMAIS retentée lors d'une
        // reprise ultérieure (marquée explicitement dans `erreur`).
        ligne.statut = 'ERREUR'
        ligne.erreur = marquerErreurNonRetryable(e.message)
        await persistance.sauvegarderEtape(ligne)
        traites++
        continue
      }
      // Erreur 5xx/réseau — locale, non fatale, RETRYABLE lors d'une
      // prochaine reprise (pas de préfixe non-retryable).
      ligne.statut = 'ERREUR'
      ligne.erreur = (e as Error).message
      await persistance.sauvegarderEtape(ligne)
      traites++
    }
  }

  return { statutGlobal: 'TERMINE', traites, restants: 0, sirenRestants: [], nbTextSearch, nbPlaceDetails }
}
