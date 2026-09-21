// ══════════════════════════════════════════════════════════════
// P0.8C.3 — Synchronisation MOJO Sales → Brevo. SÉPARÉ de
// src/lib/brevo/sync.ts (flux Scan existant, INTACT, non modifié).
// BREVO_API_KEY : serveur uniquement, jamais exposée au client.
// ══════════════════════════════════════════════════════════════

import type { BrevoApiClient, BrevoContactSnapshot, MembreASynchroniser, MojoContactAttributes, ResultatSyncLot, ResultatSyncMembre } from './sales-types'

/**
 * mergeAttributesNonDestructif — RÈGLE CRITIQUE (§3) : ne jamais écraser
 * une valeur EXISTANTE par "", null ou undefined. Les attributs MOJO sont
 * appliqués par-dessus, mais uniquement quand leur valeur est réellement
 * renseignée. Tout attribut existant non MOJO reste intact.
 */
export function mergeAttributesNonDestructif(
  existing: Record<string, unknown>,
  mojoUpdates: Partial<MojoContactAttributes>
): Record<string, unknown> {
  const merged = { ...existing }
  for (const [key, value] of Object.entries(mojoUpdates)) {
    if (value === undefined || value === null || value === '') continue // jamais un écrasement par une valeur vide
    merged[key] = value
  }
  return merged
}

/** Implémentation réelle — jamais appelée par les tests (mock injecté à la place). */
export function realBrevoClient(): BrevoApiClient {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY manquante')

  return {
    async getContact(email) {
      const res = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
        headers: { 'api-key': apiKey, Accept: 'application/json' },
      })
      if (res.status === 404) return { found: false, attributes: {}, listIds: [] }
      if (!res.ok) throw new Error(`Brevo getContact ${res.status}`)
      const json = await res.json()
      return { found: true, id: json.id?.toString(), attributes: json.attributes ?? {}, listIds: json.listIds ?? [] }
    },
    async upsertContact(email, attributes, listIds) {
      const res = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, updateEnabled: true, attributes, listIds }),
      })
      if (![200, 201, 204].includes(res.status)) throw new Error(`Brevo upsertContact ${res.status}`)
      const json = res.status !== 204 ? await res.json().catch(() => ({})) : {}
      return { id: json.id?.toString() ?? '' }
    },
    async getOrCreateList(name) {
      const listRes = await fetch(`https://api.brevo.com/v3/contacts/lists?limit=50`, { headers: { 'api-key': apiKey, Accept: 'application/json' } })
      const listJson = listRes.ok ? await listRes.json() : { lists: [] }
      const existing = (listJson.lists ?? []).find((l: any) => l.name === name)
      if (existing) return { id: existing.id, created: false }

      const createRes = await fetch('https://api.brevo.com/v3/contacts/lists', {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, folderId: 1 }),
      })
      if (!createRes.ok) throw new Error(`Brevo createList ${createRes.status}`)
      const createJson = await createRes.json()
      return { id: createJson.id, created: true }
    },
  }
}

/**
 * synchroniserMembre — contrôles temps réel (§5) déjà pré-calculés côté
 * appelant (DB), jamais fiés uniquement au snapshot du lot. Merge non
 * destructif systématique avant upsert.
 */
export async function synchroniserMembre(membre: MembreASynchroniser, listId: number, client: BrevoApiClient): Promise<ResultatSyncMembre> {
  if (membre.oppositionActive) {
    return { companyId: membre.companyId, statut: 'EXCLU', raison: 'Opposition active détectée au moment de la synchronisation' }
  }
  if (!membre.emailExploitable) {
    return { companyId: membre.companyId, statut: 'EXCLU', raison: 'Email devenu non exploitable' }
  }
  if (!membre.eligibiliteCampagneToujoursValide) {
    return { companyId: membre.companyId, statut: 'EXCLU', raison: "Éligibilité campagne n'est plus valide (recalculée en temps réel)" }
  }

  try {
    const existant: BrevoContactSnapshot = await client.getContact(membre.email)
    const merged = mergeAttributesNonDestructif(existant.attributes, membre.attributes)
    const listIds = Array.from(new Set([...existant.listIds, listId]))
    const result = await client.upsertContact(membre.email, merged, listIds)
    return { companyId: membre.companyId, statut: 'SYNCHRONISE', raison: null, brevoContactId: result.id }
  } catch (e: any) {
    // §7 — une erreur individuelle ne doit jamais faire échouer tout le lot.
    return { companyId: membre.companyId, statut: 'ERREUR', raison: e.message ?? 'Erreur Brevo inconnue' }
  }
}

/**
 * synchroniserLot — orchestration complète, idempotente. Si `listIdExistant`
 * est fourni (lot déjà partiellement synchronisé), la liste n'est jamais
 * recréée — évite toute duplication de liste en cas de retry (§4/§6).
 */
export async function synchroniserLot(
  nomListe: string,
  membres: MembreASynchroniser[],
  client: BrevoApiClient,
  listIdExistant?: number
): Promise<ResultatSyncLot> {
  const { id: listId } = listIdExistant
    ? { id: listIdExistant }
    : await client.getOrCreateList(nomListe)

  const details: ResultatSyncMembre[] = []
  for (const membre of membres) {
    details.push(await synchroniserMembre(membre, listId, client))
  }

  return {
    selectionnes: membres.length,
    synchronises: details.filter((d) => d.statut === 'SYNCHRONISE').length,
    exclus: details.filter((d) => d.statut === 'EXCLU').length,
    erreurs: details.filter((d) => d.statut === 'ERREUR').length,
    brevoListId: listId,
    details,
  }
}
