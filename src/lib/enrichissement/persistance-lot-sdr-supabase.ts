import type { PersistanceLotSdrClient, HistoriqueEnrichissement } from './persister-lot-sdr'
import type { MembreLotSdr } from './donnees-lot-sdr-vsg-enrich-01'

export function creerPersistanceLotSdrSupabase(supabase: any): PersistanceLotSdrClient {
  return {
    async historiqueEnrichissement(lotCodeCourant: string, siren: string[]): Promise<HistoriqueEnrichissement[]> {
      const { data, error } = await supabase
        .from('enrichissement_resultats')
        .select('siren, statut, telephone, verdict_matching')
        .in('siren', siren)
        .neq('lot_code', lotCodeCourant)
      if (error) throw new Error(`lecture historique enrichissement_resultats: ${error.message}`)
      return (data ?? []).map((r: any) => ({ siren: r.siren, statut: r.statut, telephone: r.telephone, verdictMatching: r.verdict_matching }))
    },
    async sirenDejaDansCeLot(lotCode: string, siren: string[]) {
      const { data, error } = await supabase
        .from('enrichissement_resultats')
        .select('siren')
        .eq('lot_code', lotCode).in('siren', siren)
      if (error) throw new Error(`lecture enrichissement_resultats: ${error.message}`)
      return (data ?? []).map((r: any) => r.siren)
    },
    async insererMembreATraiter(lotCode: string, companyId: string, membre: MembreLotSdr, reutilisation: HistoriqueEnrichissement | null) {
      const base = {
        siren: membre.siren, company_id: companyId, lot_code: lotCode, source: 'GOOGLE_PLACES',
        rang: membre.rang, famille_metier: membre.famille, siret: membre.siret,
      }
      const ligne = reutilisation
        ? { ...base, text_search_termine: true, place_details_termine: true, statut: reutilisation.statut, verdict_matching: reutilisation.verdictMatching, telephone: reutilisation.telephone }
        : { ...base, text_search_termine: false, place_details_termine: false, statut: 'A_TRAITER' }
      const { error } = await supabase.from('enrichissement_resultats').insert(ligne)
      if (error) throw new Error(`insert enrichissement_resultats: ${error.message}`)
    },
  }
}
