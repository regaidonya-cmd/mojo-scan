// ══════════════════════════════════════════════════════════════
// SDR.VSG.4 — Comptage générique vers l'objectif 100 téléphones fiables.
// Un numéro partagé par ≥2 entreprises distinctes ne compte JAMAIS comme
// 2 téléphones fiables tant que l'attribution n'est pas confirmée — les
// deux sont requalifiées A_VERIFIER.
// ══════════════════════════════════════════════════════════════

export interface LigneTelephoneCandidat {
  companyId: string
  siren: string
  telephone: string
  statut: string // MATCH_FORT | MATCH_PROBABLE | ...
}

export type QualificationTelephone = 'FIABLE' | 'A_VERIFIER'

export interface ResultatComptage {
  objectif: number
  fiables: number
  aVerifier: number
  manquants: number
  details: { siren: string; telephone: string; qualification: QualificationTelephone; raison: string }[]
}

function normaliserTelephone(tel: string): string {
  return tel.replace(/[\s.\-()]/g, '')
}

/**
 * compterTelephonesFiables — dédupliqué par numéro normalisé. Un numéro
 * partagé entre ≥2 company_id distincts est automatiquement requalifié
 * A_VERIFIER pour TOUTES les entreprises concernées (jamais compté
 * plusieurs fois comme fiable). Ne modifie aucune donnée — calcul pur.
 */
export function compterTelephonesFiables(lignes: LigneTelephoneCandidat[], objectif: number): ResultatComptage {
  const parNumero = new Map<string, LigneTelephoneCandidat[]>()
  for (const l of lignes) {
    const norm = normaliserTelephone(l.telephone)
    if (!parNumero.has(norm)) parNumero.set(norm, [])
    parNumero.get(norm)!.push(l)
  }

  const details: ResultatComptage['details'] = []
  for (const [, groupe] of Array.from(parNumero.entries())) {
    const companiesDistinctes = new Set(groupe.map((g) => g.companyId)).size
    for (const l of groupe) {
      if (companiesDistinctes > 1) {
        details.push({ siren: l.siren, telephone: l.telephone, qualification: 'A_VERIFIER', raison: `Numéro partagé par ${companiesDistinctes} entreprises distinctes` })
      } else {
        details.push({ siren: l.siren, telephone: l.telephone, qualification: 'FIABLE', raison: 'Numéro unique, statut exploitable' })
      }
    }
  }

  const fiables = details.filter((d) => d.qualification === 'FIABLE').length
  const aVerifier = details.filter((d) => d.qualification === 'A_VERIFIER').length

  return { objectif, fiables, aVerifier, manquants: Math.max(0, objectif - fiables), details }
}
