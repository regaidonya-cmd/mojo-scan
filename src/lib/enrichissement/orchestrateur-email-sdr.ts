import { extraireEmailsEntreprise } from './extraction-email-sdr'
import type { ResultatExtractionEntreprise } from './extraction-email-sdr'

export interface RapportExtractionGlobal {
  nbSites: number
  nbAvecAuMoinsUnEmailRetenu: number
  nbSansEmail: number
  totalEmailsRetenus: number
  totalEmailsAVerifier: number
  resultats: ResultatExtractionEntreprise[]
}

/**
 * executerExtractionEmailSdr — ÉTAPE 1 UNIQUEMENT. Lit les sites déjà
 * obtenus (company_id, siren, site_web) et extrait les emails. NE
 * PERSISTE RIEN — retourne uniquement un rapport JSON pour inspection
 * manuelle. La persistance dans personnes_moyens_contact sera une étape
 * séparée, après validation explicite de la qualité des résultats.
 */
export async function executerExtractionEmailSdr(
  sites: { companyId: string; siren: string; siteWeb: string }[],
  fetchFn?: (url: string) => Promise<{ status: number; html: string; urlFinale: string }>
): Promise<RapportExtractionGlobal> {
  const resultats: ResultatExtractionEntreprise[] = []
  for (const site of sites) {
    resultats.push(await extraireEmailsEntreprise(site.companyId, site.siren, site.siteWeb, fetchFn))
  }

  return {
    nbSites: sites.length,
    nbAvecAuMoinsUnEmailRetenu: resultats.filter((r) => r.nbRetenus > 0).length,
    nbSansEmail: resultats.filter((r) => r.nbRetenus === 0 && r.nbAVerifier === 0).length,
    totalEmailsRetenus: resultats.reduce((acc, r) => acc + r.nbRetenus, 0),
    totalEmailsAVerifier: resultats.reduce((acc, r) => acc + r.nbAVerifier, 0),
    resultats,
  }
}
