'use strict'

const assert = require('assert')
const fixture = require('./fixture-realshape.json')
const { traiterPage, creerEtatCumule } = require('../src/pipeline')

function run() {
  const etat = creerEtatCumule()
  const metriques = traiterPage(fixture, etat)

  console.log('Métriques de la page (fixture):', metriques)

  // 6 lignes "results" dans la fixture (dont 1 SIREN dupliqué avec 2 établissements)
  assert.strictEqual(metriques.entreprises_brutes_page, 6, 'entreprises_brutes_page attendu = 6')

  // Établissements réellement actifs ET 71.20B exact ET non fermés :
  //   - 111111111 (siège)      -> actif, 71.20B          -> retenu
  //   - 222222222 (GE)         -> actif, 71.20B           -> retenu (le filtre fit_cible se fait APRÈS, pas ici)
  //   - 333333333              -> FERMÉ (etat F)           -> exclu
  //   - 444444444              -> actif MAIS 71.20A (pas B) -> exclu
  //   - 555555555              -> actif, 71.20B            -> retenu
  //   - 111111111 (2e étab.)   -> actif, 71.20B            -> retenu
  assert.strictEqual(metriques.etablissements_actifs_retenus_page, 4, 'etablissements_actifs_retenus_page attendu = 4')

  // SIRET uniques attendus : 4 établissements retenus, 4 SIRET distincts
  assert.strictEqual(etat.siretIndex.size, 4, 'SIRET uniques attendus = 4')

  // SIREN uniques attendus : 111111111 (x2 établissements regroupés), 222222222, 555555555 = 3
  assert.strictEqual(etat.sirenIndex.size, 3, 'SIREN uniques attendus = 3')

  const prospect1 = etat.sirenIndex.get('111111111')
  assert.strictEqual(prospect1.etablissements_actifs_locaux.length, 2, 'SIREN 111111111 doit avoir 2 établissements locaux actifs rattachés')
  assert.strictEqual(prospect1.fit_cible, 'CIBLE', 'SIREN 111111111 (tranche 01, PME) doit être CIBLE')
  assert.ok(prospect1.distance_min_km !== null && prospect1.distance_min_km < 1, 'distance_min_km doit être calculée et cohérente (proche du centre)')

  const prospect2 = etat.sirenIndex.get('222222222')
  assert.strictEqual(prospect2.fit_cible, 'HORS_CIBLE', 'SIREN 222222222 (GE, 310 étab. ouverts, tranche 31) doit être HORS_CIBLE (signaux convergents)')

  const prospect5 = etat.sirenIndex.get('555555555')
  assert.strictEqual(prospect5.fit_cible, 'INCONNU', 'SIREN 555555555 (effectif/catégorie absents) doit être INCONNU, jamais HORS_CIBLE ni CIBLE par défaut')

  assert.ok(!etat.sirenIndex.has('333333333'), 'SIREN 333333333 (établissement fermé) ne doit produire aucun prospect')
  assert.ok(!etat.sirenIndex.has('444444444'), 'SIREN 444444444 (NAF 71.20A ≠ 71.20B) ne doit produire aucun prospect')

  console.log('\n✅ Tous les tests structurels P0.2B sont passés.')
  console.log('   (Validation de la LOGIQUE du pipeline sur données figées — pas un test contre la vraie API.)')
}

run()
