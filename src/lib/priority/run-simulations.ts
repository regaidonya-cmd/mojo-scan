import { evaluateProspect } from './engine'
import type { ProspectInput, CommercialEvent } from './types'

const NOW = '2026-09-14T16:00:00Z'

function base(overrides: Partial<ProspectInput>): ProspectInput {
  return {
    companyId: 'sim',
    companyName: 'SIM',
    fitCible: 'CIBLE',
    preuveMetier: 'CONFIRME',
    proximiteLocale: true,
    pipelineStage: 'A_CONTACTER',
    contactMethods: [{ contactMethodId: 'c1', type: 'telephone', value: 'x', nominatif: true, personneId: 'p1', allowed: true }],
    hasReliableAngle: true,
    angleSource: 'test',
    globalOppositionActive: false,
    isLostDefinitive: false,
    isWon: false,
    events: [],
    now: NOW,
    ...overrides,
  }
}

console.log('A. DVM complete Scan "amelioration visibilite locale"')
{
  const events: CommercialEvent[] = [{ kind: 'SCAN_COMPLETED_WITH_NEED', occurredAt: NOW, originatedByProspect: true }]
  const r = evaluateProspect(base({ companyName: 'DVM DIAGNOSTIC', events }))
  console.log(`  -> temperature=${r.temperature}, priorite=${r.priorite} (attendu CHAUD/P1)`)
}

console.log('B. BATIMO "Oui, appelez-moi demain"')
{
  const events: CommercialEvent[] = [{ kind: 'CALLBACK_REQUESTED', occurredAt: NOW, dueAt: '2026-09-15T10:00:00Z', originatedByProspect: true, signalChannel: 'telephone' }]
  const r = evaluateProspect(base({ companyName: 'BATIMO CONSEIL', events }))
  console.log(`  -> temperature=${r.temperature}, priorite=${r.priorite}, NBA=${r.nextBestAction.type} (attendu CHAUD/P0/CALL)`)
}

console.log('C. DIAGADOM RDV dans 2h')
{
  const events: CommercialEvent[] = [{ kind: 'RDV_SCHEDULED', occurredAt: NOW, dueAt: '2026-09-14T18:00:00Z', originatedByProspect: true }]
  const r = evaluateProspect(base({ companyName: 'DIAGADOM', events }))
  console.log(`  -> temperature=${r.temperature}, priorite=${r.priorite}, NBA=${r.nextBestAction.type} (attendu CHAUD/P0/PREPARE_RDV)`)
}

console.log('D. ACAPA opposition globale')
{
  const r = evaluateProspect(base({ companyName: 'ACAPA', globalOppositionActive: true }))
  console.log(`  -> priorite=${r.priorite}, NBA=${r.nextBestAction.type} (attendu STOP)`)
}

console.log('E. ARTWELL proposition envoyee spontanement par MOJO puis 7j sans reponse')
{
  console.log('  E1. Avant proposition (etat de base):')
  const r0 = evaluateProspect(base({ companyName: 'ARTWELL DIAGNOSTICS' }))
  console.log(`      temperature=${r0.temperature}, priorite=${r0.priorite}, NBA=${r0.nextBestAction.type}`)

  console.log('  E2. Proposition envoyee (action MOJO):')
  const eventsProposal: CommercialEvent[] = [{ kind: 'PROPOSAL_SENT', occurredAt: NOW, originatedByProspect: false }]
  const r1 = evaluateProspect(base({ companyName: 'ARTWELL DIAGNOSTICS', events: eventsProposal, pipelineStage: 'PROPOSITION' }))
  console.log(`      temperature=${r1.temperature} (attendu FROID inchangee), priorite=${r1.priorite}, NBA=${r1.nextBestAction.type} (attendu WAIT)`)

  console.log('  E3. Apres 7 jours sans reponse:')
  const events7j: CommercialEvent[] = [
    { kind: 'PROPOSAL_SENT', occurredAt: NOW, originatedByProspect: false },
    { kind: 'NO_REPLY_AFTER_DELAY', occurredAt: '2026-09-21T16:00:00Z', originatedByProspect: false },
  ]
  const nowPlus7 = '2026-09-21T16:00:00Z'
  const r2 = evaluateProspect(base({ companyName: 'ARTWELL DIAGNOSTICS', events: events7j, pipelineStage: 'PROPOSITION', now: nowPlus7 }))
  console.log(`      temperature=${r2.temperature} (attendu FROID toujours inchangee), priorite=${r2.priorite} (attendu P2), NBA=${r2.nextBestAction.type} (attendu FOLLOW_UP)`)
}
