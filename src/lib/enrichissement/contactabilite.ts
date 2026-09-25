import type { FicheEnrichie } from './types'

/**
 * calculerContactabilite — BONNE/PARTIELLE/INSUFFISANTE/BLOQUEE.
 * Absence de coordonnées != BLOQUEE (uniquement une vraie opposition
 * objective justifie BLOQUEE — non gérée ici, à croiser avec le modèle
 * d'opposition existant si un canal est déjà marqué opposé ailleurs).
 */
export function calculerContactabilite(
  fiche: Pick<FicheEnrichie, 'telephone' | 'email' | 'siteWeb' | 'matchGoogle'>,
  oppositionConnue: boolean
): { contactabilite: FicheEnrichie['contactabilite']; raison: string } {
  if (oppositionConnue) {
    return { contactabilite: 'BLOQUEE', raison: 'Opposition/interdiction objective connue sur cette entreprise' }
  }

  const canalFiableExploitable =
    (fiche.telephone?.niveauConfiance === 'CONFIRME') ||
    (fiche.email?.niveauConfiance === 'CONFIRME') ||
    (fiche.siteWeb?.niveauConfiance === 'CONFIRME' && fiche.matchGoogle.statut === 'MATCH_FORT')

  if (canalFiableExploitable) {
    return { contactabilite: 'BONNE', raison: 'Au moins un canal professionnel exploitable avec rapprochement fiable' }
  }

  const uneCoordonneePresente = !!(fiche.telephone || fiche.email || fiche.siteWeb)
  if (uneCoordonneePresente) {
    return { contactabilite: 'PARTIELLE', raison: 'Coordonnée présente mais confiance insuffisante ou rapprochement à vérifier' }
  }

  return { contactabilite: 'INSUFFISANTE', raison: 'Aucun canal exploitable identifié' }
}
