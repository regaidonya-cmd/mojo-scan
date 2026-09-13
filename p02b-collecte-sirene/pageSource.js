'use strict'

const fs = require('fs')
const path = require('path')
const { extraireReference, validerCoherence } = require('./pageMeta')

/**
 * Charge des pages /near_point déjà obtenues, sous forme de fichiers JSON
 * dans un dossier. Le numéro de page retenu est TOUJOURS celui déclaré
 * dans le contenu JSON lui-même (`json.page`), jamais déduit du nom de
 * fichier — pour rester fiable quel que soit le nom donné au fichier lors
 * de la sauvegarde manuelle (ex. depuis un navigateur).
 *
 * Ne fait AUCUN filtrage/dédup/calcul métier : ça reste dans pipeline.js,
 * appelé de façon strictement identique quel que soit le mode.
 */
function chargerPagesDepuisDossier(dossierImport) {
  if (!fs.existsSync(dossierImport)) {
    throw new Error(
      `Dossier d'import introuvable : ${dossierImport}. Créez ce dossier et placez-y les fichiers .json des pages obtenues.`
    )
  }

  const fichiers = fs
    .readdirSync(dossierImport)
    .filter((f) => f.toLowerCase().endsWith('.json'))

  const pages = []
  for (const fichier of fichiers) {
    const cheminComplet = path.join(dossierImport, fichier)
    let json
    try {
      json = JSON.parse(fs.readFileSync(cheminComplet, 'utf8'))
    } catch (err) {
      throw new Error(`Fichier JSON invalide, impossible à analyser : ${fichier} (${err.message})`)
    }
    if (typeof json.page !== 'number') {
      throw new Error(
        `Le fichier "${fichier}" ne contient pas de champ "page" numérique exploitable dans son JSON — ` +
          `impossible de savoir quelle page /near_point il représente. Vérifiez qu'il s'agit bien d'une ` +
          `réponse brute de l'API, non modifiée.`
      )
    }
    pages.push({ page: json.page, json, fichier })
  }

  // Détection de doublons (même numéro de page fourni deux fois sous des noms différents)
  const vus = new Map()
  for (const p of pages) {
    if (vus.has(p.page)) {
      throw new Error(
        `La page ${p.page} est présente en double dans le dossier d'import ` +
          `("${vus.get(p.page)}" et "${p.fichier}"). Retirez le doublon avant de relancer.`
      )
    }
    vus.set(p.page, p.fichier)
  }

  pages.sort((a, b) => a.page - b.page)

  // --- Contrôle de cohérence du LOT (pas fichier par fichier isolément) ---
  // Référence prise sur la première page du lot une fois trié. Toute page
  // qui diverge invalide le lot ENTIER : on ne fusionne jamais
  // silencieusement des pages incohérentes entre elles. Règle de
  // comparaison factorisée dans pageMeta.js (identique à LIVE_API).
  if (pages.length > 0) {
    const reference = extraireReference(pages[0].json)
    for (const p of pages) {
      validerCoherence(reference, p.json, p.page, `le fichier "${p.fichier}" (page ${p.page})`)
    }
  }

  return pages
}

module.exports = { chargerPagesDepuisDossier }
