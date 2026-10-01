import type { EtablissementReference } from './types'

// ══════════════════════════════════════════════════════════════
// SDR.VSG.5 — Lecture OBLIGATOIRE depuis enrichissement_resultats +
// companies + etablissements. Interdiction stricte de reconstruire la
// liste depuis un fichier, une constante TypeScript, ou la mémoire
// conversationnelle — c'est exactement le point corrigé après
// l'incident VSG.DATA.3.
// ══════════════════════════════════════════════════════════════

export interface MembreLotPourGoogle extends EtablissementReference {
  lotCode: string
  rang: number | null
  familleMetier: string | null
}

/**
 * lireLotDepuisDB — lit exclusivement enrichissement_resultats pour le
 * lot_code donné, joint companies/etablissements pour obtenir les champs
 * nécessaires à la requête Google. Ne lit JAMAIS un fichier de données
 * figées. Si la jointure échoue pour une ligne (company_id orphelin,
 * établissement introuvable), cette ligne est exclue et signalée —
 * jamais une donnée inventée.
 */
export async function lireLotDepuisDB(
  supabase: any,
  lotCode: string
): Promise<{ membres: MembreLotPourGoogle[]; lignesExclues: { siren: string; raison: string }[] }> {
  const { data: lignesEnrichissement, error: erreurLecture } = await supabase
    .from('enrichissement_resultats')
    .select('siren, company_id, siret, rang, famille_metier')
    .eq('lot_code', lotCode)
  if (erreurLecture) throw new Error(`Lecture enrichissement_resultats: ${erreurLecture.message}`)

  const membres: MembreLotPourGoogle[] = []
  const lignesExclues: { siren: string; raison: string }[] = []

  for (const ligne of lignesEnrichissement ?? []) {
    if (!ligne.company_id) {
      lignesExclues.push({ siren: ligne.siren, raison: 'company_id manquant' })
      continue
    }
    const { data: company, error: erreurCompany } = await supabase
      .from('companies').select('name, trade_name, naf').eq('id', ligne.company_id).single()
    if (erreurCompany || !company) {
      lignesExclues.push({ siren: ligne.siren, raison: 'company introuvable' })
      continue
    }
    const { data: etablissement, error: erreurEtab } = await supabase
      .from('etablissements').select('adresse, code_postal, ville')
      .eq('company_id', ligne.company_id).eq('siret', ligne.siret).maybeSingle()
    if (erreurEtab || !etablissement) {
      lignesExclues.push({ siren: ligne.siren, raison: 'établissement introuvable' })
      continue
    }

    membres.push({
      siren: ligne.siren, siret: ligne.siret, raisonSociale: company.name, enseigne: company.trade_name,
      adresse: etablissement.adresse, codePostal: etablissement.code_postal, commune: etablissement.ville,
      ape: company.naf, lotCode, rang: ligne.rang, familleMetier: ligne.famille_metier,
    })
  }

  return { membres, lignesExclues }
}
