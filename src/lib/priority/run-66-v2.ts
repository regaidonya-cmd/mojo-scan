import { evaluateProspect } from './engine'
import type { ProspectInput, ContactMethod } from './types'
import fs from 'node:fs'

const NOW = new Date().toISOString()
const raw = JSON.parse(fs.readFileSync('/home/claude/p05b1/data66.json', 'utf-8'))
const coords: { companyId: string; lat: number; lng: number }[] = JSON.parse(fs.readFileSync('/home/claude/p05b1/coords66.json', 'utf-8'))
const coordMap = new Map(coords.map((c) => [c.companyId, c]))

// Villeneuve-Saint-Georges (centre de la zone de collecte P0.2B)
const VSG = { lat: 48.7377, lng: 2.4453 }
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// ── READINESS : correction — un fait de segmentation générique
// ("vous êtes diagnostiqueur, preuve confirmée") NE SUFFIT PLUS.
// Seules les entreprises réellement enrichies (P0.4C.3 : site FOUND/AMBIGUOUS/
// NOT_FOUND avec recherche réellement effectuée) ont un angle personnalisé.
function angleFor(row: any): { hasReliableAngle: boolean; angleSource: string } {
  if (row.hasSiteObservation) {
    if (row.siteStatut === 'FOUND') return { hasReliableAngle: true, angleSource: 'Site FOUND (P0.4C.3, enrichissement réel)' }
    if (row.siteStatut === 'AMBIGUOUS') return { hasReliableAngle: true, angleSource: "Site AMBIGUOUS — angle : lever l'ambiguïté en direct" }
    if (row.siteStatut === 'NOT_FOUND') return { hasReliableAngle: true, angleSource: 'Site NOT_FOUND (recherche réellement effectuée) — angle honnête disponible' }
  }
  // Les 61 non enrichis : AUCUN angle personnalisé réel disponible.
  // "Diagnostiqueur certifié" est un fait de SEGMENTATION (pourquoi on les a
  // retenus), pas une OBSERVATION propre à CETTE entreprise permettant de
  // personnaliser une conversation. READINESS doit donc être false ici.
  return { hasReliableAngle: false, angleSource: '' }
}

function buildContacts(row: any): ContactMethod[] {
  const methods: ContactMethod[] = []
  const singlePerson = row.nbPersonnes <= 1
  if (row.hasTelephone) methods.push({ contactMethodId: `${row.companyId}-tel`, type: 'telephone', value: '(masqué agrégat)', nominatif: singlePerson, personneId: singlePerson ? `${row.companyId}-p` : undefined, allowed: true })
  if (row.hasEmail) methods.push({ contactMethodId: `${row.companyId}-email`, type: 'email', value: '(masqué agrégat)', nominatif: singlePerson, personneId: singlePerson ? `${row.companyId}-p` : undefined, allowed: true })
  return methods
}

type Row66 = { input: ProspectInput; distanceKm: number | null; nbPersonnes: number }

const rows: Row66[] = raw.map((row: any) => {
  const { hasReliableAngle, angleSource } = angleFor(row)
  const coord = coordMap.get(row.companyId)
  const distanceKm = coord ? haversineKm(VSG, coord) : null
  const input: ProspectInput = {
    companyId: row.companyId,
    companyName: row.companyName,
    fitCible: row.fitCible,
    preuveMetier: row.preuveMetier,
    proximiteLocale: distanceKm !== null ? distanceKm <= 20 : true,
    pipelineStage: 'A_CONTACTER',
    contactMethods: buildContacts(row),
    hasReliableAngle,
    angleSource,
    globalOppositionActive: false,
    isLostDefinitive: false,
    isWon: false,
    events: [],
    now: NOW,
  }
  return { input, distanceKm, nbPersonnes: row.nbPersonnes }
})

const results = rows.map((r) => ({ ...evaluateProspect(r.input), distanceKm: r.distanceKm, nbPersonnes: r.nbPersonnes }))

function tally<T extends string>(items: T[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const i of items) out[i] = (out[i] || 0) + 1
  return out
}

console.log('=== DISTRIBUTION POTENTIEL ===', tally(results.map((r) => r.potentiel)))
console.log('=== DISTRIBUTION TEMPERATURE ===', tally(results.map((r) => r.temperature)))
console.log('=== DISTRIBUTION PRIORITE ===', tally(results.map((r) => r.priorite)))
console.log('=== DISTRIBUTION CONTACTABLE ===', tally(results.map((r) => String(r.contactable))))
console.log('=== DISTRIBUTION READINESS (corrigée) ===', tally(results.map((r) => String(r.readiness))))
console.log('=== DISTRIBUTION NBA ===', tally(results.map((r) => r.nextBestAction.type)))

console.log('\n=== SEGMENTATION ===')
const segA = results.filter((r) => r.contactable && r.readiness)
const segB = results.filter((r) => r.contactable && !r.readiness)
const segC = results.filter((r) => !r.contactable)
const segD = results.filter((r) => r.priorite === 'STOP')
console.log(`A. CONTACTABLE + READY: ${segA.length}`)
console.log(`B. CONTACTABLE + NOT READY: ${segB.length}`)
console.log(`C. NON CONTACTABLE: ${segC.length} ->`, segC.map((r) => r.companyName))
console.log(`D. STOP: ${segD.length}`)

console.log('\n=== TOP 10 (avec distance reelle en tie-break) ===')
const priorityOrder = ['STOP', 'P0', 'P1', 'P2', 'P3', 'P4']
const sorted = [...results].sort((a, b) => {
  const pDiff = priorityOrder.indexOf(a.priorite) - priorityOrder.indexOf(b.priorite)
  if (pDiff !== 0) return pDiff
  if (b.secondaryScore !== a.secondaryScore) return b.secondaryScore - a.secondaryScore
  // readiness avant non-readiness (executable immediatement)
  if (a.readiness !== b.readiness) return a.readiness ? -1 : 1
  const aDirect = a.nextBestAction.type === 'CALL' || a.nextBestAction.type === 'EMAIL' ? 0 : 1
  const bDirect = b.nextBestAction.type === 'CALL' || b.nextBestAction.type === 'EMAIL' ? 0 : 1
  if (aDirect !== bDirect) return aDirect - bDirect
  // distance reelle comme tie-break operationnel (jamais temperature/preuve de besoin)
  const da = a.distanceKm ?? 999
  const db = b.distanceKm ?? 999
  if (Math.abs(da - db) > 0.5) return da - db
  return a.companyName.localeCompare(b.companyName) // dernier recours, PAS un signal commercial
})
sorted.slice(0, 10).forEach((r, i) => {
  console.log(
    `${i + 1}. ${r.companyName} — P:${r.priorite} score:${r.secondaryScore} contactable:${r.contactable} ready:${r.readiness} NBA:${r.nextBestAction.type} dist:${r.distanceKm?.toFixed(1)}km nbPersonnes:${r.nbPersonnes}`
  )
})

console.log('\n=== BESOIN ENRICHISSEMENT ===')
console.log(`READY sans enrichissement supplementaire: ${segA.length}/66`)
console.log(`CONTACTABLE mais NOT READY (necessite angle): ${segB.length}/66`)
