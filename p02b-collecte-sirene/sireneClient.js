'use strict'

const config = require('./config')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Appelle une page de /near_point.
 * Ne fait AUCUN filtrage métier ici : on redemande simplement le NAF côté
 * serveur pour limiter le volume transféré, mais le filtrage réel et
 * définitif se fait toujours niveau établissement dans pipeline.js
 * (voir la méthodologie validée : etat_administratif=A côté requête ne
 * garantit rien au niveau établissement).
 */
async function fetchPage(page) {
  const url = new URL(config.apiBaseUrl)
  url.searchParams.set('lat', String(config.center.lat))
  url.searchParams.set('long', String(config.center.long))
  url.searchParams.set('radius', String(config.radiusKm))
  url.searchParams.set('page', String(page))
  url.searchParams.set('per_page', String(config.perPage))
  // Filtre grossier côté serveur (utile pour réduire le volume), toujours
  // revalidé au niveau établissement après réception (voir pipeline.js) :
  url.searchParams.set('etat_administratif', 'A')
  // Le paramètre serveur `activite_principale` ne peut porter qu'UNE seule
  // valeur (vérifié empiriquement, pas supposé). Trois cas génériques :
  //   - un seul code configuré, nomenclature naf2008 -> filtre serveur appliqué
  //   - plusieurs codes, ou nomenclature naf2025, ou aucun code -> pas de
  //     filtre serveur ; le filtrage exact se fait intégralement en local
  //     (pipeline.js), quel que soit le nombre de codes ou la nomenclature.
  // Ce fichier ne connaît aucun métier ni aucun code NAF particulier.
  if (config.activite.codes.length === 1 && config.activite.nomenclature === 'naf2008') {
    url.searchParams.set('activite_principale', config.activite.codes[0])
  }

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err = new Error(`Appel /near_point échoué (HTTP ${res.status}) sur la page ${page}: ${body.slice(0, 500)}`)
    err.status = res.status
    err.page = page
    throw err
  }

  return res.json()
}

/**
 * Récupère une page avec retry simple en cas d'erreur réseau/5xx,
 * et respecte le throttle avant chaque appel.
 */
async function fetchPageWithRetry(page, { retries = 2 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    await sleep(config.throttleMs)
    try {
      return await fetchPage(page)
    } catch (err) {
      lastErr = err
      // Pas de retry sur une erreur clairement non transitoire (400/404)
      if (err.status && err.status < 500) throw err
      await sleep(config.throttleMs * (attempt + 2))
    }
  }
  throw lastErr
}

module.exports = { fetchPage, fetchPageWithRetry, sleep }
