#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { collecter, normaliserMode } = require('./src/collect')
const { construireRapport } = require('./src/report')
const config = require('./src/config')

async function main() {
  let mode
  try {
    mode = normaliserMode(process.env.MODE || 'LIVE_API')
  } catch (err) {
    console.error(`[P0.2B] ${err.message}`)
    process.exitCode = 1
    return
  }
  const importDir = process.env.IMPORT_DIR || path.join(__dirname, 'import')

  console.error(`[P0.2B] Recette : ${config.recette.nom}`)
  console.error(`[P0.2B] Mode de collecte : ${mode}${mode === 'JSON_IMPORT' ? ` (dossier: ${importDir})` : ''}`)
  console.error(
    `[P0.2B] Zone/activité — centre=(${config.center.lat},${config.center.long}) rayon=${config.radiusKm}km ` +
      `activite=${config.activite.codes.join(', ') || '(aucun filtre NAF)'} (${config.activite.nomenclature}) ` +
      `plafond_pages=${config.maxPages}`
  )

  let totalPagesConnu = '?'
  const tallyFitCible = { CIBLE: 0, HORS_CIBLE: 0, INCONNU: 0 }

  const resultat = await collecter({
    mode,
    importDir,
    onPage: (ligne, contexte) => {
      if (contexte && contexte.totalPages) totalPagesConnu = contexte.totalPages
      // Recalcule le tally CIBLE/HORS_CIBLE/INCONNU cumulé à partir de l'état courant
      if (contexte && contexte.sirenIndex) {
        tallyFitCible.CIBLE = 0
        tallyFitCible.HORS_CIBLE = 0
        tallyFitCible.INCONNU = 0
        for (const p of contexte.sirenIndex.values()) tallyFitCible[p.fit_cible] += 1
      }
      console.error(
        `[P0.2B] page ${ligne.page}/${totalPagesConnu} — bruts=${ligne.entreprises_brutes_page} ` +
          `etab_vus=${ligne.etablissements_vus_page} etab_actifs=${ligne.etablissements_actifs_retenus_page} ` +
          `(cumul SIRET=${ligne.siret_uniques_cumules} SIREN=${ligne.siren_uniques_cumules}) ` +
          `CIBLE=${tallyFitCible.CIBLE} HORS_CIBLE=${tallyFitCible.HORS_CIBLE} INCONNU=${tallyFitCible.INCONNU}`
      )
    },
  })

  const rapport = construireRapport(resultat)

  const outDir = path.join(__dirname, 'output')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, `rapport-p02b-${Date.now()}.json`)
  fs.writeFileSync(outPath, JSON.stringify(rapport, null, 2), 'utf8')

  console.error(`[P0.2B] Terminé. Rapport écrit dans : ${outPath}`)
  console.error(`[P0.2B] Statut de l'échantillon : ${rapport.echantillon.statut}`)
  if (rapport.echantillon.avertissement) {
    console.error(`[P0.2B] ⚠️  ${rapport.echantillon.avertissement}`)
  }
  console.error(`[P0.2B] Aucune écriture Supabase. Aucun service payant utilisé.`)
  console.log(JSON.stringify(rapport, null, 2))
}

main().catch((err) => {
  console.error('[P0.2B] Erreur fatale:', err)
  process.exitCode = 1
})
