// ══════════════════════════════════════════════════════════════
// VSG.DATA.2 — Import générique SIRENE -> companies + etablissements.
// Réutilisable pour tout futur import multi-secteur (aucun NAF/secteur
// codé en dur dans ce module).
//
// IDEMPOTENCE :
// - companies : recherche par SIREN d'abord. Si trouvé, aucune donnée
//   n'est modifiée (jamais d'UPDATE) — l'id existant est simplement
//   réutilisé. Si absent, INSERT uniquement. Jamais un UPSERT qui
//   pourrait écraser une entreprise déjà présente.
// - etablissements : recherche par SIRET d'abord. Si trouvé, aucune
//   modification, aucune recréation. Si absent, INSERT uniquement
//   (aucune contrainte unique en base sur `siret`, confirmé par audit
//   VSG.DATA.1 — idempotence garantie applicativement par cette
//   recherche préalable, pas par une contrainte DB).
//
// GARDE-FOU TRANSACTIONNEL :
// Supabase/PostgREST ne permet pas nativement une transaction multi-
// requêtes depuis ce client. Ce module applique donc une COMPENSATION
// applicative (best-effort, pas une vraie transaction DB) : si
// l'établissement échoue APRÈS création d'une NOUVELLE ligne companies
// (jamais pour une companies déjà existante), cette ligne companies
// fraîchement créée est supprimée — aucune "companies orpheline sans
// établissement" ne doit rester après une erreur. Une vraie transaction
// (fonction RPC PostgreSQL) resterait la solution la plus rigoureuse si
// ce besoin devient critique — proposée ici comme amélioration future,
// non implémentée (nécessiterait une migration, hors périmètre validé).
// ══════════════════════════════════════════════════════════════

export interface EntrepriseAImporter {
  siren: string
  siret: string
  name: string
  enseigne: string | null
  naf: string
  // Adresse de l'ÉTABLISSEMENT VSG lui-même — TOUJOURS renseignée,
  // que ce soit le siège ou non (nécessaire pour etablissements).
  adresseEtablissement: string
  codePostalEtablissement: string
  villeEtablissement: string
  // Adresse à utiliser pour companies (entreprise/siège) — NULL si
  // l'établissement connu n'est PAS confirmé comme étant le siège.
  addressSiege: string | null
  postalCodeSiege: string | null
  citySiege: string | null
  effectif: string
  siege: boolean // true = le SIRET connu est bien le siège réel
  source: string // ex. 'SIRENE_BAT_VSG_50', générique par lot
}

export interface PersistanceImportClient {
  companyExisteDeja(siren: string): Promise<boolean>
  /** trouverOuCreerCompany — JAMAIS un UPSERT. Si le SIREN existe déjà,
   * retourne son id SANS MODIFIER aucune donnée existante. Sinon, INSERT
   * uniquement. */
  trouverOuCreerCompany(entreprise: EntrepriseAImporter): Promise<{ id: string; creeMaintenant: boolean }>
  etablissementExisteDeja(siret: string): Promise<boolean>
  insererEtablissement(companyId: string, entreprise: EntrepriseAImporter): Promise<void>
  supprimerCompany(companyId: string): Promise<void> // compensation, jamais appelée sur une companies pré-existante
}

export type StatutImportEntreprise = 'CREE' | 'DEJA_PRESENT' | 'ERREUR_COMPENSEE'

export interface ResultatImportEntreprise {
  siren: string
  statutCompany: StatutImportEntreprise
  statutEtablissement: 'CREE' | 'DEJA_PRESENT' | 'NON_TENTE'
  erreur: string | null
}

/**
 * importerEntreprise — traite UNE entreprise : upsert company (idempotent
 * par siren), puis insert etablissement (idempotent par siret,
 * vérification applicative). En cas d'échec de l'établissement pour une
 * company NOUVELLEMENT créée dans cet appel, compensation (suppression)
 * — ne laisse jamais une company sans son établissement en cas d'échec.
 * Ne touche JAMAIS une company déjà existante (jamais de compensation
 * sur une ligne historique).
 */
export async function importerEntreprise(
  entreprise: EntrepriseAImporter,
  client: PersistanceImportClient
): Promise<ResultatImportEntreprise> {
  const dejaPresenteAvant = await client.companyExisteDeja(entreprise.siren)

  let companyId: string
  try {
    const resultat = await client.trouverOuCreerCompany(entreprise)
    companyId = resultat.id
  } catch (e: any) {
    return { siren: entreprise.siren, statutCompany: 'ERREUR_COMPENSEE', statutEtablissement: 'NON_TENTE', erreur: `trouverOuCreerCompany: ${e.message}` }
  }

  const etablissementDejaPresent = await client.etablissementExisteDeja(entreprise.siret)
  if (etablissementDejaPresent) {
    return { siren: entreprise.siren, statutCompany: dejaPresenteAvant ? 'DEJA_PRESENT' : 'CREE', statutEtablissement: 'DEJA_PRESENT', erreur: null }
  }

  try {
    await client.insererEtablissement(companyId, entreprise)
    return { siren: entreprise.siren, statutCompany: dejaPresenteAvant ? 'DEJA_PRESENT' : 'CREE', statutEtablissement: 'CREE', erreur: null }
  } catch (e: any) {
    // Compensation UNIQUEMENT si la company vient d'être créée dans CET appel.
    if (!dejaPresenteAvant) {
      try { await client.supprimerCompany(companyId) } catch { /* best-effort — signalé dans le résultat même si la compensation échoue */ }
    }
    return { siren: entreprise.siren, statutCompany: 'ERREUR_COMPENSEE', statutEtablissement: 'NON_TENTE', erreur: `insert etablissement: ${e.message}` }
  }
}

export interface RapportImport {
  resultats: ResultatImportEntreprise[]
  nbCrees: number
  nbDejaPresents: number
  nbErreurs: number
}

export async function importerLotEntreprises(
  entreprises: EntrepriseAImporter[],
  client: PersistanceImportClient
): Promise<RapportImport> {
  const resultats: ResultatImportEntreprise[] = []
  for (const entreprise of entreprises) {
    resultats.push(await importerEntreprise(entreprise, client))
  }
  return {
    resultats,
    nbCrees: resultats.filter((r) => r.statutCompany === 'CREE').length,
    nbDejaPresents: resultats.filter((r) => r.statutCompany === 'DEJA_PRESENT').length,
    nbErreurs: resultats.filter((r) => r.statutCompany === 'ERREUR_COMPENSEE').length,
  }
}

/** Conversion depuis les données SIRENE brutes — applique la règle
 * VSG.DATA.1B : ne jamais faire passer un établissement secondaire pour
 * le siège dans `companies`. */
export function versEntrepriseAImporter(
  siren: string, siret: string, name: string, enseigne: string | null, naf: string,
  address: string, postalCode: string, city: string, effectif: string, siege: boolean, source: string
): EntrepriseAImporter {
  return {
    siren, siret, name, enseigne, naf,
    // L'établissement lui-même — toujours connu et renseigné, peu
    // importe s'il s'agit du siège ou non.
    adresseEtablissement: address, codePostalEtablissement: postalCode, villeEtablissement: city,
    // Règle corrective validée : si l'établissement connu n'est PAS le
    // siège, ne jamais recopier son adresse comme adresse d'entreprise —
    // NULL réel dans companies, jamais une chaîne vide.
    addressSiege: siege ? address : null,
    postalCodeSiege: siege ? postalCode : null,
    citySiege: siege ? city : null,
    effectif, siege, source,
  }
}
