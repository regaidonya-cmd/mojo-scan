// ══════════════════════════════════════════════════════════════
// AUTO.2C LOT 1 + LOT 3 — Référentiel de configuration par segment.
// C'est le SEUL fichier autorisé à connaître des noms de sources métier
// ('ADI_DHUP', 'RAFAEL', etc.) — le moteur générique (engine.ts) ne les
// connaît jamais directement.
//
// LOT 3 — Gestion NAF Rév.2 / NAF 2025 : chaque segment porte DEUX listes
// de codes NAF (une par nomenclature), jamais une seule version hardcodée.
// Transition NAF 2025 effective au 1er janvier 2027 (85.53Z -> 85.53Y).
// ══════════════════════════════════════════════════════════════

import type { SegmentEligibiliteConfig } from './types'

export interface NafMappingVersionne {
  segmentId: string
  /** Codes APE en nomenclature actuelle (NAF Rév.2), signal PRINCIPAL de découverte. */
  nafRev2Principal: string[]
  /** Codes APE Rév.2, signal SECONDAIRE uniquement — jamais suffisant seul
   * pour un statut CONFIRME, nécessite toujours une preuve complémentaire. */
  nafRev2Secondaire: string[]
  /** Équivalents NAF 2025 (applicable à partir du 01/01/2027). Renseignés
   * par anticipation — le collecteur doit pouvoir lire l'une ou l'autre
   * colonne SIRENE sans jamais hardcoder une seule version. */
  naf2025Principal: string[]
  naf2025Secondaire: string[]
}

export const SEGMENT_ELIGIBILITE_CONFIGS: Record<string, SegmentEligibiliteConfig> = {
  'PARC-001': { // Diagnostiqueur immobilier
    segmentId: 'PARC-001',
    sourcesPreuveMetierAcceptables: ['ADI_DHUP'], // preuve métier : ADI_DHUP reste la seule source acceptée
    sourcesContactAcceptables: 'ANY', // la provenance du CONTACT est une dimension distincte de la preuve métier — un email trouvé sur le site officiel d'un diagnostiqueur déjà confirmé par ADI_DHUP reste un contact valide
  },
  'PARC-002': { // Auto-école
    segmentId: 'PARC-002',
    sourcesPreuveMetierAcceptables: ['RAFAEL'],
    sourcesContactAcceptables: 'ANY', // RAFAEL ne fournit pas d'email — un contact via site officiel/SIRENE reste acceptable
  },
}

export const NAF_MAPPINGS_VERSIONNES: NafMappingVersionne[] = [
  {
    segmentId: 'PARC-001',
    nafRev2Principal: ['71.20B'], nafRev2Secondaire: [],
    naf2025Principal: [], naf2025Secondaire: [], // à compléter lors de la publication officielle de la table de correspondance
  },
  {
    segmentId: 'PARC-002',
    nafRev2Principal: ['85.53Z'],
    nafRev2Secondaire: ['85.59B'], // jamais suffisant seul pour CONFIRME
    naf2025Principal: ['85.53Y'],
    naf2025Secondaire: [], // équivalent 2025 de 85.59B non confirmé publiquement — laissé vide plutôt qu'inventé
  },
]

/** Résout la config d'éligibilité d'un segment — retourne null si segment
 * inconnu/non configuré (jamais un crash, jamais une config par défaut
 * permissive). */
export function resoudreConfigSegment(segmentId: string | null): SegmentEligibiliteConfig | null {
  if (!segmentId) return null
  return SEGMENT_ELIGIBILITE_CONFIGS[segmentId] ?? null
}

/** Résout le niveau de signal NAF (principal/secondaire/aucun) pour un
 * segment donné, quelle que soit la nomenclature (Rév.2 ou 2025). Ne
 * retourne JAMAIS un niveau "principal" pour un code secondaire — le
 * secondaire reste toujours insuffisant seul pour CONFIRME. */
export function resoudreSignalNaf(naf: string | null, segmentId: string): 'PRINCIPAL' | 'SECONDAIRE' | 'AUCUN' {
  if (!naf) return 'AUCUN'
  const mapping = NAF_MAPPINGS_VERSIONNES.find((m) => m.segmentId === segmentId)
  if (!mapping) return 'AUCUN'
  if (mapping.nafRev2Principal.includes(naf) || mapping.naf2025Principal.includes(naf)) return 'PRINCIPAL'
  if (mapping.nafRev2Secondaire.includes(naf) || mapping.naf2025Secondaire.includes(naf)) return 'SECONDAIRE'
  return 'AUCUN'
}
