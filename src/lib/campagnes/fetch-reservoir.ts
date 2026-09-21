// ══════════════════════════════════════════════════════════════
// P0.8C FIX.1 — Adaptateur dédié à l'écran de sélection campagne. Part de
// `companies` (population complète du réservoir), jamais de
// `prospects_sales`. Séparé de src/lib/priority/fetch-real.ts.
//
// Corrections FIX.1 :
// - Pagination serveur réelle (jamais un seul appel supposé complet) +
//   contrôle de troncature explicite.
// - Toutes les requêtes .in() sur de grandes listes sont chunkées.
// - `error` systématiquement vérifié — plus jamais silencieusement ignoré.
// - Géographie : companies.city/address utilisés en priorité, avec un
//   ordre de fallback déterministe, jamais d'invention.
// ══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import { detectParcours } from '../scoring/modules'
import { computeEligibiliteCampagne } from './engine'
import type { EligibiliteCampagneStatut } from './types'

export interface ReservoirProspect {
  companyId: string
  raisonSociale: string
  siren: string
  naf: string | null
  ville: string | null
  villeSource: 'COMPANIES_CITY' | 'ETABLISSEMENT_VILLE' | 'INCONNU'
  departement: string | null
  departementSource: 'ETABLISSEMENT_CODE_POSTAL' | 'ADRESSE_COMPANIES' | 'INCONNU'
  segment: string | null // CODE stable, ex. 'PARC-001' — valeur de filtre
  segmentLibelle: string | null // LABEL utilisateur, ex. 'Diagnostiqueur immobilier'
  eligibiliteCampagne: EligibiliteCampagneStatut
  eligibiliteRaisons: string[]
  ready: boolean
  jamaisContacte: boolean
  oppositionActive: boolean
  emailDisponible: boolean
}

function supabaseServer() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Découpe un tableau en lots de taille maximale `size` — évite toute
 * requête .in() avec une liste d'identifiants trop longue (risque de
 * dépassement de longueur d'URL, cause du bug FIX.1 §COMMUNE). */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

const CHUNK_SIZE = 150
const PAGE_SIZE = 500

/** Récupère TOUTE une table (pas de troncature silencieuse) par pages
 * explicites de PAGE_SIZE, en s'arrêtant quand une page retourne moins
 * que PAGE_SIZE lignes. Vérifie `error` à chaque page — fail explicite
 * en cas d'erreur, jamais une collection vide silencieuse. */
async function fetchAllPaginated<T>(
  supabase: ReturnType<typeof supabaseServer>,
  table: string,
  select: string,
  applyFilters?: (q: any) => any
): Promise<T[]> {
  const all: T[] = []
  let page = 0
  for (;;) {
    let q = supabase.from(table).select(select).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
    if (applyFilters) q = applyFilters(q)
    const { data, error } = await q
    if (error) throw new Error(`fetchAllPaginated(${table}) page ${page}: ${error.message}`)
    const rows = (data ?? []) as T[]
    all.push(...rows)
    if (rows.length < PAGE_SIZE) break
    page++
  }
  return all
}

/** Requête .in() chunkée — fusionne les résultats de plusieurs lots,
 * vérifie `error` sur CHAQUE lot, fail explicite si un lot échoue. */
async function fetchInChunks<T>(
  supabase: ReturnType<typeof supabaseServer>,
  table: string,
  select: string,
  column: string,
  ids: string[],
  applyExtraFilters?: (q: any) => any
): Promise<T[]> {
  if (ids.length === 0) return []
  const all: T[] = []
  for (const batch of chunk(ids, CHUNK_SIZE)) {
    let q = supabase.from(table).select(select).in(column, batch)
    if (applyExtraFilters) q = applyExtraFilters(q)
    const { data, error } = await q
    if (error) throw new Error(`fetchInChunks(${table}) batch de ${batch.length}: ${error.message}`)
    all.push(...((data ?? []) as T[]))
  }
  return all
}

