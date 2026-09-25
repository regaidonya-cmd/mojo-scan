import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { enrichirBatch, MAX_TEXT_SEARCH_CALLS, MAX_PLACE_DETAILS_CALLS } from '@/lib/enrichissement/orchestrateur'
import type { EtablissementReference } from '@/lib/enrichissement/types'

function getToken(): string {
  const secret = process.env.ADMIN_PASSWORD ?? ''
  return crypto.createHash('sha256').update(secret).digest('hex')
}

// ══════════════════════════════════════════════════════════════
// ENRICH.VSG.2B — Jeu de recette figé, codé en dur. AUCUN moyen de le
// remplacer via le body HTTP : la requête POST n'est jamais lue pour en
// tirer une liste d'entreprises. Impossible de fournir companyIds/limit/
// SIREN arbitraire/batch size — ces paramètres, même envoyés, sont
// ignorés (le corps de la requête n'est jamais parsé du tout).
// ══════════════════════════════════════════════════════════════
const BAT_10: (EtablissementReference & { secteur: string })[] = [
  { siren: '889352886', siret: '88935288600028', raisonSociale: 'ALLO POULET', enseigne: null, adresse: '284 RUE DE PARIS', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '56.10C', secteur: 'Restauration & métiers de bouche' },
  { siren: '931188304', siret: '93118830400014', raisonSociale: "UNIV'HAIR", enseigne: null, adresse: '4 AVENUE DES FUSILLES', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '96.02A', secteur: 'Beauté, coiffure & bien-être' },
  { siren: '509503777', siret: '50950377700013', raisonSociale: 'SARL EMERAUDE CONDUITE', enseigne: null, adresse: '3 RUE ROBERT SCHUMANN', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '85.53Z', secteur: 'Automobile & auto-écoles' },
  { siren: '453757973', siret: '45375797300012', raisonSociale: 'CCPJJ', enseigne: null, adresse: '181 AVENUE DE LA DIVISION LECLERC', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '71.20A', secteur: 'Immobilier' },
  { siren: '966201717', siret: '96620171700024', raisonSociale: 'INTEGRALE DE CHAUFFAGE ET PLOMBERIE', enseigne: null, adresse: '21 B AVENUE CARNOT', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '43.22B', secteur: 'Bâtiment & artisans' },
  { siren: '444928923', siret: '44492892300028', raisonSociale: 'AMINATA SY', enseigne: null, adresse: '3 RUE ROLAND GARROS', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '70.21Z', secteur: 'Professions libérales & conseil' },
  { siren: '542050315', siret: '54205031500200', raisonSociale: 'CEVA LOGISTICS EUROPE', enseigne: null, adresse: 'ZI LES GRAVIERS ZONE INDUSTRIELLE', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '52.29B', secteur: 'Transport & logistique' },
  { siren: '823882006', siret: '82388200600013', raisonSociale: 'FABIEN LEJEUNE', enseigne: 'LEJEUNE NETTOYAGE', adresse: '70 AVENUE DE VALENTON', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '81.21Z', secteur: 'Nettoyage & services aux entreprises' },
  { siren: '883261752', siret: '88326175200017', raisonSociale: 'BKS EXOTIQUE', enseigne: null, adresse: '26 RUE EMILE ZOLA', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '47.11B', secteur: 'Commerces de proximité' },
  { siren: '904898863', siret: '90489886300025', raisonSociale: 'SAYED BEN FRADJ', enseigne: null, adresse: '1 RUE HENRI SELLIER', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '86.90D', secteur: 'Santé' },
]

// Récupération de page limitée à accueil/contact/mentions-légales,
// jamais plus de 3 pages par domaine (appliqué par email-extraction.ts
// via son tableau PAGES_MAX déjà fixé à 3 chemins).
async function fetchPageSimple(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

export async function POST() {
  const cookieStore = cookies()
  if (cookieStore.get('admin_auth')?.value !== getToken()) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY absente — aucun appel effectué' }, { status: 500 })
  }

  try {
    const { fiches, nbTextSearch, nbPlaceDetails } = await enrichirBatch(BAT_10, fetchPageSimple)

    // Contrôle final — les contrôles préventifs (avant chaque appel,
    // dans enrichirBatch) sont la vraie garantie ; ceci reste une
    // défense en profondeur complémentaire.
    if (nbTextSearch > MAX_TEXT_SEARCH_CALLS || nbPlaceDetails > MAX_PLACE_DETAILS_CALLS) {
      return NextResponse.json({ error: `Anomalie : compteur d'appels dépassé (textSearch=${nbTextSearch}, placeDetails=${nbPlaceDetails})` }, { status: 500 })
    }

    const resultats = fiches.map((f) => ({
      siren: f.reference.siren,
      entreprise: f.reference.raisonSociale,
      secteur: (BAT_10.find((b) => b.siren === f.reference.siren) as any)?.secteur ?? null,
      matching: f.matchGoogle.statut,
      placeId: f.placeIdGoogle,
      telephone: f.telephone?.valeur ?? null,
      site: f.siteWeb?.valeur ?? null,
      email: f.email?.valeur ?? null,
      sources: { telephone: f.telephone?.source ?? null, email: f.email?.source ?? null, site: f.siteWeb?.source ?? null },
      contactabilite: f.contactabilite,
    }))

    return NextResponse.json({
      resultats,
      textSearchCalls: nbTextSearch,
      placeDetailsCalls: nbPlaceDetails,
      nombreMatchFort: fiches.filter((f) => f.matchGoogle.statut === 'MATCH_FORT').length,
      nombreMatchProbable: fiches.filter((f) => f.matchGoogle.statut === 'MATCH_PROBABLE').length,
      nombreAmbigu: fiches.filter((f) => f.matchGoogle.statut === 'AMBIGU').length,
      nombreNonTrouve: fiches.filter((f) => f.matchGoogle.statut === 'NON_TROUVE').length,
      nombreTelephone: fiches.filter((f) => f.telephone).length,
      nombreSite: fiches.filter((f) => f.siteWeb).length,
      nombreEmail: fiches.filter((f) => f.email).length,
      nombreCanalExploitable: fiches.filter((f) => f.contactabilite === 'BONNE' || f.contactabilite === 'PARTIELLE').length,
    })
  } catch (e: any) {
    // Ne jamais renvoyer la clé ni un détail sensible dans l'erreur.
    return NextResponse.json({ error: e.message?.includes('API_KEY') ? 'Erreur de configuration (clé)' : e.message }, { status: 500 })
  }
}
