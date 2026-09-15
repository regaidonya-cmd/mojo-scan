// ══════════════════════════════════════════════════════════════
// P0.6A — Modèle commercial (Contactabilité / Connaissance / Armement)
// Fonctions pures. Consomme le résultat du moteur P0.5 (evaluateProspect)
// + les faits commerciaux déjà persistés. N'accède jamais à Supabase.
// ══════════════════════════════════════════════════════════════

import type { ProspectInput, CommercialPriorityResult } from './types'

export type Contactabilite = 'BONNE' | 'PARTIELLE' | 'INSUFFISANTE' | 'BLOQUEE'
export type Connaissance = 'FAIBLE' | 'MOYENNE' | 'BONNE'
export type Armement = 'PRET' | 'INSUFFISANT'

export interface FaitCommercial {
  texte: string
  sensibilite: 'UTILISABLE_DANS_ACCROCHE' | 'CONTEXTE_INTERNE' | 'A_VERIFIER'
  source: string
}

export interface BusinessModelResult {
  contactabilite: Contactabilite
  connaissance: Connaissance
  armement: Armement
  ready: boolean
  faitPrincipal: FaitCommercial | null
  raisonMaintenant: string
}

/**
 * P0.5C.1 — Contactabilité corrigée :
 * BLOQUEE seulement si opposition globale OU aucun canal autorisé
 * pour une raison d'opposition. Absence de donnée ≠ BLOQUEE.
 */
function computeContactabilite(input: ProspectInput, engineResult: CommercialPriorityResult): Contactabilite {
  if (input.globalOppositionActive) return 'BLOQUEE'

  const allowed = input.contactMethods.filter((c) => c.allowed)
  if (allowed.length === 0) {
    // PREUVE (P0.6A.1) : ContactMethod.allowed est positionné exclusivement
    // dans fetch-real.ts par `!personneOpposee && !moyenOppose && !canalBloque`,
    // trois variables dérivées uniquement de lignes actives de la table
    // `oppositions`. Une donnée simplement absente (tél/email manquant)
    // ne produit JAMAIS d'entrée ContactMethod avec allowed=false — elle
    // ne produit aucune entrée du tout. Donc : contactMethods.length > 0
    // ET aucun allowed ==> nécessairement une opposition réelle sur
    // chaque méthode présente. BLOQUEE est ici toujours justifiée par
    // une opposition, jamais par une simple absence de donnée.
    const hadMethodsButNoneAllowed = input.contactMethods.length > 0
    return hadMethodsButNoneAllowed ? 'BLOQUEE' : 'INSUFFISANTE'
  }

  const distinctPersonnes = new Set(allowed.filter((c) => c.nominatif).map((c) => c.personneId))
  if (distinctPersonnes.size > 1) return 'PARTIELLE' // interlocuteur ambigu, canal existe
  if (input.contactMethods.some((c) => !c.allowed)) return 'PARTIELLE' // un canal/valeur bloqué parmi d'autres
  return 'BONNE'
}

function computeConnaissance(faits: FaitCommercial[]): Connaissance {
  const utilisable = faits.filter((f) => f.sensibilite === 'UTILISABLE_DANS_ACCROCHE')
  if (utilisable.length > 0) return 'BONNE'
  if (faits.length > 0) return 'MOYENNE'
  return 'FAIBLE'
}

/**
 * ARMEMENT = PRET uniquement si un fait UTILISABLE_DANS_ACCROCHE existe.
 * Un fait CONTEXTE_INTERNE ou A_VERIFIER seul ne suffit jamais
 * (règle durcie P0.5C — cas DIAGPROEVO/DIAGOBAH).
 */
function computeArmement(contactabilite: Contactabilite, faits: FaitCommercial[]): Armement {
  if (contactabilite === 'BLOQUEE') return 'INSUFFISANT'
  const hasUsableFait = faits.some((f) => f.sensibilite === 'UTILISABLE_DANS_ACCROCHE')
  return hasUsableFait ? 'PRET' : 'INSUFFISANT'
}

function computeRaisonMaintenant(
  priorite: string,
  potentiel: string,
  faitPrincipal: FaitCommercial | null,
  whyNow: string[]
): string {
  if (priorite === 'P0' || priorite === 'P1') {
    return whyNow[whyNow.length - 1] || 'Signal commercial récent identifié.'
  }
  if (faitPrincipal && faitPrincipal.sensibilite === 'UTILISABLE_DANS_ACCROCHE') {
    return faitPrincipal.texte
  }
  if (potentiel === 'FORT') {
    return 'Meilleur prospect disponible à travailler actuellement.'
  }
  return 'Prospect à qualifier.'
}

/**
 * P0.6A.1 — Un site_statut seul (FOUND, AMBIGUOUS ou NOT_FOUND), sans
 * détail de page réellement observé ni fait complémentaire, n'est
 * JAMAIS suffisant pour UTILISABLE_DANS_ACCROCHE.
 * FOUND seul / NOT_FOUND seul -> pas un fait différenciant (retiré).
 * AMBIGUOUS seul -> A_VERIFIER (anomalie à lever, pas une accroche).
 */
export function classifySiteStatutOnly(
  siteStatut: 'FOUND' | 'AMBIGUOUS' | 'NOT_FOUND'
): 'A_VERIFIER' | null {
  if (siteStatut === 'AMBIGUOUS') return 'A_VERIFIER'
  return null // FOUND ou NOT_FOUND seuls : aucun fait différenciant
}

export function evaluateBusinessModel(
  input: ProspectInput,
  engineResult: CommercialPriorityResult,
  faits: FaitCommercial[]
): BusinessModelResult {
  const contactabilite = computeContactabilite(input, engineResult)
  const connaissance = computeConnaissance(faits)
  const armement = computeArmement(contactabilite, faits)
  const ready =
    (contactabilite === 'BONNE' || contactabilite === 'PARTIELLE') && armement === 'PRET'

  const faitPrincipal =
    faits.find((f) => f.sensibilite === 'UTILISABLE_DANS_ACCROCHE') ?? faits[0] ?? null

  const raisonMaintenant = computeRaisonMaintenant(
    engineResult.priorite,
    engineResult.potentiel,
    faitPrincipal,
    engineResult.whyNow
  )

  return { contactabilite, connaissance, armement, ready, faitPrincipal, raisonMaintenant }
}
