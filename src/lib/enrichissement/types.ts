// ══════════════════════════════════════════════════════════════
// ENRICH.VSG.1 — POC d'enrichissement automatisé. Code générique :
// AUCUN "if APE === ..." / "if secteur === ..." / "if commune === ...".
// Villeneuve-Saint-Georges est un jeu de test, jamais une contrainte du
// moteur. Aucune écriture DB, aucun appel réel sans clé fournie.
// ══════════════════════════════════════════════════════════════

/** Identité de référence — toujours issue de SIRENE, jamais écrasée par Google. */
export interface EtablissementReference {
  siren: string
  siret: string
  raisonSociale: string
  enseigne: string | null
  adresse: string
  codePostal: string
  commune: string
  ape: string
}

export type StatutMatchGoogle = 'MATCH_FORT' | 'MATCH_PROBABLE' | 'AMBIGU' | 'NON_TROUVE'

export interface CandidatGooglePlace {
  placeId: string
  displayName: string
  formattedAddress: string
}

export interface ResultatMatching {
  statut: StatutMatchGoogle
  candidatRetenu: CandidatGooglePlace | null
  score: number // 0-1, jamais exposé comme vérité absolue, seulement un signal
  raisons: string[]
}

export type SourceDonnee = 'SIRENE' | 'GOOGLE_PLACES' | 'SITE_OFFICIEL_CONTACT' | 'SITE_OFFICIEL_MENTIONS' | 'SITE_OFFICIEL_AUTRE' | 'WEB_SEARCH_GENERIQUE'

export interface DonneeTracee<T> {
  valeur: T
  source: SourceDonnee
  urlSource: string | null
  niveauConfiance: 'CONFIRME' | 'PROBABLE' | 'A_VERIFIER'
}

export interface FicheEnrichie {
  reference: EtablissementReference
  matchGoogle: ResultatMatching
  placeIdGoogle: string | null
  telephone: DonneeTracee<string> | null
  siteWeb: DonneeTracee<string> | null
  email: DonneeTracee<string> | null
  googleMapsUri: string | null
  contactabilite: 'BONNE' | 'PARTIELLE' | 'INSUFFISANTE' | 'BLOQUEE'
  raisonContactabilite: string
}
