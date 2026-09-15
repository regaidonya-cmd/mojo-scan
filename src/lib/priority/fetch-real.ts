// ══════════════════════════════════════════════════════════════
// P0.6A — Chargement des données réelles des 66 PRET_A_PROSPECTER
// Requêtes batchées (5 requêtes au total, pas de N+1).
// Construit ProspectInput[] pour le moteur P0.5 + les faits
// commerciaux déjà persistés (sensibilité déterminée explicitement
// selon les décisions actées en P0.5B.3/B.4/C — voir FAIT_SENSIBILITE_MAP).
// ══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import { evaluateProspect } from './engine'
import { evaluateBusinessModel, classifySiteStatutOnly, buildFaitCommercial, FaitCommercial } from './business-model'
import type { ProspectInput, ContactMethod, CommercialPriorityResult } from './types'
import type { BusinessModelResult } from './business-model'

// Villeneuve-Saint-Georges — centre de la zone de collecte P0.2B (cf run-66-v2.ts)
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

export interface ProspectViewModel {
  companyId: string
  companyName: string
  siren: string
  naf: string | null
  pipelineStage: string
  ville: string | null
  distanceKm: number | null
  engine: CommercialPriorityResult
  business: BusinessModelResult
  interlocuteur: { nom: string; prenom: string; type: string; value: string } | null
  telephoneAffichable: string | null // premier téléphone AUTORISÉ trouvé, jamais une valeur opposée
  emailAffichable: string | null // idem pour email
}

// P0.6C-FIX.1 : la sensibilité est désormais déterminée PAR FAIT
// (classifyFaitText, business-model.ts), plus jamais par SIREN.
// FAIT_SENSIBILITE_MAP supprimée — elle attribuait à tort la même
// sensibilité à toutes les observations d'une même entreprise
// (cas DIAGOBAH : un fait CONTEXTE_INTERNE masquait un fait
// UTILISABLE_DANS_ACCROCHE distinct de la même société).

