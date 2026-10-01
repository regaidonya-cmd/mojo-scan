import { extraireEmailsEntreprise } from './extraction-email-sdr'
import type { ResultatExtractionEntreprise } from './extraction-email-sdr'
import { qualifierLotEntreprises } from './qualification-email-v2'
import type { ResultatQualifieEntreprise } from './qualification-email-v2'

export interface RapportExtractionGlobal {
  nbSites: number
  nbAvecAuMoinsUnEmailRetenu: number
  nbSansEmail: number
  totalEmailsRetenus: number
  totalEmailsAVerifier: number
  resultats: ResultatExtractionEntreprise[]
  qualificationV2?: ResultatQualifieEntreprise[] // additif — présent uniquement si communeCible fourni
}

/**
 * executerExtractionEmailSdr — extraction (V1, inchangée) + qualification
 * V2 OPTIONNELLE et ADDITIVE (non-breaking : les appels existants sans
 * communeCible conservent exactement le même comportement qu'avant).
 * NE PERSISTE RIEN — retourne uniquement un rapport JSON pour inspection.
 */
export async function executerExtractionEmailSdr(
  sites: { companyId: string; siren: string; siteWeb: string; telephone?: string | null; telephoneFiable?: boolean }[],
  fetchFn?: (url: string) => Promise<{ status: number; html: string; urlFinale: string }>,
  communeCible?: string,
  aliasesCommune?: string[]
): Promise<RapportExtractionGlobal> {
  const resultats: ResultatExtractionEntreprise[] = []
  for (const site of sites) {
    resultats.push(await extraireEmailsEntreprise(site.companyId, site.siren, site.siteWeb, fetchFn))
  }

  const rapport: RapportExtractionGlobal = {
    nbSites: sites.length,
    nbAvecAuMoinsUnEmailRetenu: resultats.filter((r) => r.nbRetenus > 0).length,
    nbSansEmail: resultats.filter((r) => r.nbRetenus === 0 && r.nbAVerifier === 0).length,
    totalEmailsRetenus: resultats.reduce((acc, r) => acc + r.nbRetenus, 0),
    totalEmailsAVerifier: resultats.reduce((acc, r) => acc + r.nbAVerifier, 0),
    resultats,
  }

  if (communeCible) {
    const entrees = sites.map((site, i) => ({
      companyId: site.companyId, siren: site.siren, siteWeb: site.siteWeb,
      telephone: site.telephone ?? null, telephoneFiable: site.telephoneFiable ?? false,
      emailsTrouves: resultats[i].emailsTrouves, communeCible, aliasesCommune,
    }))
    rapport.qualificationV2 = qualifierLotEntreprises(entrees)
  }

  return rapport
}
