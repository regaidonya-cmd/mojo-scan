// ══════════════════════════════════════════════════════════════
// SDR.VSG.4 — Persistance d'un lot SDR dans enrichissement_resultats.
// Réutilise entièrement le modèle existant (table créée en
// ENRICH.VSG.6, étendue en VSG.DATA.3 côté classification) — AUCUNE
// nouvelle table, AUCUNE confusion avec campagnes/Brevo.
//
// Chaîne respectée : SIRENE (MEMBRES_VSG_SDR_ENRICH_01) -> companies
// (find-or-create, réutilise import-companies-vsg50.ts) ->
// enrichissement_resultats (statut='A_TRAITER', jamais prospects_sales).
// ══════════════════════════════════════════════════════════════

import { importerLotEntreprises, versEntrepriseAImporter } from './import-companies-vsg50'
import type { PersistanceImportClient } from './import-companies-vsg50'
import type { MembreLotSdr } from './donnees-lot-sdr-vsg-enrich-01'

export interface HistoriqueEnrichissement {
  siren: string
  statut: string
  telephone: string | null
  verdictMatching: string | null
}

export interface PersistanceLotSdrClient {
  /** Historique d'enrichissement du SIREN, toutes sources/lots confondus
   * (hors le lot courant). Permet la réutilisation d'un résultat déjà
   * exploitable, sans jamais rappeler Google pour ce SIREN. */
  historiqueEnrichissement(lotCodeCourant: string, siren: string[]): Promise<HistoriqueEnrichissement[]>
  /** SIREN déjà présents dans CE lot précis (idempotence d'une relance de persistance). */
  sirenDejaDansCeLot(lotCode: string, siren: string[]): Promise<string[]>
  insererMembreATraiter(lotCode: string, companyId: string, membre: MembreLotSdr, reutilisation: HistoriqueEnrichissement | null): Promise<void>
}

const STATUTS_EXPLOITABLES = ['MATCH_FORT', 'MATCH_PROBABLE']

export interface RapportPersistanceLot {
  lotCode: string
  companiesCreees: number
  companiesDejaPresentes: number
  companiesErreurs: number
  membresInseresNouveaux: number
  membresReutilises: number // résultat Google déjà exploitable ailleurs, réutilisé, jamais rappelé
  membresDejaPresents: number // idempotence intra-lot
  bloque: boolean
  raisonBlocage: string | null
}

/**
 * persisterLotSdr — ENRICH.SDR.VSG.4 (corrigé) :
 * - Garde-fou DUR : uniquement les doublons DE SIREN DANS LE JEU FOURNI
 *   (jamais deux fois le même SIREN dans le même lot). L'appartenance
 *   passée à un AUTRE lot n'est PLUS, à elle seule, une exclusion.
 * - Pour chaque SIREN, l'historique d'enrichissement (tous lots/sources
 *   confondus) est consulté : si un résultat EXPLOITABLE existe déjà
 *   (MATCH_FORT/MATCH_PROBABLE), il est RÉUTILISÉ pour ce lot — la ligne
 *   insérée est marquée terminale (jamais un nouvel appel Google). Si le
 *   résultat précédent n'est pas exploitable (NON_TROUVE/AMBIGU/ERREUR),
 *   la politique de retraitement n'est pas tranchée ici : comportement
 *   par défaut = insertion normale en A_TRAITER (sera retenté dans ce lot).
 */
export async function persisterLotSdr(
  lotCode: string,
  membres: MembreLotSdr[],
  source: string,
  clientImport: PersistanceImportClient,
  clientLot: PersistanceLotSdrClient
): Promise<RapportPersistanceLot> {
  const sirens = membres.map((m) => m.siren)

  // Garde-fou DUR : jamais deux fois le même SIREN DANS CE LOT.
  if (new Set(sirens).size !== membres.length) {
    return { lotCode, companiesCreees: 0, companiesDejaPresentes: 0, companiesErreurs: 0, membresInseresNouveaux: 0, membresReutilises: 0, membresDejaPresents: 0, bloque: true, raisonBlocage: 'Doublons de SIREN dans le jeu fourni (même lot)' }
  }

  // Idempotence intra-lot : si une relance de CETTE persistance est faite, ne jamais dupliquer.
  const dejaDansCeLot = new Set(await clientLot.sirenDejaDansCeLot(lotCode, sirens))

  // Historique inter-lots — informatif, jamais bloquant pour le lot entier.
  const historique = await clientLot.historiqueEnrichissement(lotCode, sirens)
  const historiqueParSiren = new Map(historique.map((h) => [h.siren, h]))

  // Étape 1 : find-or-create companies + etablissements pour tous les membres à traiter.
  const aTraiter = membres.filter((m) => !dejaDansCeLot.has(m.siren))
  const entreprisesAImporter = aTraiter.map((m) =>
    versEntrepriseAImporter(m.siren, m.siret, m.name, m.enseigne, m.naf, m.address, m.postalCode, m.city, m.effectif, m.siege, source)
  )
  const rapportImport = entreprisesAImporter.length > 0
    ? await importerLotEntreprises(entreprisesAImporter, clientImport)
    : { nbCrees: 0, nbDejaPresents: 0, nbErreurs: 0, resultats: [] }

  // Étape 2 : insertion idempotente des membres, avec réutilisation si un résultat exploitable existe déjà ailleurs.
  let membresInseresNouveaux = 0
  let membresReutilises = 0
  for (const membre of aTraiter) {
    const resultatImport = rapportImport.resultats?.find((r) => r.siren === membre.siren)
    if (!resultatImport || resultatImport.statutCompany === 'ERREUR_COMPENSEE' || !resultatImport.companyId) continue

    const histo = historiqueParSiren.get(membre.siren)
    const reutilisable = histo && STATUTS_EXPLOITABLES.includes(histo.statut) ? histo : null

    await clientLot.insererMembreATraiter(lotCode, resultatImport.companyId, membre, reutilisable)
    if (reutilisable) membresReutilises++
    else membresInseresNouveaux++
  }

  return {
    lotCode,
    companiesCreees: rapportImport.nbCrees, companiesDejaPresentes: rapportImport.nbDejaPresents, companiesErreurs: rapportImport.nbErreurs,
    membresInseresNouveaux, membresReutilises, membresDejaPresents: dejaDansCeLot.size,
    bloque: false, raisonBlocage: null,
  }
}
