import { evaluateProspect } from './engine'
import type { ProspectInput, ContactMethod } from './types'
import fs from 'node:fs'

const NOW = new Date().toISOString()
const raw = JSON.parse(fs.readFileSync('/home/claude/p05b1/data66.json', 'utf-8'))

function angleFor(row: any): { hasReliableAngle: boolean; angleSource: string } {
  if (row.hasSiteObservation) {
    if (row.siteStatut === 'FOUND') return { hasReliableAngle: true, angleSource: 'Site FOUND (P0.4C.3)' }
    if (row.siteStatut === 'AMBIGUOUS') return { hasReliableAngle: true, angleSource: 'Site AMBIGUOUS — angle : lever l\'ambiguïté en direct' }
    if (row.siteStatut === 'NOT_FOUND') return { hasReliableAngle: true, angleSource: 'Site NOT_FOUND (recherche effectuée) — angle honnête disponible' }
  }
  // Les 61 non enrichis via P0.4C : l'angle de base repose sur le FAIT réel de la
  // preuve métier (certification ADI), pas une invention. C'est un choix explicite
  // à faire valider en P0.5B.2 — voir warning ci-dessous.
  return { hasReliableAngle: true, angleSource: `Fait : preuve métier ${row.preuveMetier} (non enrichi web)` }
}

function buildContacts(row: any): ContactMethod[] {
  const methods: ContactMethod[] = []
  // Simplification pour l'agrégat des 66 : on ne dispose ici que de flags
  // hasTelephone/hasEmail (pas du détail par personne), donc on modélise un
  // contact nominatif générique par type présent. Les 5 déjà enrichis en
  // détail (run-real-5.ts) restent la source de vérité pour leur cas précis.
  if (row.hasTelephone) methods.push({ contactMethodId: `${row.companyId}-tel`, type: 'telephone', value: '(masqué agrégat)', nominatif: row.nbPersonnes <= 1, personneId: row.nbPersonnes <= 1 ? `${row.companyId}-p` : undefined, allowed: true })
  if (row.hasEmail) methods.push({ contactMethodId: `${row.companyId}-email`, type: 'email', value: '(masqué agrégat)', nominatif: row.nbPersonnes <= 1, personneId: row.nbPersonnes <= 1 ? `${row.companyId}-p` : undefined, allowed: true })
  return methods
}

const inputs: ProspectInput[] = raw.map((row: any) => {
  const { hasReliableAngle, angleSource } = angleFor(row)
  return {
    companyId: row.companyId,
    companyName: row.companyName,
    fitCible: row.fitCible,
    preuveMetier: row.preuveMetier,
    proximiteLocale: true, // collecte P0.2B limitée à 20km de Villeneuve-Saint-Georges
    pipelineStage: 'A_CONTACTER',
    contactMethods: buildContacts(row),
    hasReliableAngle,
    angleSource,
    globalOppositionActive: false, // confirmé 0 opposition dans toute la base
    isLostDefinitive: false,
    isWon: false,
    events: [], // aucun evenement reel disponible (activites=0, diagnostics non lies a ces 66)
    now: NOW,
  }
})

const results = inputs.map(evaluateProspect)

// ── Agrégats ─────────────────────────────────────────────────────
function tally<T extends string>(items: T[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const i of items) out[i] = (out[i] || 0) + 1
  return out
}

console.log('=== DISTRIBUTION POTENTIEL ===', tally(results.map((r) => r.potentiel)))
console.log('=== DISTRIBUTION TEMPERATURE ===', tally(results.map((r) => r.temperature)))
console.log('=== DISTRIBUTION PRIORITE ===', tally(results.map((r) => r.priorite)))
console.log('=== DISTRIBUTION READINESS ===', tally(results.map((r) => String(r.readiness))))
console.log('=== DISTRIBUTION NBA ===', tally(results.map((r) => r.nextBestAction.type)))
console.log('Nombre sans canal exploitable:', results.filter((r) => r.selectedContact === null && r.warnings.some(w => w.includes('Aucun moyen'))).length)
console.log('Nombre avec au moins un warning:', results.filter((r) => r.warnings.length > 0).length)
console.log('Nombre STOP:', results.filter((r) => r.priorite === 'STOP').length)

console.log('\n=== ANOMALIES ===')
for (const r of results) {
  if (r.warnings.some((w) => w.includes('Aucun moyen de contact'))) {
    console.log(`- ${r.companyName} : AUCUN CONTACT (PRET_A_PROSPECTER attendu CONTACTABLE)`)
  }
}

console.log('\n=== TOP 10 "J\'ai du temps, qui dois-je prospecter ?" ===')
const priorityOrder = ['STOP', 'P0', 'P1', 'P2', 'P3', 'P4']
const sorted = [...results].sort((a, b) => {
  const pDiff = priorityOrder.indexOf(a.priorite) - priorityOrder.indexOf(b.priorite)
  if (pDiff !== 0) return pDiff
  if (b.secondaryScore !== a.secondaryScore) return b.secondaryScore - a.secondaryScore
  const aDirect = a.nextBestAction.type === 'CALL' || a.nextBestAction.type === 'EMAIL' ? 0 : 1
  const bDirect = b.nextBestAction.type === 'CALL' || b.nextBestAction.type === 'EMAIL' ? 0 : 1
  if (aDirect !== bDirect) return aDirect - bDirect
  return a.companyName.localeCompare(b.companyName)
})
sorted.slice(0, 10).forEach((r, i) => {
  console.log(`${i + 1}. ${r.companyName} — ${r.priorite}, score ${r.secondaryScore}, NBA ${r.nextBestAction.type}, raison: ${r.whyNow[r.whyNow.length - 1]}`)
})
