import type { EntrepriseAImporter, PersistanceImportClient } from './import-companies-vsg50'

export function creerPersistanceImportSupabase(supabase: any): PersistanceImportClient {
  return {
    async companyExisteDeja(siren) {
      const { data, error } = await supabase.from('companies').select('id').eq('siren', siren).limit(1)
      if (error) throw new Error(`lecture companies: ${error.message}`)
      return (data?.length ?? 0) > 0
    },
    async trouverOuCreerCompany(entreprise: EntrepriseAImporter) {
      // Recherche d'abord — si trouvé, retourne l'id SANS RIEN MODIFIER.
      const { data: existant, error: erreurLecture } = await supabase.from('companies').select('id').eq('siren', entreprise.siren).limit(1)
      if (erreurLecture) throw new Error(`lecture companies: ${erreurLecture.message}`)
      if (existant && existant.length > 0) {
        return { id: existant[0].id, creeMaintenant: false }
      }
      // Absent -> INSERT uniquement, jamais un UPSERT.
      const { data, error } = await supabase.from('companies').insert({
        siren: entreprise.siren,
        siret: entreprise.siege ? entreprise.siret : null, // jamais le SIRET d'un établissement secondaire comme SIRET principal
        name: entreprise.name,
        trade_name: entreprise.enseigne,
        naf: entreprise.naf,
        address: entreprise.addressSiege, // NULL si établissement non-siège — jamais l'adresse secondaire recopiée
        postal_code: entreprise.postalCodeSiege,
        city: entreprise.citySiege,
        employee_band: entreprise.effectif,
        source: entreprise.source,
      }).select('id').single()
      if (error) throw new Error(`insert companies: ${error.message}`)
      return { id: data.id, creeMaintenant: true }
    },
    async etablissementExisteDeja(siret) {
      const { data, error } = await supabase.from('etablissements').select('id').eq('siret', siret).limit(1)
      if (error) throw new Error(`lecture etablissements: ${error.message}`)
      return (data?.length ?? 0) > 0
    },
    async insererEtablissement(companyId, entreprise: EntrepriseAImporter) {
      const { error } = await supabase.from('etablissements').insert({
        company_id: companyId,
        siret: entreprise.siret,
        adresse: entreprise.adresseEtablissement, // toujours l'adresse réelle de l'établissement VSG, siège ou non
        code_postal: entreprise.codePostalEtablissement,
        ville: entreprise.villeEtablissement,
        siege: entreprise.siege,
        activite_principale: entreprise.naf,
      })
      if (error) throw new Error(`insert etablissements: ${error.message}`)
    },
    async supprimerCompany(companyId) {
      const { error } = await supabase.from('companies').delete().eq('id', companyId)
      if (error) throw new Error(`compensation delete companies: ${error.message}`)
    },
  }
}
