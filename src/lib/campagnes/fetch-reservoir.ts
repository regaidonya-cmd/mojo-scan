// ══════════════════════════════════════════════════════════════
// P0.8C.2B — Adaptateur dédié à l'écran de sélection campagne. Part de
// `companies` (population complète du réservoir), jamais de
// `prospects_sales` (qui ne contient que les prospects déjà promus).
// Séparé de src/lib/priority/fetch-real.ts pour ne prendre AUCUN risque
// de régression sur MA JOURNÉE / la fiche prospect existante.
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
  departement: string | null
  segment: string | null // id parcours, ex. 'PARC-001'
  segmentLibelle: string | null
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

// Termes évoquant une activité hors cible malgré ADI_DHUP (cf. audit campagne 94)
const NOM_AMBIGU_REGEX = /(medical|laborat|industr|levage|elec[a-z]*$|nucle|agro|pharma|hopital|clinique|hvac|groupe|group sas)/i

export async function fetchReservoirCampagne(params: { naf?: string; departement?: string }): Promise<ReservoirProspect[]> {
  const supabase = supabaseServer()

  let companiesQuery = supabase.from('companies').select('id, name, siren, naf')
  if (params.naf) companiesQuery = companiesQuery.eq('naf', params.naf)
  const { data: companies } = await companiesQuery
  const companyIds = (companies ?? []).map((c: any) => c.id)
  if (companyIds.length === 0) return []

  const { data: etabs } = await supabase
    .from('etablissements')
    .select('company_id, ville, code_postal')
    .in('company_id', companyIds)
    .eq('siege', true)
  const etabByCompany = new Map((etabs ?? []).map((e: any) => [e.company_id, e]))

  const filteredCompanyIds = params.departement
    ? companyIds.filter((id: string) => etabByCompany.get(id)?.code_postal?.slice(0, 2) === params.departement)
    : companyIds

  const { data: personnes } = await supabase
    .from('personnes')
    .select('id, company_id')
    .in('company_id', filteredCompanyIds)
  const personneIds = (personnes ?? []).map((p: any) => p.id)
  const companyByPersonne = new Map((personnes ?? []).map((p: any) => [p.id, p.company_id]))

  const { data: pmc } = await supabase
    .from('personnes_moyens_contact')
    .select('id, personne_id, moyen_contact_id, source_id, moyens_contact(type, valeur_normalisee)')
    .in('personne_id', personneIds.length ? personneIds : ['00000000-0000-0000-0000-000000000000'])

  const { data: sources } = await supabase.from('sources').select('id, code')
  const sourceCodeById = new Map((sources ?? []).map((s: any) => [s.id, s.code]))

  // Un email par entreprise (le premier trouvé), + comptage de partage global sur ce sous-ensemble
  const emailByCompany = new Map<string, { valeur: string; sourceCode: string | null }>()
  const emailOccurrences = new Map<string, Set<string>>()
  for (const row of pmc ?? []) {
    const r: any = row
    if (r.moyens_contact?.type !== 'email') continue
    const companyId = companyByPersonne.get(r.personne_id)
    if (!companyId) continue
    if (!emailByCompany.has(companyId)) {
      emailByCompany.set(companyId, { valeur: r.moyens_contact.valeur_normalisee, sourceCode: sourceCodeById.get(r.source_id) ?? null })
    }
    const set = emailOccurrences.get(r.moyens_contact.valeur_normalisee) ?? new Set()
    set.add(companyId)
    emailOccurrences.set(r.moyens_contact.valeur_normalisee, set)
  }

  const { data: oppositions } = await supabase
    .from('oppositions')
    .select('company_id, personne_id, moyen_contact_id')
    .eq('actif', true)
  const companiesAvecOpposition = new Set<string>()
  for (const row of oppositions ?? []) {
    const r: any = row
    if (r.company_id) companiesAvecOpposition.add(r.company_id)
    if (r.personne_id) {
      const cid = companyByPersonne.get(r.personne_id)
      if (cid) companiesAvecOpposition.add(cid)
    }
    // moyen_contact_id : rattachement indirect via pmc déjà chargé ci-dessus
    if (r.moyen_contact_id) {
      for (const row2 of pmc ?? []) {
        const r2: any = row2
        if (r2.moyen_contact_id === r.moyen_contact_id) {
          const cid = companyByPersonne.get(r2.personne_id)
          if (cid) companiesAvecOpposition.add(cid)
        }
      }
    }
  }

  const { data: prospectsSales } = await supabase
    .from('prospects_sales')
    .select('company_id, date_dernier_contact')
    .in('company_id', filteredCompanyIds)
  const dateContactByCompany = new Map((prospectsSales ?? []).map((p: any) => [p.company_id, p.date_dernier_contact]))

  const companyById = new Map((companies ?? []).map((c: any) => [c.id, c]))

  return filteredCompanyIds.map((companyId: string) => {
    const c = companyById.get(companyId)
    const etab = etabByCompany.get(companyId)
    const email = emailByCompany.get(companyId)
    const oppositionActive = companiesAvecOpposition.has(companyId)
    const emailPartage = email ? (emailOccurrences.get(email.valeur)?.size ?? 0) > 1 : false
    const match = detectParcours(c?.naf ?? undefined)
    const nomAmbigu = NOM_AMBIGU_REGEX.test(c?.name ?? '')

    const eligibilite = computeEligibiliteCampagne({
      companyId, naf: c?.naf ?? null, raisonSociale: c?.name ?? '',
      emailSource: email?.sourceCode ?? null,
      emailExploitable: !!email,
      emailPartageAvecAutreEntreprise: emailPartage,
      oppositionActive, nomAmbigu,
    })

    return {
      companyId, raisonSociale: c?.name ?? '', siren: c?.siren ?? '', naf: c?.naf ?? null,
      ville: etab?.ville ?? null, departement: etab?.code_postal?.slice(0, 2) ?? null,
      segment: match.parcours?.id ?? null, segmentLibelle: match.parcours?.metier ?? null,
      eligibiliteCampagne: eligibilite.statut, eligibiliteRaisons: eligibilite.raisons,
      ready: false, // READY commercial individuel reste calculé par le moteur Sales existant, hors périmètre ici
      jamaisContacte: !dateContactByCompany.get(companyId),
      oppositionActive,
      emailDisponible: !!email,
    }
  })
}
