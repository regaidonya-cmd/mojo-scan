'use strict'

/**
 * Configuration paramétrable de la collecte P0.2B.
 * Rien n'est figé en dur dans le pipeline : tout passe par cet objet,
 * lui-même alimenté par des variables d'environnement (avec des valeurs
 * par défaut correspondant au POC "Villeneuve-Saint-Georges").
 *
 * Aucune valeur ici n'engage MOJO SALES à une zone ou un métier particulier :
 * changer les variables d'environnement suffit à cibler une autre zone /
 * un autre code APE, sans toucher au code du pipeline.
 */

function toFloat(value, fallback) {
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : fallback
}

function toInt(value, fallback) {
  const n = parseInt(value, 10)
  return Number.isInteger(n) ? n : fallback
}

const config = {
  // --- Zone géographique (paramétrable, pas figée) ---
  center: {
    lat: toFloat(process.env.CENTER_LAT, 48.7333), // Villeneuve-Saint-Georges (par défaut POC)
    long: toFloat(process.env.CENTER_LONG, 2.4333),
  },
  radiusKm: toFloat(process.env.RADIUS_KM, 20), // max 50 km côté API

  // --- Activité(s) ciblée(s) ---
  // Moteur générique : accepte UN OU PLUSIEURS codes NAF (liste), pas un seul
  // code figé. 71.20B est une VALEUR DE CONFIGURATION par défaut pour la
  // recette diagnostiqueurs, pas une logique métier codée en dur.
  // - "71.20B"                  -> un seul code (usage POC actuel)
  // - "71.20B,74.90A,71.12B"    -> plusieurs codes (futur : un parcours
  //                                métier couvrant plusieurs NAF)
  // - non défini / vide         -> aucun filtre NAF (futur : collecte
  //                                multisectorielle TPE d'une zone)
  //
  // IMPORTANT : égalité stricte code par code, jamais de préfixe/startsWith.
  // La nomenclature de référence est explicite pour ne jamais confondre
  // activite_principale (NAF actuelle) et activite_principale_naf25 (NAF en
  // transition). Les deux champs sont toujours conservés séparément
  // dans les résultats, quelle que soit la nomenclature de référence choisie ici.
  activite: {
    codes: (
      process.env.ACTIVITE_CODES !== undefined
        ? process.env.ACTIVITE_CODES // explicitement défini (même "") -> respecté tel quel
        : process.env.ACTIVITE_CODE !== undefined
        ? process.env.ACTIVITE_CODE
        : '71.20B' // rien de défini -> valeur par défaut de la recette POC
    )
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean),
    // 'naf2008' -> on filtre sur le champ `activite_principale`
    // 'naf2025' -> on filtre sur le champ `activite_principale_naf25`
    nomenclature: process.env.ACTIVITE_NOMENCLATURE || 'naf2008',
  },

  // --- Étiquette de recette (PURE MÉTADONNÉE, aucune logique n'en dépend) ---
  // Sert uniquement à nommer le rapport produit. La renommer ou la
  // supprimer n'a strictement aucun effet sur le comportement du moteur.
  recette: {
    nom: process.env.RECETTE_NOM || 'poc_diagnostiqueurs_villeneuve_saint_georges',
  },

  // --- Pagination / throttle ---
  perPage: 25, // maximum documenté de l'API /near_point
  // Plafond de sécurité CONFIGURABLE. Ce n'est PAS une règle métier figée :
  // c'est un garde-fou pour ne jamais boucler indéfiniment si la cible
  // n'est jamais atteinte. Valeur par défaut volontairement prudente.
  maxPages: toInt(process.env.MAX_PAGES, 40),
  // Throttle entre deux appels. La doc annonce une limite de 7 req/s
  // (soit un intervalle minimal théorique de ~143ms) ; on prend une marge.
  throttleMs: toInt(process.env.THROTTLE_MS, 250),

  // --- Endpoint ---
  apiBaseUrl: 'https://recherche-entreprises.api.gouv.fr/near_point',

  // --- Seuils fit_cible (voir src/pipeline.js pour la logique complète) ---
  // Tranches INSEE considérées TPE/indépendant : 0 salarié à 19 salariés.
  ficheEffectifCible: new Set(['00', '01', '02', '03', '11']),
  // Tranches clairement au-dessus de la cible (>=20 salariés) utilisées
  // comme signal (pas comme verdict seul, voir règle des signaux convergents).
  ficheEffectifHorsCible: new Set(['12', '21', '22', '31', '32', '41', '42', '51', '52', '53']),
  categorieHorsCible: new Set(['GE', 'ETI']),
  seuilEtablissementsReseauNational: 20, // nombre_etablissements_ouverts au-delà duquel c'est un signal de réseau national
}

module.exports = config
