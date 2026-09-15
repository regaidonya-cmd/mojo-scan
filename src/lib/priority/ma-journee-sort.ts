import type { ProspectViewModel } from './fetch-real'

const PRIORITY_ORDER = ['STOP', 'P0', 'P1', 'P2', 'P3', 'P4']

export interface MaJourneeClassification {
  zoneA: ProspectViewModel[] // P0/P1 réels uniquement
  zoneBReady: ProspectViewModel[] // READY, triés P2 d'abord puis score
  aPreparer: ProspectViewModel[] // NOT READY (QUALIFY/ENRICH/A_VERIFIER), STOP exclus
}

export function classifyForMaJournee(all: ProspectViewModel[]): MaJourneeClassification {
  const stop = all.filter((v) => v.engine.priorite === 'STOP')
  const zoneA = all.filter((v) => v.engine.priorite === 'P0' || v.engine.priorite === 'P1')
  const rest = all.filter((v) => v.engine.priorite !== 'STOP' && v.engine.priorite !== 'P0' && v.engine.priorite !== 'P1')

  const zoneBReady = rest
    .filter((v) => v.business.ready)
    .sort(deterministicSort)

  const aPreparer = rest
    .filter((v) => !v.business.ready)
    .sort(deterministicSort)

  // stop est volontairement exclu de tous les affichages (aucune action possible)
  void stop

  return { zoneA: zoneA.sort(zoneASort), zoneBReady, aPreparer }
}

function zoneASort(a: ProspectViewModel, b: ProspectViewModel): number {
  const pDiff = PRIORITY_ORDER.indexOf(a.engine.priorite) - PRIORITY_ORDER.indexOf(b.engine.priorite)
  if (pDiff !== 0) return pDiff
  return a.companyName.localeCompare(b.companyName)
}

/**
 * Tri déterministe Zone B / A préparer :
 * priorité > score secondaire > readiness > action directe (CALL/EMAIL avant QUALIFY)
 * > alphabétique (dernier recours, jamais présenté comme un signal commercial).
 * NOTE (limite P0.6A) : la distance géographique réelle n'est pas encore
 * intégrée dans cette couche — cf. rapport final, point 12.
 */
function deterministicSort(a: ProspectViewModel, b: ProspectViewModel): number {
  const pDiff = PRIORITY_ORDER.indexOf(a.engine.priorite) - PRIORITY_ORDER.indexOf(b.engine.priorite)
  if (pDiff !== 0) return pDiff
  if (b.engine.secondaryScore !== a.engine.secondaryScore) return b.engine.secondaryScore - a.engine.secondaryScore
  if (a.business.ready !== b.business.ready) return a.business.ready ? -1 : 1
  const aDirect = a.engine.nextBestAction.type === 'CALL' || a.engine.nextBestAction.type === 'EMAIL' ? 0 : 1
  const bDirect = b.engine.nextBestAction.type === 'CALL' || b.engine.nextBestAction.type === 'EMAIL' ? 0 : 1
  if (aDirect !== bDirect) return aDirect - bDirect
  // Distance réelle : tie-break opérationnel uniquement, jamais un signal
  // de potentiel/température. N'intervient qu'à égalité stricte de tout
  // ce qui précède, et seulement si les deux distances sont connues.
  if (a.distanceKm != null && b.distanceKm != null && Math.abs(a.distanceKm - b.distanceKm) > 0.1) {
    return a.distanceKm - b.distanceKm
  }
  return a.companyName.localeCompare(b.companyName) // dernier recours, PAS un signal commercial
}