function supabaseServer() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function fetchMaJourneeData(): Promise<ProspectViewModel[]> {
  const supabase = supabaseServer()
  const nowIso = new Date().toISOString()

  // 1. Les 66 prospects + entreprise + qualification
  const { data: prospects } = await supabase
    .from('prospects_sales')
    .select('company_id, pipeline_stage')
  const companyIds = (prospects ?? []).map((p: any) => p.company_id)
  const pipelineByCompany = new Map((prospects ?? []).map((p: any) => [p.company_id, p.pipeline_stage]))

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, siren, naf')
    .in('id', companyIds)

  const { data: quals } = await supabase
    .from('qualifications_courantes')
    .select('company_id, fit_cible, preuve_metier')
    .in('company_id', companyIds)

  const { data: etabs } = await supabase
    .from('etablissements')
    .select('company_id, ville, latitude, longitude')
    .in('company_id', companyIds)
    .eq('siege', true)

  // 2. Toutes les personnes de ces entreprises
  const { data: personnes } = await supabase
    .from('personnes')
    .select('id, company_id, nom, prenom')
    .in('company_id', companyIds)
  const personneIds = (personnes ?? []).map((p: any) => p.id)

  // 3. Tous les moyens de contact rattachés à ces personnes
  const { data: pmc } = await supabase
    .from('personnes_moyens_contact')
    .select('id, personne_id, moyen_contact_id, moyens_contact(type, valeur_normalisee)')
    .in('personne_id', personneIds.length ? personneIds : ['00000000-0000-0000-0000-000000000000'])

  // 4. Toutes les oppositions pertinentes (entreprise, personne ou moyen)
  const { data: oppositions } = await supabase
    .from('oppositions')
    .select('company_id, personne_id, moyen_contact_id, type, actif')
    .eq('actif', true)

  // 5. Observations (site_statut, fait_specifique) pour ces entreprises
  const { data: observations } = await supabase
    .from('observations_entreprise')
    .select('company_id, attribut, valeur')
    .in('company_id', companyIds)
    .in('attribut', ['fait_specifique', 'site_statut', 'site_crawl_statut', 'site_cta', 'site_formulaire'])

  // ── Indexation en mémoire (pas de nouvelle requête par entreprise) ──
  const companyById = new Map((companies ?? []).map((c: any) => [c.id, c]))
  const qualByCompany = new Map((quals ?? []).map((q: any) => [q.company_id, q]))
  const villeByCompany = new Map((etabs ?? []).map((e: any) => [e.company_id, e.ville]))
  const coordByCompany = new Map(
    (etabs ?? [])
      .filter((e: any) => e.latitude != null && e.longitude != null)
      .map((e: any) => [e.company_id, { lat: Number(e.latitude), lng: Number(e.longitude) }])
  )
  const personnesByCompany = new Map<string, any[]>()
  for (const p of personnes ?? []) {
    const arr = personnesByCompany.get(p.company_id) ?? []
    arr.push(p)
    personnesByCompany.set(p.company_id, arr)
  }
  const contactsByPersonne = new Map<string, any[]>()
  for (const row of pmc ?? []) {
    const arr = contactsByPersonne.get(row.personne_id) ?? []
    arr.push(row)
    contactsByPersonne.set(row.personne_id, arr)
  }
  const oppEntrepriseGlobale = new Set(
    (oppositions ?? []).filter((o: any) => o.company_id && o.type === 'prospection_globale').map((o: any) => o.company_id)
  )
  const oppPersonneGlobale = new Set(
    (oppositions ?? []).filter((o: any) => o.personne_id && o.type === 'prospection_globale').map((o: any) => o.personne_id)
  )
  const oppMoyen = new Set((oppositions ?? []).filter((o: any) => o.moyen_contact_id).map((o: any) => o.moyen_contact_id))
  const oppCanalEntreprise = new Map<string, Set<string>>() // company_id -> {'email','telephone'}
  for (const o of oppositions ?? []) {
    if (o.company_id && (o.type === 'email' || o.type === 'telephone')) {
      const s = oppCanalEntreprise.get(o.company_id) ?? new Set()
      s.add(o.type)
      oppCanalEntreprise.set(o.company_id, s)
    }
  }

  const faitsByCompany = new Map<string, FaitCommercial[]>()
  const siteStatutByCompany = new Map<string, string>()
  const siteCrawlByCompany = new Map<string, { crawlStatut?: string; cta?: string; formulaire?: string }>()
  for (const obs of observations ?? []) {
    if (obs.attribut === 'site_statut') {
      siteStatutByCompany.set(obs.company_id, obs.valeur)
    }
    if (obs.attribut === 'site_crawl_statut' || obs.attribut === 'site_cta' || obs.attribut === 'site_formulaire') {
      const cur = siteCrawlByCompany.get(obs.company_id) ?? {}
      if (obs.attribut === 'site_crawl_statut') cur.crawlStatut = obs.valeur
      if (obs.attribut === 'site_cta') cur.cta = obs.valeur
      if (obs.attribut === 'site_formulaire') cur.formulaire = obs.valeur
      siteCrawlByCompany.set(obs.company_id, cur)
    }
    if (obs.attribut === 'fait_specifique' && obs.valeur && obs.valeur !== 'aucun') {
      const arr = faitsByCompany.get(obs.company_id) ?? []
      arr.push(buildFaitCommercial(obs.valeur, 'observation P0.4/P0.5'))
      faitsByCompany.set(obs.company_id, arr)
    }
  }

  const results: ProspectViewModel[] = []

  for (const companyId of companyIds) {
    const company = companyById.get(companyId)
    if (!company) continue
    const qual = qualByCompany.get(companyId)
    const companyPersonnes = personnesByCompany.get(companyId) ?? []

    const contactMethods: ContactMethod[] = []
    for (const p of companyPersonnes) {
      const personneOpposee = oppPersonneGlobale.has(p.id)
      const contacts = contactsByPersonne.get(p.id) ?? []
      const canauxBloquesEntreprise = oppCanalEntreprise.get(companyId) ?? new Set()
      for (const c of contacts) {
        const type = c.moyens_contact?.type
        const value = c.moyens_contact?.valeur_normalisee
        if (!type || !value) continue
        const moyenOppose = oppMoyen.has(c.moyen_contact_id)
        const canalBloque = canauxBloquesEntreprise.has(type)
        contactMethods.push({
          contactMethodId: c.id,
          type,
          value,
          personneId: p.id,
          personneNom: p.nom,
          personnePrenom: p.prenom,
          nominatif: true,
          allowed: !personneOpposee && !moyenOppose && !canalBloque,
        })
      }
    }

    const siteStatut = siteStatutByCompany.get(companyId)
    const faits = faitsByCompany.get(companyId) ?? []

    // P0.6A.1 : un site_statut seul (sans fait_specifique complémentaire)
    // n'est plus jamais promu automatiquement en UTILISABLE_DANS_ACCROCHE.
    // Seul AMBIGUOUS génère un fait, classé A_VERIFIER (anomalie à lever).
    if (faits.length === 0 && siteStatut && (siteStatut === 'FOUND' || siteStatut === 'AMBIGUOUS' || siteStatut === 'NOT_FOUND')) {
      const sensibilite = classifySiteStatutOnly(siteStatut)
      if (sensibilite) {
        const texte = siteStatut === 'AMBIGUOUS' ? "Site ambigu identifié — adresse à confirmer avant tout usage." : ''
        faits.push({ texte, texteAffichable: texte, sensibilite, source: 'observation (site_statut seul)' })
      }
    }

    const hasReliableAngle = faits.some((f) => f.sensibilite === 'UTILISABLE_DANS_ACCROCHE')

    const input: ProspectInput = {
      companyId,
      companyName: company.name,
      fitCible: qual?.fit_cible ?? 'INCONNU',
      preuveMetier: qual?.preuve_metier ?? 'A_VERIFIER',
      proximiteLocale: true, // collecte P0.2B limitée à 20km, cf P0.5B.2
      pipelineStage: 'A_CONTACTER',
      contactMethods,
      hasReliableAngle,
      angleSource: hasReliableAngle ? faits.find((f) => f.sensibilite === 'UTILISABLE_DANS_ACCROCHE')!.texte : '',
      globalOppositionActive: oppEntrepriseGlobale.has(companyId),
      isLostDefinitive: false,
      isWon: false,
      events: [],
      now: nowIso,
    }

    const engineResult = evaluateProspect(input)
    // P0.6C-FIX.1 : un crawl RÉUSSI rehausse CONNAISSANCE (preuve technique
    // fiable, page réellement visitée), mais n'entre JAMAIS dans le calcul
    // d'ARMEMENT/READY — CTA/formulaire seuls restent non différenciants.
    const hasVerifiedSiteContent = siteCrawlByCompany.get(companyId)?.crawlStatut === 'CRAWL_REUSSI'
    const business = evaluateBusinessModel(input, engineResult, faits, hasVerifiedSiteContent)

    const interlocuteurContact = business.contactabilite === 'BONNE' ? engineResult.selectedContact : null
    const interlocuteur = interlocuteurContact
      ? {
          nom: contactMethods.find((c) => c.contactMethodId === interlocuteurContact.contactMethodId)?.personneNom ?? '',
          prenom: contactMethods.find((c) => c.contactMethodId === interlocuteurContact.contactMethodId)?.personnePrenom ?? '',
          type: interlocuteurContact.type,
          value: interlocuteurContact.value,
        }
      : null

    const coord = coordByCompany.get(companyId)
    const distanceKm = coord ? haversineKm(VSG, coord) : null

    // Valeurs affichables : uniquement parmi les moyens AUTORISÉS (allowed=true).
    // Ne jamais afficher une valeur opposée comme CTA commercial.
    const telephoneAffichable = contactMethods.find((c) => c.type === 'telephone' && c.allowed)?.value ?? null
    const emailAffichable = contactMethods.find((c) => c.type === 'email' && c.allowed)?.value ?? null

    results.push({
      companyId,
      companyName: company.name,
      siren: company.siren,
      naf: company.naf ?? null,
      pipelineStage: pipelineByCompany.get(companyId) ?? 'A_CONTACTER',
      ville: villeByCompany.get(companyId) ?? null,
      distanceKm,
      engine: engineResult,
      business,
      interlocuteur,
      telephoneAffichable,
      emailAffichable,
    })
  }

  return results
}

export async function fetchSingleProspect(companyId: string): Promise<ProspectViewModel | null> {
  // Pilote (66 lignes) : simplicité assumée, on réutilise le batch complet.
  // À revoir avant scale (requête ciblée par company_id) — cf. limites P0.6B.
  const all = await fetchMaJourneeData()
  return all.find((v) => v.companyId === companyId) ?? null
}
