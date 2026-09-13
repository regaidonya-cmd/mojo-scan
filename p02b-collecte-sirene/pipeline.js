'use strict'

const config = require('./config')
const { distanceKm } = require('./geo')

// Set pour un matching O(1), reconstruit une seule fois. Vide = pas de
// filtre NAF (collecte multisectorielle) -> tout établissement actif passe
// le filtre d'activité.
const codesActiviteSet = new Set(config.activite.codes)

/**
 * Détermine si un établissement (élément de matching_etablissements) est
 * un établissement local ACTIF conforme à la cible, au sens de la
 * méthodologie validée :
 *   - etat_administratif de CET établissement == 'A' (pas celui de l'entreprise)
 *   - date_fermeture de CET établissement == null
 *   - code d'activité EXACT (pas de préfixe) présent dans la liste configurée
 *     sur la nomenclature de référence configurée (liste vide = pas de filtre NAF)
 *
 * Générique par construction : ne connaît aucun métier. 71.20B n'apparaît
 * nulle part dans ce fichier — uniquement dans config.js, en tant que
 * valeur de configuration par défaut de la recette POC.
 */
function isEtablissementActifCible(etab) {
  if (!etab) return false
  if (etab.etat_administratif !== 'A') return false
  if (etab.date_fermeture !== null && etab.date_fermeture !== undefined) return false

  if (codesActiviteSet.size === 0) return true // pas de filtre NAF configuré

  const champNomenclature =
    config.activite.nomenclature === 'naf2025' ? 'activite_principale_naf25' : 'activite_principale'
  return codesActiviteSet.has(etab[champNomenclature])
}

/**
 * Qualification fit_cible : CIBLE / HORS_CIBLE / INCONNU.
 * Règle : HORS_CIBLE exige au moins deux signaux convergents. Un seul
 * signal faible ou une donnée manquante -> INCONNU, jamais HORS_CIBLE
 * ni CIBLE par défaut.
 */
function qualifierFitCible(entreprise) {
  const tranche = entreprise.tranche_effectif_salarie
  const categorie = entreprise.categorie_entreprise
  const nbEtabOuverts = entreprise.nombre_etablissements_ouverts

  const signalEffectifCible = tranche != null && config.ficheEffectifCible.has(tranche)
  const signalEffectifHorsCible = tranche != null && config.ficheEffectifHorsCible.has(tranche)
  const signalCategorieHorsCible = categorie != null && config.categorieHorsCible.has(categorie)
  const signalReseauNational =
    typeof nbEtabOuverts === 'number' && nbEtabOuverts > config.seuilEtablissementsReseauNational

  const nbSignauxHorsCible = [signalEffectifHorsCible, signalCategorieHorsCible, signalReseauNational].filter(
    Boolean
  ).length

  if (nbSignauxHorsCible >= 2) {
    return {
      fit_cible: 'HORS_CIBLE',
      raison: `Signaux convergents: ${[
        signalEffectifHorsCible ? `tranche_effectif=${tranche}` : null,
        signalCategorieHorsCible ? `categorie_entreprise=${categorie}` : null,
        signalReseauNational ? `nombre_etablissements_ouverts=${nbEtabOuverts}` : null,
      ]
        .filter(Boolean)
        .join(', ')}`,
    }
  }

  if (signalEffectifCible && !signalCategorieHorsCible) {
    return { fit_cible: 'CIBLE', raison: `tranche_effectif_salarie=${tranche} (TPE/indépendant)` }
  }

  return {
    fit_cible: 'INCONNU',
    raison: 'Donnée(s) d\'effectif/catégorie manquante(s) ou non concluante(s), signal insuffisant',
  }
}

/**
 * Traite une page de résultats /near_point et met à jour l'état cumulé
 * (map des SIREN déjà vus). Retourne les métriques de rendement de CETTE
 * page uniquement (pas cumulées) pour permettre le suivi page par page
 * demandé par la spécification.
 */
function traiterPage(pageJson, etatCumule) {
  const entreprisesBrutes = pageJson.results || []
  let etablissementsVusDansPage = 0
  let etablissementsActifsRetenusDansPage = 0
  const siretVusAvant = etatCumule.siretIndex.size
  const sirenVusAvant = etatCumule.sirenIndex.size
  let nouveauxSirenCible = 0

  for (const entreprise of entreprisesBrutes) {
    const etablissements = entreprise.matching_etablissements || []
    etablissementsVusDansPage += etablissements.length

    const etablissementsActifsCible = etablissements.filter(isEtablissementActifCible)
    etablissementsActifsRetenusDansPage += etablissementsActifsCible.length

    if (etablissementsActifsCible.length === 0) continue

    for (const etab of etablissementsActifsCible) {
      if (etatCumule.siretIndex.has(etab.siret)) continue // déduplication SIRET
      etatCumule.siretIndex.set(etab.siret, entreprise.siren)

      const dist = distanceKm(
        config.center.lat,
        config.center.long,
        etab.latitude !== undefined ? parseFloat(etab.latitude) : null,
        etab.longitude !== undefined ? parseFloat(etab.longitude) : null
      )

      const etablissementRecord = {
        siret: etab.siret,
        adresse: etab.adresse ?? null,
        code_postal: etab.code_postal ?? null,
        ville: etab.libelle_commune ?? null,
        latitude: etab.latitude ?? null,
        longitude: etab.longitude ?? null,
        distance_km: dist,
        siege: Boolean(etab.est_siege),
        activite_principale: etab.activite_principale ?? null,
        activite_principale_naf25: etab.activite_principale_naf25 ?? null,
      }

      if (!etatCumule.sirenIndex.has(entreprise.siren)) {
        const fit = qualifierFitCible(entreprise)
        etatCumule.sirenIndex.set(entreprise.siren, {
          siren: entreprise.siren,
          nom_complet: entreprise.nom_complet ?? entreprise.nom_raison_sociale ?? null,
          tranche_effectif_salarie: entreprise.tranche_effectif_salarie ?? null,
          categorie_entreprise: entreprise.categorie_entreprise ?? null,
          nombre_etablissements_ouverts: entreprise.nombre_etablissements_ouverts ?? null,
          fit_cible: fit.fit_cible,
          fit_cible_raison: fit.raison,
          etablissements_actifs_locaux: [],
          distance_min_km: null,
        })
        nouveauxSirenCible += 1
      }

      const record = etatCumule.sirenIndex.get(entreprise.siren)
      record.etablissements_actifs_locaux.push(etablissementRecord)
      if (dist !== null && (record.distance_min_km === null || dist < record.distance_min_km)) {
        record.distance_min_km = dist
      }
    }
  }

  return {
    entreprises_brutes_page: entreprisesBrutes.length,
    etablissements_vus_page: etablissementsVusDansPage,
    etablissements_actifs_retenus_page: etablissementsActifsRetenusDansPage,
    nouveaux_siret_page: etatCumule.siretIndex.size - siretVusAvant,
    nouveaux_siren_page: etatCumule.sirenIndex.size - sirenVusAvant,
  }
}

function creerEtatCumule() {
  return {
    siretIndex: new Map(), // siret -> siren
    sirenIndex: new Map(), // siren -> record agrégé
  }
}

module.exports = { isEtablissementActifCible, qualifierFitCible, traiterPage, creerEtatCumule }
