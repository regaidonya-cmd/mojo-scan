'use strict'

const assert = require('assert')
const { collecter } = require('../src/collect')
const { construireRapport } = require('../src/report')
const fixture = require('./fixture-realshape.json')

/**
 * Fabrique un faux `fetchPage(page)` (même signature que le vrai client
 * HTTP) qui renvoie des pages prédéfinies, pour tester le comportement
 * LIVE_API sans aucun appel réseau. C'est le mécanisme d'injection prévu
 * dans collect.js exclusivement pour les tests.
 */
function fabriquerFetchSimule(pagesParNumero) {
  return async function fetchSimule(page) {
    const json = pagesParNumero[page]
    if (!json) throw new Error(`Page ${page} non définie dans ce scénario de test`)
    return json
  }
}

async function testCoherenceOk() {
  // 2 pages cohérentes entre elles -> tout se déroule normalement
  const pages = {
    1: { ...fixture, page: 1, total_results: 6, total_pages: 2 },
    2: { ...fixture, page: 2, total_results: 6, total_pages: 2 },
  }
  const resultat = await collecter({ mode: 'LIVE_API', fetchPage: fabriquerFetchSimule(pages) })
  const rapport = construireRapport(resultat)

  assert.strictEqual(rapport.source_collecte, 'LIVE_API')
  assert.strictEqual(rapport.echantillon.statut, 'COMPLET', '2 pages cohérentes sur 2 annoncées -> COMPLET')
  assert.strictEqual(resultat.anomalies.length, 0, 'aucune anomalie attendue sur un scénario cohérent')

  console.log('✅ LIVE_API : scénario cohérent (2/2 pages) correctement traité, statut COMPLET.')
}

async function testIncoherenceInterruptCollecte() {
  // La page 2 change total_results en cours de route -> divergence détectée
  // pendant la collecte elle-même (pas après coup) : la collecte doit
  // s'interrompre PROPREMENT, la page 1 déjà traitée doit rester
  // comptabilisée (contrairement à JSON_IMPORT qui rejette tout le lot),
  // et le rapport ne doit JAMAIS afficher COMPLET.
  const pages = {
    1: { ...fixture, page: 1, total_results: 6, total_pages: 3 },
    2: { ...fixture, page: 2, total_results: 999, total_pages: 3 }, // incohérent
    3: { ...fixture, page: 3, total_results: 6, total_pages: 3 }, // ne doit jamais être atteinte
  }
  let page3Appelee = false
  const fetchSimule = async (page) => {
    if (page === 3) page3Appelee = true
    return fabriquerFetchSimule(pages)(page)
  }

  const resultat = await collecter({ mode: 'LIVE_API', fetchPage: fetchSimule })
  const rapport = construireRapport(resultat)

  assert.ok(
    resultat.anomalies.some((a) => a.type === 'incoherence_pages_live_api' && /total_results/.test(a.message)),
    'une anomalie explicite incoherence_pages_live_api mentionnant total_results doit être produite'
  )
  assert.strictEqual(rapport.echantillon.statut, 'PARTIEL', 'une incohérence en cours de route ne doit JAMAIS produire COMPLET')
  assert.strictEqual(rapport.funnel.pages_reellement_parcourues, 1, 'seule la page 1 (avant la divergence) doit avoir été traitée')
  assert.ok(rapport.funnel.siren_uniques > 0, 'les données de la page 1, déjà valide, doivent rester comptabilisées')
  assert.strictEqual(page3Appelee, false, 'la collecte doit s\'arrêter net à la divergence, ne jamais tenter la page suivante')

  console.log('✅ LIVE_API : incohérence détectée en cours de route -> collecte interrompue proprement, page 1 conservée, jamais COMPLET.')
}

async function run() {
  await testCoherenceOk()
  await testIncoherenceInterruptCollecte()
  console.log('\n✅ Tous les tests de cohérence LIVE_API sont passés.')
}

run().catch((err) => {
  console.error('❌ Échec des tests LIVE_API:', err)
  process.exitCode = 1
})
