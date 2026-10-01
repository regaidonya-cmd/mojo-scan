import { compterTelephonesFiables } from './compteur-objectif-sdr'
import type { LigneTelephoneCandidat } from './compteur-objectif-sdr'

export interface LigneResultatLot {
  siren: string
  companyId: string
  familleMetier: string | null
  statut: string
  telephone: string | null
  siteWeb: string | null
  erreur: string | null
}

export interface StatFamille {
  famille: string
  interroges: number
  matchFort: number
  matchProbable: number
  ambigu: number
  nonTrouve: number
  erreurs: number
  telephonesObtenus: number
  sitesObtenus: number
  tauxTelephonePct: number
}

export interface RapportPostLot {
  interroges: number
  matchFort: number
  matchProbable: number
  ambigu: number
  nonTrouve: number
  erreurs: number
  telephonesObtenus: number
  telephonesFiables: number
  telephonesAVerifier: number
  sitesObtenus: number
  parFamille: StatFamille[]
}

/** construireRapportPostLot — calcul pur, aucune écriture. Dédup
 * téléphones par numéro normalisé (réutilise compterTelephonesFiables)
 * — un numéro partagé entre ≥2 company_id ne devient jamais FIABLE. */
export function construireRapportPostLot(lignes: LigneResultatLot[]): RapportPostLot {
  const candidatsTelephone: LigneTelephoneCandidat[] = lignes
    .filter((l) => l.telephone)
    .map((l) => ({ companyId: l.companyId, siren: l.siren, telephone: l.telephone!, statut: l.statut }))
  const comptage = compterTelephonesFiables(candidatsTelephone, 0) // objectif non pertinent ici, juste fiables/aVerifier

  const familles = Array.from(new Set(lignes.map((l) => l.familleMetier ?? 'Non classé')))
  const parFamille: StatFamille[] = familles.map((famille) => {
    const sousEnsemble = lignes.filter((l) => (l.familleMetier ?? 'Non classé') === famille)
    const tel = sousEnsemble.filter((l) => l.telephone).length
    return {
      famille,
      interroges: sousEnsemble.length,
      matchFort: sousEnsemble.filter((l) => l.statut === 'MATCH_FORT').length,
      matchProbable: sousEnsemble.filter((l) => l.statut === 'MATCH_PROBABLE').length,
      ambigu: sousEnsemble.filter((l) => l.statut === 'AMBIGU').length,
      nonTrouve: sousEnsemble.filter((l) => l.statut === 'NON_TROUVE').length,
      erreurs: sousEnsemble.filter((l) => l.statut === 'ERREUR').length,
      telephonesObtenus: tel,
      sitesObtenus: sousEnsemble.filter((l) => l.siteWeb).length,
      tauxTelephonePct: sousEnsemble.length > 0 ? Math.round((1000 * tel) / sousEnsemble.length) / 10 : 0,
    }
  })

  return {
    interroges: lignes.length,
    matchFort: lignes.filter((l) => l.statut === 'MATCH_FORT').length,
    matchProbable: lignes.filter((l) => l.statut === 'MATCH_PROBABLE').length,
    ambigu: lignes.filter((l) => l.statut === 'AMBIGU').length,
    nonTrouve: lignes.filter((l) => l.statut === 'NON_TROUVE').length,
    erreurs: lignes.filter((l) => l.statut === 'ERREUR').length,
    telephonesObtenus: candidatsTelephone.length,
    telephonesFiables: comptage.fiables,
    telephonesAVerifier: comptage.aVerifier,
    sitesObtenus: lignes.filter((l) => l.siteWeb).length,
    parFamille,
  }
}
