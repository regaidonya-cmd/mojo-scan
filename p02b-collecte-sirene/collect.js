'use strict'

const config = require('./config')
const { fetchPageWithRetry } = require('./sireneClient')
const { chargerPagesDepuisDossier } = require('./pageSource')
const { traiterPage, creerEtatCumule } = require('./pipeline')
const { extraireReference, validerCoherence } = require('./pageMeta')

const MODES_VALIDES = new Set(['LIVE_API', 'JSON_IMPORT'])

/**
 * RÈGLE UNIQUE de normalisation/validation du mode, appliquée partout
 * (index.js comme collecter() ci-dessous) : on accepte la casse fournie
 * par l'utilisateur, on normalise explicitement en majuscules, PUIS on
 * vérifie que la valeur normalisée fait partie des modes valides. Toute
 * valeur non reconnue après normalisation lève une erreur explicite —
 * jamais de repli silencieux sur LIVE_API.
 */
function normaliserMode(modeBrut) {
  const normalise = String(modeBrut ?? '').toUpperCase()
  if (!MODES_VALIDES.has(normalise)) {
    throw new Error(
      `Mode de collecte invalide : "${modeBrut}". Seules les valeurs "LIVE_API" ou "JSON_IMPORT" ` +
        `(insensible à la casse) sont acceptées — aucune valeur par défaut silencieuse en cas de faute de frappe.`
    )
  }
  return normalise
}

/**
 * Détecte les anomalies structurelles d'une page brute, indépendamment
 * de son origine (API en direct ou fichier importé). Fonction partagée :
 * appelée une seule fois, de façon identique par les deux modes.
 */
function detecterAnomaliesPage(json, page, anomalies) {
  for (const entreprise of json.results || []) {
    if (!entreprise.siren) {
      anomalies.push({ type: 'entreprise_sans_siren', page, extrait: entreprise.nom_complet ?? null })
    }
    for (const etab of entreprise.matching_etablissements || []) {
      if (etab.latitude == null || etab.longitude == null) {
        anomalies.push({ type: 'etablissement_sans_coordonnees', page, siret: etab.siret ?? null })
      }
    }
  }
}

/**
 * Boucle de collecte P0.2B, avec DEUX modes d'alimentation possibles pour
 * un SEUL et MÊME pipeline de traitement :
 *
 *   - mode 'LIVE_API'    : récupération automatique via /near_point,
 *                          avec contrôle de cohérence INCRÉMENTAL page par
 *                          page (dès qu'une page diverge de la référence,
 *                          la collecte s'interrompt proprement, mais les
 *                          pages déjà traitées avant la divergence restent
 *                          comptabilisées).
 *   - mode 'JSON_IMPORT' : analyse de réponses /near_point réelles déjà
 *                          obtenues. Contrôle de cohérence sur le LOT
 *                          ENTIER avant tout traitement (tout ou rien) —
 *                          voir pageSource.js.
 *
 * Les deux modes utilisent la MÊME fonction de comparaison des
 * métadonnées (pageMeta.js) : la règle n'est écrite qu'une fois.
 *
 * Le filtrage établissement, la déduplication SIRET/SIREN, le calcul de
 * distance et la qualification fit_cible (pipeline.js, via traiterPage())
 * sont appelés de façon STRICTEMENT IDENTIQUE quel que soit le mode.
 *
 * `fetchPage` est injectable (paramètre optionnel) uniquement pour les
 * tests, afin de valider le comportement LIVE_API sans appel réseau réel.
 * En production (index.js), il n'est jamais fourni : la valeur par
 * défaut (le vrai client HTTP) est utilisée.
 */
async function collecter({ onPage, mode = 'LIVE_API', importDir, fetchPage = fetchPageWithRetry } = {}) {
  mode = normaliserMode(mode)

  const etatCumule = creerEtatCumule()
  const rendementParPage = []
  const anomalies = []
  const pagesFournies = []

  let totalPages = null
  let totalResultsAnnonce = null

  // Traitement d'UNE page, appelé identiquement par les deux modes.
  function traiterUnePage(numeroPage, json) {
    if (totalPages === null) {
      totalPages = json.total_pages ?? null
      totalResultsAnnonce = json.total_results ?? null
    }

    detecterAnomaliesPage(json, numeroPage, anomalies)

    const metriquesPage = traiterPage(json, etatCumule) // <-- logique métier unique, partagée
    const ligne = {
      page: numeroPage,
      ...metriquesPage,
      siret_uniques_cumules: etatCumule.siretIndex.size,
      siren_uniques_cumules: etatCumule.sirenIndex.size,
    }
    rendementParPage.push(ligne)
    pagesFournies.push(numeroPage)
    if (onPage) onPage(ligne, { totalPages, sirenIndex: etatCumule.sirenIndex })
  }

  let plafondAtteint = false

  if (mode === 'JSON_IMPORT') {
    if (!importDir) throw new Error("mode JSON_IMPORT requiert un dossier ('importDir')")
    let pages
    try {
      pages = chargerPagesDepuisDossier(importDir)
    } catch (err) {
      anomalies.push({ type: 'erreur_import_json', message: err.message })
      pages = []
    }
    if (pages.length === 0 && anomalies.length === 0) {
      anomalies.push({ type: 'import_vide', message: `Aucun fichier .json trouvé dans ${importDir}` })
    }
    for (const { page, json } of pages) {
      traiterUnePage(page, json)
    }
  } else {
    // mode === 'LIVE_API' (seule autre valeur possible après normaliserMode)
    let page = 1
    let reference = null
    while (page <= config.maxPages && (totalPages === null || page <= totalPages)) {
      let json
      try {
        json = await fetchPage(page)
      } catch (err) {
        anomalies.push({ type: 'erreur_appel_api', page, message: err.message })
        break
      }

      const numeroPage = json.page ?? page

      if (reference === null) {
        reference = extraireReference(json)
      } else {
        try {
          validerCoherence(reference, json, numeroPage, `la page ${numeroPage} reçue de l'API`)
        } catch (err) {
          anomalies.push({ type: 'incoherence_pages_live_api', page: numeroPage, message: err.message })
          break // interruption propre de la collecte, pages déjà traitées conservées
        }
      }

      traiterUnePage(numeroPage, json)
      if ((json.results || []).length === 0) break // plus rien à paginer
      page += 1
    }
    plafondAtteint = page > config.maxPages
  }

  // Calcul de complétude de l'échantillon (pertinent dans les deux modes :
  // en LIVE_API, une interruption pour incohérence ou une erreur réseau
  // laisse mécaniquement des pages manquantes -> jamais COMPLET).
  const pagesFourniesTriees = [...pagesFournies].sort((a, b) => a - b)
  let pagesManquantes = null
  let echantillonComplet = null
  if (totalPages) {
    const attendues = new Set(Array.from({ length: totalPages }, (_, i) => i + 1))
    for (const p of pagesFourniesTriees) attendues.delete(p)
    pagesManquantes = Array.from(attendues).sort((a, b) => a - b)
    echantillonComplet = pagesManquantes.length === 0
  }

  return {
    mode,
    totalResultsAnnonce,
    totalPagesAnnonce: totalPages,
    pagesFournies: pagesFourniesTriees,
    pagesManquantes,
    echantillonComplet,
    pagesReellementParcourues: rendementParPage.length,
    plafondAtteint,
    rendementParPage,
    anomalies,
    prospects: Array.from(etatCumule.sirenIndex.values()),
    siretUniquesTotal: etatCumule.siretIndex.size,
  }
}

module.exports = { collecter, normaliserMode }
