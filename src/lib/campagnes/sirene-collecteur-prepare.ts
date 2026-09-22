// ══════════════════════════════════════════════════════════════
// AUTO.2C LOT 4 — Préparation CONCEPTUELLE du collecteur SIRENE national.
// AUCUNE IMPLÉMENTATION RÉELLE, AUCUN APPEL RÉSEAU. Ce fichier définit
// uniquement les types et la signature attendue, pour cadrer AUTO.2D sans
// l'exécuter. collecter() lève une erreur explicite si jamais appelée par
// erreur — aucune collecte possible tant qu'AUTO.2D n'est pas validé.
// ══════════════════════════════════════════════════════════════

export type TerritoireCollecte = 'FRANCE' | 'IDF' | { departement: string } | { commune: string } | { rayonKm: number; centreLat: number; centreLng: number }

export interface CritereCollecteSirene {
  segment: string // ex. 'AUTO_ECOLE' — résolu ensuite vers les codes NAF via segment-config.ts
  territoire: TerritoireCollecte // LOT 4 : la géographie est un FILTRE post-collecte, jamais un critère structurel du segment
}

/**
 * SIRENE diffuse ses établissements avec DEUX colonnes d'activité
 * principale coexistant pendant la transition (confirmé par audit
 * AUTO.2B) : `activitePrincipaleEtablissement` (NAF Rév.2, actuel) et
 * `activitePrincipaleNAF25Etablissement` (NAF 2025, anticipé, effectif
 * au 01/01/2027). Le collecteur doit lire l'une OU l'autre selon ce qui
 * est renseigné pour chaque ligne — jamais une seule version hardcodée.
 */
export interface EtablissementSireneBrut {
  siren: string
  siret: string
  denomination: string | null
  activitePrincipaleEtablissement: string | null // NAF Rév.2
  activitePrincipaleNAF25Etablissement: string | null // NAF 2025 (anticipé)
  adresse: string | null
  codePostal: string | null
  commune: string | null
  trancheEffectif: string | null
  etatAdministratif: 'A' | 'F' | null // Actif / Fermé
  dateCreation: string | null
}

/**
 * collecter — SIGNATURE PRÉPARÉE, NON IMPLÉMENTÉE. Lève une erreur
 * explicite si appelée : aucune collecte ne doit pouvoir se produire tant
 * qu'AUTO.2D n'a pas été explicitement validé et implémenté.
 */
export async function collecter(_criteres: CritereCollecteSirene): Promise<EtablissementSireneBrut[]> {
  throw new Error(
    'collecter() est une préparation conceptuelle AUTO.2C LOT 4, non implémentée. ' +
    'Aucune collecte SIRENE ne doit avoir lieu avant validation explicite AUTO.2D.'
  )
}
