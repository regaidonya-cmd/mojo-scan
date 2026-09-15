import type { ProspectViewModel } from './fetch-real'

export interface ProspectsFilters {
  search: string
  statut: 'TOUS' | 'READY' | 'A_PREPARER'
  potentiel: Set<string>
  temperature: Set<string>
  priorite: Set<string>
  pipeline: Set<string>
  ville: string
}

export const EMPTY_FILTERS: ProspectsFilters = {
  search: '',
  statut: 'TOUS',
  potentiel: new Set(),
  temperature: new Set(),
  priorite: new Set(),
  pipeline: new Set(),
  ville: '',
}

const PRIORITY_ORDER = ['STOP', 'P0', 'P1', 'P2', 'P3', 'P4']

/**
 * Les prospects STOP sont toujours exclus des listes commerciales normales
 * (§10 P0.6B), sauf demande explicite via la vue "Exclus / oppositions"
 * gérée séparément par l'appelant — cette fonction ne les inclut jamais ici.
 */
export function applyFilters(all: ProspectViewModel[], f: ProspectsFilters): ProspectViewModel[] {
  const base = all.filter((v) => v.engine.priorite !== 'STOP')

  const searched = f.search.trim()
    ? base.filter((v) => {
        const q = f.search.trim().toLowerCase()
        return (
          v.companyName.toLowerCase().includes(q) ||
          v.siren.includes(q) ||
          (v.ville ?? '').toLowerCase().includes(q) ||
          (v.interlocuteur ? `${v.interlocuteur.prenom} ${v.interlocuteur.nom}`.toLowerCase().includes(q) : false)
        )
      })
    : base

  const byStatut = searched.filter((v) => {
    if (f.statut === 'READY') return v.business.ready
    if (f.statut === 'A_PREPARER') return !v.business.ready
    return true
  })

  const byPotentiel = f.potentiel.size ? byStatut.filter((v) => f.potentiel.has(v.engine.potentiel)) : byStatut
  const byTemp = f.temperature.size ? byPotentiel.filter((v) => f.temperature.has(v.engine.temperature)) : byPotentiel
  const byPrio = f.priorite.size ? byTemp.filter((v) => f.priorite.has(v.engine.priorite)) : byTemp
  const byPipeline = f.pipeline.size ? byPrio.filter((v) => f.pipeline.has(v.pipelineStage)) : byPrio
  const byVille = f.ville.trim()
    ? byPipeline.filter((v) => (v.ville ?? '').toLowerCase().includes(f.ville.trim().toLowerCase()))
    : byPipeline

  return byVille
}

export type SortKey = 'DEFAULT' | 'ENTREPRISE' | 'POTENTIEL' | 'TEMPERATURE' | 'VILLE'

const POTENTIEL_RANK: Record<string, number> = { FORT: 0, MOYEN: 1, FAIBLE: 2 }
const TEMPERATURE_RANK: Record<string, number> = { CHAUD: 0, TIEDE: 1, FROID: 2 }

export function sortProspects(list: ProspectViewModel[], key: SortKey): ProspectViewModel[] {
  const arr = [...list]
  switch (key) {
    case 'ENTREPRISE':
      return arr.sort((a, b) => a.companyName.localeCompare(b.companyName))
    case 'POTENTIEL':
      return arr.sort((a, b) => POTENTIEL_RANK[a.engine.potentiel] - POTENTIEL_RANK[b.engine.potentiel])
    case 'TEMPERATURE':
      return arr.sort((a, b) => TEMPERATURE_RANK[a.engine.temperature] - TEMPERATURE_RANK[b.engine.temperature])
    case 'VILLE':
      return arr.sort((a, b) => (a.ville ?? '').localeCompare(b.ville ?? ''))
    case 'DEFAULT':
    default:
      return arr.sort(defaultSort)
  }
}

/**
 * Tri par défaut §11 : priorité > score secondaire > READY > action directe
 * > distance (si connue des deux) > alphabétique en dernier recours.
 * Identique au tri MA JOURNEE — même moteur, pas de logique dupliquée.
 */
function defaultSort(a: ProspectViewModel, b: ProspectViewModel): number {
  const pDiff = PRIORITY_ORDER.indexOf(a.engine.priorite) - PRIORITY_ORDER.indexOf(b.engine.priorite)
  if (pDiff !== 0) return pDiff
  if (b.engine.secondaryScore !== a.engine.secondaryScore) return b.engine.secondaryScore - a.engine.secondaryScore
  if (a.business.ready !== b.business.ready) return a.business.ready ? -1 : 1
  const aDirect = a.engine.nextBestAction.type === 'CALL' || a.engine.nextBestAction.type === 'EMAIL' ? 0 : 1
  const bDirect = b.engine.nextBestAction.type === 'CALL' || b.engine.nextBestAction.type === 'EMAIL' ? 0 : 1
  if (aDirect !== bDirect) return aDirect - bDirect
  if (a.distanceKm != null && b.distanceKm != null && Math.abs(a.distanceKm - b.distanceKm) > 0.1) {
    return a.distanceKm - b.distanceKm
  }
  return a.companyName.localeCompare(b.companyName)
}

export interface QuickView {
  id: 'TOUS' | 'READY' | 'CHAUDS' | 'A_PREPARER' | 'A_RELANCER'
  label: string
  apply: (all: ProspectViewModel[]) => ProspectViewModel[]
}

export const QUICK_VIEWS: QuickView[] = [
  { id: 'TOUS', label: 'Tous', apply: (all) => all.filter((v) => v.engine.priorite !== 'STOP') },
  { id: 'READY', label: 'Ready', apply: (all) => all.filter((v) => v.engine.priorite !== 'STOP' && v.business.ready) },
  {
    id: 'CHAUDS',
    label: 'Chauds',
    apply: (all) => all.filter((v) => v.engine.priorite !== 'STOP' && v.engine.temperature === 'CHAUD'),
  },
  {
    id: 'A_PREPARER',
    label: 'À préparer',
    apply: (all) => all.filter((v) => v.engine.priorite !== 'STOP' && !v.business.ready),
  },
  // "À relancer" nécessite next_action_due_at/FOLLOW_UP réel — non calculable
  // aujourd'hui (aucun événement réel en base, cf P0.5A/§16). Retourne un
  // ensemble vide plutôt que de simuler un contenu : voir rapport §"limites".
  { id: 'A_RELANCER', label: 'À relancer', apply: (all) => all.filter((v) => v.engine.nextBestAction.type === 'FOLLOW_UP') },
]
