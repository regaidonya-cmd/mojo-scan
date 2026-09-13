'use strict'

const assert = require('assert')
const { collecter } = require('../src/collect')
const { construireRapport } = require('../src/report')
const fixture = require('./fixture-realshape.json')

async function testProspectsPresentsEtCoherents() {
  const resultat = await collecter({ mode: 'JSON_IMPORT', importDir: (() => {
    const fs = require('fs')
    const os = require('os')
    const path = require('path')
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'p02b-report-test-'))
    fs.writeFileSync(path.join(dossier, 'page-1.json'), JSON.stringify(fixture))
    return dossier
  })() })

  const rapport = construireRapport(resultat)

  assert.ok(Array.isArray(rapport.prospects), "le rapport doit contenir un tableau 'prospects'")
  assert.strictEqual(
    rapport.prospects.length,
    rapport.funnel.siren_uniques,
    'le nombre de prospects détaillés doit correspondre exactement à funnel.siren_uniques'
  )
  assert.ok(rapport.prospects.length > 0, 'le scénario de test doit produire au moins un prospect')

  const p = rapport.prospects[0]
  const champsAttendus = [
    'siren', 'nom_complet', 'tranche_effectif_salarie', 'categorie_entreprise',
    'nombre_etablissements_ouverts', 'fit_cible', 'fit_cible_raison', 'distance_min_km',
    'etablissements_actifs_locaux',
  ]
  for (const champ of champsAttendus) {
    assert.ok(champ in p, `le prospect doit exposer le champ '${champ}'`)
  }
  assert.ok(Array.isArray(p.etablissements_actifs_locaux) && p.etablissements_actifs_locaux.length > 0)
  const e = p.etablissements_actifs_locaux[0]
  const champsEtablissementAttendus = [
    'siret', 'adresse', 'code_postal', 'ville', 'latitude', 'longitude',
    'distance_km', 'siege', 'activite_principale', 'activite_principale_naf25',
  ]
  for (const champ of champsEtablissementAttendus) {
    assert.ok(champ in e, `chaque établissement local doit exposer le champ '${champ}'`)
  }

  // Non-régression : les métriques agrégées existantes ne doivent pas disparaître
  assert.ok(typeof rapport.funnel.siret_uniques === 'number')
  assert.ok(Array.isArray(rapport.exemples_cible_ou_inconnu))
  assert.ok(Array.isArray(rapport.exemples_hors_cible))

  console.log("✅ L'artifact P0.2B contient bien 'prospects[]', détaillé et cohérent avec funnel.siren_uniques, sans perte des métriques existantes.")
}

testProspectsPresentsEtCoherents().catch((err) => {
  console.error('❌ Échec test report.js:', err)
  process.exitCode = 1
})
