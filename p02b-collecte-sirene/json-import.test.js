'use strict'

const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { collecter } = require('../src/collect')
const { construireRapport } = require('../src/report')
const fixture = require('./fixture-realshape.json')

function creerDossierTemporaire() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'p02b-import-test-'))
}

async function testPartiel() {
  // ⚠️ SIMULATION STRUCTURELLE de la situation "1 page sur 130" réellement
  // rencontrée (total_results=3226, total_pages=130) : on réutilise la
  // fixture synthétique existante en y forçant ces deux valeurs, pour
  // tester le comportement du statut PARTIEL. Les entreprises contenues
  // dans cette page sont FICTIVES — ce N'EST PAS une vraie page de
  // Villeneuve-Saint-Georges, seule la MÉCANIQUE de détection est validée
  // ici, pas le contenu réel de la zone.
  const dossier = creerDossierTemporaire()
  const page1 = { ...fixture, page: 1, total_results: 3226, total_pages: 130 }
  fs.writeFileSync(path.join(dossier, 'page-1.json'), JSON.stringify(page1))

  const resultat = await collecter({ mode: 'JSON_IMPORT', importDir: dossier })
  const rapport = construireRapport(resultat)

  assert.strictEqual(rapport.source_collecte, 'JSON_IMPORT', "source_collecte doit valoir 'JSON_IMPORT'")
  assert.strictEqual(rapport.echantillon.statut, 'PARTIEL', 'avec 1 page sur 130, le statut doit être PARTIEL')
  assert.strictEqual(rapport.echantillon.total_pages_annonce_api, 130)
  assert.strictEqual(rapport.echantillon.total_results_annonce_api, 3226)
  assert.strictEqual(rapport.echantillon.nombre_pages_fournies, 1)
  assert.deepStrictEqual(rapport.echantillon.numeros_pages_fournies, [1])
  assert.strictEqual(rapport.echantillon.numeros_pages_manquantes.length, 129, '129 pages doivent être signalées manquantes')
  assert.ok(rapport.echantillon.avertissement, "un avertissement explicite doit être présent en cas d'échantillon PARTIEL")
  assert.ok(
    rapport.echantillon.avertissement.includes('PARTIEL'),
    "l'avertissement doit mentionner explicitement le caractère partiel"
  )

  console.log('✅ Cas PARTIEL (simulation structurelle 1/130, données fictives) correctement détecté et signalé.')
  fs.rmSync(dossier, { recursive: true, force: true })
}

async function testComplet() {
  // Deux pages fournies, total_pages=2 -> échantillon complet
  const dossier = creerDossierTemporaire()
  const page1 = { ...fixture, page: 1, total_results: 12, total_pages: 2 }
  const page2 = { ...fixture, page: 2, total_results: 12, total_pages: 2 }
  fs.writeFileSync(path.join(dossier, 'page-1.json'), JSON.stringify(page1))
  fs.writeFileSync(path.join(dossier, 'page-2.json'), JSON.stringify(page2))

  const resultat = await collecter({ mode: 'JSON_IMPORT', importDir: dossier })
  const rapport = construireRapport(resultat)

  assert.strictEqual(rapport.echantillon.statut, 'COMPLET', 'avec 2 pages sur 2, le statut doit être COMPLET')
  assert.strictEqual(rapport.echantillon.numeros_pages_manquantes.length, 0)
  assert.strictEqual(rapport.echantillon.avertissement, null, 'aucun avertissement ne doit être présent si COMPLET')
  // Les deux pages contiennent les mêmes entreprises (fixture dupliquée) ->
  // la déduplication SIREN doit s'appliquer aussi ACROSS pages, preuve que
  // le pipeline est bien identique à celui utilisé en LIVE_API.
  assert.strictEqual(rapport.funnel.siren_uniques, 3, 'la déduplication SIREN doit fonctionner à travers plusieurs pages importées')

  console.log('✅ Cas COMPLET (2/2 pages) correctement détecté, déduplication cross-pages vérifiée.')
  fs.rmSync(dossier, { recursive: true, force: true })
}

async function testFichierPageManquanteRefuse() {
  // Un fichier sans champ "page" numérique doit être rejeté explicitement,
  // pas silencieusement ignoré ou mal ordonné.
  const dossier = creerDossierTemporaire()
  fs.writeFileSync(path.join(dossier, 'invalide.json'), JSON.stringify({ results: [] }))

  const resultat = await collecter({ mode: 'JSON_IMPORT', importDir: dossier })
  assert.ok(
    resultat.anomalies.some((a) => a.type === 'erreur_import_json'),
    'un fichier sans champ page exploitable doit produire une anomalie erreur_import_json'
  )
  console.log('✅ Fichier sans champ "page" exploitable correctement rejeté avec anomalie explicite.')
  fs.rmSync(dossier, { recursive: true, force: true })
}