// Extraction déterministe d'un code postal français (5 chiffres) depuis
// une adresse en texte libre — utilisée en dernier recours seulement,
// jamais pour inventer une valeur absente.
export const CODE_POSTAL_REGEX = /\b(\d{5})\b/

export function resoudreCommune(c: { city?: string | null }, etab: { ville?: string | null } | undefined): { ville: string | null; source: 'COMPANIES_CITY' | 'ETABLISSEMENT_VILLE' | 'INCONNU' } {
  if (c.city) return { ville: c.city, source: 'COMPANIES_CITY' }
  if (etab?.ville) return { ville: etab.ville, source: 'ETABLISSEMENT_VILLE' }
  return { ville: null, source: 'INCONNU' }
}

export function resoudreDepartement(c: { address?: string | null }, etab: { code_postal?: string | null } | undefined): { departement: string | null; source: 'ETABLISSEMENT_CODE_POSTAL' | 'ADRESSE_COMPANIES' | 'INCONNU' } {
  if (etab?.code_postal) return { departement: etab.code_postal.slice(0, 2), source: 'ETABLISSEMENT_CODE_POSTAL' }
  const m = c.address ? CODE_POSTAL_REGEX.exec(c.address) : null
  if (m) return { departement: m[1].slice(0, 2), source: 'ADRESSE_COMPANIES' }
  return { departement: null, source: 'INCONNU' }
}

const NOM_AMBIGU_REGEX = /(medical|laborat|industr|levage|elec[a-z]*$|nucle|agro|pharma|hopital|clinique|hvac|groupe|group sas)/i

export interface FetchReservoirResult {
  prospects: ReservoirProspect[]
  totalCompaniesDb: number
  totalFetched: number
  totalTransforme: number
  tronque: boolean
}

