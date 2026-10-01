import { MEMBRES_VSG_SDR_ENRICH_01 } from './donnees-lot-sdr-vsg-enrich-01'
import { MEMBRES_VSG_SDR_ENRICH_02 } from './donnees-lot-sdr-vsg-enrich-02'
import type { MembreLotSdr } from './donnees-lot-sdr-vsg-enrich-01'

// ══════════════════════════════════════════════════════════════
// Registre whitelist des lots SDR connus côté SERVEUR. Un lot_code fourni
// par le navigateur n'est JAMAIS utilisé tel quel — il doit correspondre
// exactement à une entrée de ce registre, sinon la requête est refusée.
// Ajouter un futur lot = ajouter une entrée ici, jamais accepter un
// lot_code arbitraire en entrée de route.
// ══════════════════════════════════════════════════════════════

export const REGISTRE_LOTS_SDR: Record<string, MembreLotSdr[]> = {
  VSG_SDR_ENRICH_01: MEMBRES_VSG_SDR_ENRICH_01,
  VSG_SDR_ENRICH_02: MEMBRES_VSG_SDR_ENRICH_02,
}

export function lotConnu(lotCode: string): boolean {
  return Object.prototype.hasOwnProperty.call(REGISTRE_LOTS_SDR, lotCode)
}

export function membresDuLot(lotCode: string): MembreLotSdr[] | null {
  return lotConnu(lotCode) ? REGISTRE_LOTS_SDR[lotCode] : null
}