async function testTotalPagesIncoherent() {
  const dossier = creerDossierTemporaire()
  fs.writeFileSync(path.join(dossier, 'p1.json'), JSON.stringify({ ...fixture, page: 1, total_results: 100, total_pages: 5 }))
  fs.writeFileSync(path.join(dossier, 'p2.json'), JSON.stringify({ ...fixture, page: 2, total_results: 100, total_pages: 6 }))

  const resultat = await collecter({ mode: 'JSON_IMPORT', importDir: dossier })
  const rapport = construireRapport(resultat)

  assert.ok(
    resultat.anomalies.some((a) => a.type === 'erreur_import_json' && /total_pages/.test(a.message)),
    'une anomalie explicite mentionnant total_pages doit être produite'
  )
  assert.notStrictEqual(rapport.echantillon.statut, 'COMPLET', 'un lot incohérent ne doit JAMAIS être déclaré COMPLET')
  assert.strictEqual(rapport.funnel.siren_uniques, 0, 'le lot incohérent doit être intégralement refusé, aucune donnée fusionnée')

  console.log('✅ Incohérence total_pages entre deux fichiers correctement détectée, lot refusé, jamais COMPLET.')
  fs.rmSync(dossier, { recursive: true, force: true })
}

async function testTotalResultsIncoherent() {
  const dossier = creerDossierTemporaire()
  fs.writeFileSync(path.join(dossier, 'p1.json'), JSON.stringify({ ...fixture, page: 1, total_results: 100, total_pages: 5 }))
  fs.writeFileSync(path.join(dossier, 'p2.json'), JSON.stringify({ ...fixture, page: 2, total_results: 101, total_pages: 5 }))

  const resultat = await collecter({ mode: 'JSON_IMPORT', importDir: dossier })
  const rapport = construireRapport(resultat)

  assert.ok(
    resultat.anomalies.some((a) => a.type === 'erreur_import_json' && /total_results/.test(a.message)),
    'une anomalie explicite mentionnant total_results doit être produite'
  )
  assert.notStrictEqual(rapport.echantillon.statut, 'COMPLET', 'un lot incohérent ne doit JAMAIS être déclaré COMPLET')

  console.log('✅ Incohérence total_results entre deux fichiers correctement détectée, lot refusé.')
  fs.rmSync(dossier, { recursive: true, force: true })
}

async function testPageHorsPlage() {
  const dossier = creerDossierTemporaire()
  // total_pages=5 mais un fichier déclare page=7 : hors plage [1,5]
  fs.writeFileSync(path.join(dossier, 'p1.json'), JSON.stringify({ ...fixture, page: 1, total_results: 100, total_pages: 5 }))
  fs.writeFileSync(path.join(dossier, 'p7.json'), JSON.stringify({ ...fixture, page: 7, total_results: 100, total_pages: 5 }))

  const resultat = await collecter({ mode: 'JSON_IMPORT', importDir: dossier })
  const rapport = construireRapport(resultat)

  assert.ok(
    resultat.anomalies.some((a) => a.type === 'erreur_import_json' && /hors plage/.test(a.message)),
    'une anomalie explicite "page hors plage" doit être produite'
  )
  assert.notStrictEqual(rapport.echantillon.statut, 'COMPLET', 'un lot incohérent ne doit JAMAIS être déclaré COMPLET')

  console.log('✅ Page hors plage (7 sur total_pages=5) correctement détectée, lot refusé.')
  fs.rmSync(dossier, { recursive: true, force: true })
}

async function testModeInvalide() {
  // Valeurs vraiment invalides -> toujours rejetées explicitement
  await assert.rejects(
    () => collecter({ mode: 'LIVE-API' }), // faute de frappe volontaire (tiret au lieu d'underscore)
    /Mode de collecte invalide/,
    'une faute de frappe dans MODE ne doit JAMAIS être silencieusement traitée comme LIVE_API'
  )
  await assert.rejects(
    () => collecter({ mode: 'FOO' }),
    /Mode de collecte invalide/,
    'une valeur totalement inconnue doit être rejetée explicitement'
  )

  // Règle validée : la casse utilisateur est acceptée puis normalisée en
  // majuscules, PUIS comparée aux modes valides. 'json_import' en
  // minuscules doit donc être accepté (normalisé en 'JSON_IMPORT'),
  // contrairement à une faute de frappe structurelle comme 'LIVE-API'.
  const dossier = creerDossierTemporaire()
  fs.writeFileSync(path.join(dossier, 'p1.json'), JSON.stringify({ ...fixture, page: 1, total_results: 6, total_pages: 1 }))
  const resultat = await collecter({ mode: 'json_import', importDir: dossier })
  assert.strictEqual(resultat.mode, 'JSON_IMPORT', "'json_import' en minuscules doit être normalisé en 'JSON_IMPORT'")
  fs.rmSync(dossier, { recursive: true, force: true })

  console.log('✅ Mode : casse normalisée puis validée ; toute valeur non reconnue après normalisation est explicitement rejetée.')
}

async function run() {
  await testPartiel()
  await testComplet()
  await testFichierPageManquanteRefuse()
  await testTotalPagesIncoherent()
  await testTotalResultsIncoherent()
  await testPageHorsPlage()
  await testModeInvalide()
  console.log('\n✅ Tous les tests du mode JSON_IMPORT sont passés.')
}

run().catch((err) => {
  console.error('❌ Échec des tests JSON_IMPORT:', err)
  process.exitCode = 1
})