export async function fetchReservoirCampagne(params: { naf?: string; departement?: string }): Promise<FetchReservoirResult> {
  const supabase = supabaseServer()

  // ── Contrôle de troncature : compte total réel de la table companies ──
  const countQuery = supabase.from('companies').select('id', { count: 'exact', head: true })
  const { count: totalCompaniesDb, error: errCount } = params.naf ? await countQuery.eq('naf', params.naf) : await countQuery
  if (errCount) throw new Error(`Comptage companies: ${errCount.message}`)

  // ── Population complète, paginée, jamais tronquée silencieusement ──
  const companies = await fetchAllPaginated<any>(supabase, 'companies', 'id, name, siren, naf, city, address', (q) => (params.naf ? q.eq('naf', params.naf) : q))
  const totalFetched = companies.length
  const tronque = totalCompaniesDb != null && totalFetched < totalCompaniesDb

  const companyIds = companies.map((c: any) => c.id)
  if (companyIds.length === 0) return { prospects: [], totalCompaniesDb: totalCompaniesDb ?? 0, totalFetched, totalTransforme: 0, tronque }

  const etabs = await fetchInChunks<any>(supabase, 'etablissements', 'company_id, ville, code_postal', 'company_id', companyIds, (q) => q.eq('siege', true))
  const etabByCompany = new Map(etabs.map((e: any) => [e.company_id, e]))

  // Géographie résolue via resoudreCommune/resoudreDepartement (module-level, testées unitairement)

  const filteredCompanyIds = params.departement
    ? companyIds.filter((id: string) => {
        const c = companyById_temp(companies, id)
        const { departement } = resoudreDepartement(c, etabByCompany.get(id))
        return departement === params.departement
      })
    : companyIds

  function companyById_temp(list: any[], id: string) {
    return list.find((cc: any) => cc.id === id)
  }

  const personnes = await fetchInChunks<any>(supabase, 'personnes', 'id, company_id', 'company_id', filteredCompanyIds)
  const personneIds = personnes.map((p: any) => p.id)
  const companyByPersonne = new Map(personnes.map((p: any) => [p.id, p.company_id]))

  const pmc = await fetchInChunks<any>(
    supabase, 'personnes_moyens_contact', 'id, personne_id, moyen_contact_id, source_id, moyens_contact(type, valeur_normalisee)', 'personne_id',
    personneIds.length ? personneIds : []
  )

  const { data: sources, error: errSources } = await supabase.from('sources').select('id, code')
  if (errSources) throw new Error(`Chargement sources: ${errSources.message}`)
  const sourceCodeById = new Map((sources ?? []).map((s: any) => [s.id, s.code]))

  const emailByCompany = new Map<string, { valeur: string; sourceCode: string | null }>()
  const emailOccurrences = new Map<string, Set<string>>()
  for (const row of pmc) {
    if (row.moyens_contact?.type !== 'email') continue
    const companyId = companyByPersonne.get(row.personne_id)
    if (!companyId) continue
    if (!emailByCompany.has(companyId)) {
      emailByCompany.set(companyId, { valeur: row.moyens_contact.valeur_normalisee, sourceCode: sourceCodeById.get(row.source_id) ?? null })
    }
    const set = emailOccurrences.get(row.moyens_contact.valeur_normalisee) ?? new Set()
    set.add(companyId)
    emailOccurrences.set(row.moyens_contact.valeur_normalisee, set)
  }

  const { data: oppositions, error: errOpp } = await supabase.from('oppositions').select('company_id, personne_id, moyen_contact_id').eq('actif', true)
  if (errOpp) throw new Error(`Chargement oppositions: ${errOpp.message}`)
  const companiesAvecOpposition = new Set<string>()
  for (const row of oppositions ?? []) {
    const r: any = row
    if (r.company_id) companiesAvecOpposition.add(r.company_id)
    if (r.personne_id) {
      const cid = companyByPersonne.get(r.personne_id)
      if (cid) companiesAvecOpposition.add(cid)
    }
    if (r.moyen_contact_id) {
      for (const row2 of pmc) {
        if (row2.moyen_contact_id === r.moyen_contact_id) {
          const cid = companyByPersonne.get(row2.personne_id)
          if (cid) companiesAvecOpposition.add(cid)
        }
      }
    }
  }

  const prospectsSales = await fetchInChunks<any>(supabase, 'prospects_sales', 'company_id, date_dernier_contact', 'company_id', filteredCompanyIds)
  const dateContactByCompany = new Map(prospectsSales.map((p: any) => [p.company_id, p.date_dernier_contact]))

  const companyById = new Map(companies.map((c: any) => [c.id, c]))

  const prospects = filteredCompanyIds.map((companyId: string) => {
    const c = companyById.get(companyId)
    const etab = etabByCompany.get(companyId)
    const email = emailByCompany.get(companyId)
    const oppositionActive = companiesAvecOpposition.has(companyId)
    const emailPartage = email ? (emailOccurrences.get(email.valeur)?.size ?? 0) > 1 : false
    const match = detectParcours(c?.naf ?? undefined)
    const nomAmbigu = NOM_AMBIGU_REGEX.test(c?.name ?? '')
    const { ville, source: villeSource } = resoudreCommune(c, etab)
    const { departement, source: departementSource } = resoudreDepartement(c, etab)

    const eligibilite = computeEligibiliteCampagne({
      companyId, naf: c?.naf ?? null, raisonSociale: c?.name ?? '',
      emailSource: email?.sourceCode ?? null,
      emailExploitable: !!email,
      emailPartageAvecAutreEntreprise: emailPartage,
      oppositionActive, nomAmbigu,
    })

    return {
      companyId, raisonSociale: c?.name ?? '', siren: c?.siren ?? '', naf: c?.naf ?? null,
      ville, villeSource, departement, departementSource,
      segment: match.parcours?.id ?? null, segmentLibelle: match.parcours?.metier ?? null,
      eligibiliteCampagne: eligibilite.statut, eligibiliteRaisons: eligibilite.raisons,
      ready: false,
      jamaisContacte: !dateContactByCompany.get(companyId),
      oppositionActive,
      emailDisponible: !!email,
    } as ReservoirProspect
  })

  return { prospects, totalCompaniesDb: totalCompaniesDb ?? 0, totalFetched, totalTransforme: prospects.length, tronque }
}
