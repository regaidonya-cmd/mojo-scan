'use strict'

const config = require('./config')

function construireRapport(resultatCollecte) {
  const {
    mode,
    prospects,
    rendementParPage,
    anomalies,
    totalResultsAnnonce,
    totalPagesAnnonce,
    pagesFournies,
    pagesManquantes,
    echantillonComplet,
    pagesReellementParcourues,
    plafondAtteint,
    siretUniquesTotal,
  } = resultatCollecte

  const etablissementsVusTotal = rendementParPage.reduce((s, l) => s + l.etablissements_vus_page, 0)
  const etablissementsActifsTotal = rendementParPage.reduce((s, l) => s + l.etablissements_actifs_retenus_page, 0)

  const repartitionFitCible = { CIBLE: 0, HORS_CIBLE: 0, INCONNU: 0 }
  for (const p of prospects) repartitionFitCible[p.fit_cible] += 1

  const exemplesHorsCible = prospects
    .filter((p) => p.fit_cible === 'HORS_CIBLE')
    .slice(0, 5)
    .map((p) => ({ siren: p.siren, nom: p.nom_complet, raison: p.fit_cible_raison, nb_etablissements_locaux: p.etablissements_actifs_locaux.length }))

  const exemplesCibleOuInconnu = prospects
    .filter((p) => p.fit_cible === 'CIBLE' || p.fit_cible === 'INCONNU')
    .slice(0, 10)
    .map((p) => ({
      siren: p.siren,
      nom: p.nom_complet,
      fit_cible: p.fit_cible,
      raison: p.fit_cible_raison,
      distance_min_km: p.distance_min_km,
      etablissements_locaux: p.etablissements_actifs_locaux,
    }))

  // Statut de complétude explicite. `null` = on ne connaît même pas
  // total_pages (aucune page traitée) -> ni COMPLET ni PARTIEL, INDETERMINE.
  let echantillonStatut = 'INDETERMINE'
  if (echantillonComplet === true) echantillonStatut = 'COMPLET'
  else if (echantillonComplet === false) echantillonStatut = 'PARTIEL'

  let avertissement = null
  if (echantillonStatut === 'PARTIEL') {
    avertissement =
      `ÉCHANTILLON PARTIEL : ${pagesFournies.length} page(s) sur ${totalPagesAnnonce} annoncée(s) par l'API ` +
      `ont été analysées (${pagesManquantes.length} page(s) manquante(s)). ` +
      `Les chiffres de ce rapport (SIREN uniques, répartition fit_cible, etc.) NE représentent PAS ` +
      `l'ensemble de la zone recherchée et NE DOIVENT PAS être interprétés comme une validation ou une ` +
      `invalidation de la capacité à atteindre l'objectif d'environ 50 prospects. ` +
      `Pages manquantes : ${pagesManquantes.slice(0, 20).join(', ')}${pagesManquantes.length > 20 ? '…' : ''}.`
  } else if (echantillonStatut === 'INDETERMINE') {
    avertissement =
      "ÉCHANTILLON INDÉTERMINÉ : aucune page n'a pu être traitée (voir anomalies). Aucune conclusion possible."
  }

  return {
    recette: config.recette.nom,
    source_collecte: mode, // 'LIVE_API' ou 'JSON_IMPORT'
    parametres_recherche: {
      centre: config.center,
      rayon_km: config.radiusKm,
      activite_codes: config.activite.codes,
      activite_nomenclature: config.activite.nomenclature,
      plafond_pages_configure: config.maxPages,
    },
    echantillon: {
      statut: echantillonStatut, // COMPLET / PARTIEL / INDETERMINE
      total_results_annonce_api: totalResultsAnnonce,
      total_pages_annonce_api: totalPagesAnnonce,
      nombre_pages_fournies: pagesFournies.length,
      numeros_pages_fournies: pagesFournies,
      numeros_pages_manquantes: pagesManquantes,
      avertissement,
    },
    funnel: {
      pages_reellement_parcourues: pagesReellementParcourues,
      plafond_pages_atteint: plafondAtteint,
      etablissements_vus_matching_etablissements: etablissementsVusTotal,
      etablissements_locaux_actifs_cibles_retenus: etablissementsActifsTotal,
      siret_uniques: siretUniquesTotal,
      siren_uniques: prospects.length,
      repartition_fit_cible: repartitionFitCible,
    },
    // Restitution détaillée des 1494 SIREN (ou équivalent) — nécessaire pour
    // que P0.2C puisse consommer le rapport. Champs conservés tels que
    // déjà calculés en interne par pipeline.js, aucune donnée recalculée.
    prospects: prospects.map((p) => ({
      siren: p.siren,
      nom_complet: p.nom_complet,
      tranche_effectif_salarie: p.tranche_effectif_salarie,
      categorie_entreprise: p.categorie_entreprise,
      nombre_etablissements_ouverts: p.nombre_etablissements_ouverts,
      fit_cible: p.fit_cible,
      fit_cible_raison: p.fit_cible_raison,
      distance_min_km: p.distance_min_km,
      etablissements_actifs_locaux: p.etablissements_actifs_locaux.map((e) => ({
        siret: e.siret,
        adresse: e.adresse,
        code_postal: e.code_postal,
        ville: e.ville,
        latitude: e.latitude,
        longitude: e.longitude,
        distance_km: e.distance_km,
        siege: e.siege,
        activite_principale: e.activite_principale,
        activite_principale_naf25: e.activite_principale_naf25,
      })),
    })),
    rendement_par_page: rendementParPage,
    exemples_hors_cible: exemplesHorsCible,
    exemples_cible_ou_inconnu: exemplesCibleOuInconnu,
    anomalies,
    note: "P0.2B ne traite pas encore l'ADI : preuve_metier et contactabilité ne sont pas calculées ici (portée P0.2C).",
  }
}

module.exports = { construireRapport }
