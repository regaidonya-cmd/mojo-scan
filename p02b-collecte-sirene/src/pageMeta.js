'use strict'

/**
 * Extrait les métadonnées de référence d'une page /near_point (la première
 * page reçue, quel que soit le mode, sert de référence pour tout le lot).
 */
function extraireReference(json) {
  return {
    total_pages: json.total_pages ?? null,
    total_results: json.total_results ?? null,
    per_page: json.per_page ?? null,
  }
}

/**
 * Vérifie qu'une page est cohérente avec la référence du lot. Lance une
 * Error explicite au premier écart trouvé — ne retourne jamais un simple
 * booléen, pour forcer l'appelant à traiter l'anomalie explicitement
 * plutôt que de l'ignorer par erreur.
 *
 * `label` sert uniquement à produire un message lisible (ex. nom de
 * fichier en JSON_IMPORT, numéro de page en LIVE_API).
 */
function validerCoherence(reference, json, numeroPage, label) {
  const totalPages = json.total_pages ?? null
  const totalResults = json.total_results ?? null
  const perPage = json.per_page ?? null

  if (totalPages !== reference.total_pages) {
    throw new Error(
      `Incohérence total_pages : ${label} annonce total_pages=${totalPages}, ` +
        `alors que la référence du lot était total_pages=${reference.total_pages}.`
    )
  }

  if (totalResults !== reference.total_results) {
    throw new Error(
      `Incohérence total_results : ${label} annonce total_results=${totalResults}, ` +
        `alors que la référence du lot était total_results=${reference.total_results}.`
    )
  }

  if (reference.per_page !== null && perPage !== undefined && perPage !== reference.per_page) {
    throw new Error(
      `Incohérence per_page : ${label} annonce per_page=${perPage}, ` +
        `alors que la référence du lot était per_page=${reference.per_page}.`
    )
  }

  if (reference.total_pages !== null && (numeroPage < 1 || numeroPage > reference.total_pages)) {
    throw new Error(
      `Page hors plage : ${label} déclare page=${numeroPage}, ` +
        `en dehors de la plage valide [1, ${reference.total_pages}] annoncée par total_pages.`
    )
  }
}

module.exports = { extraireReference, validerCoherence }
