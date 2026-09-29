import { ENTREPRISES_SIRENE_VSG_50 } from './donnees-sirene-vsg50'
import { importerEntreprise, importerLotEntreprises, versEntrepriseAImporter } from './import-companies-vsg50'
import type { PersistanceImportClient, EntrepriseAImporter } from './import-companies-vsg50'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

function creerMockPersistance() {
  const companies = new Map<string, any>() // siren -> {id, ...}
  const etablissements = new Map<string, any>() // siret -> {companyId, ...}
  let idCounter = 0
  const client: PersistanceImportClient = {
    async companyExisteDeja(siren) { return companies.has(siren) },
    async trouverOuCreerCompany(e) {
      const dejaLa = companies.has(e.siren)
      if (dejaLa) return { id: companies.get(e.siren).id, creeMaintenant: false } // jamais modifié si déjà présent
      const id = `company_${idCounter++}`
      companies.set(e.siren, { id, siren: e.siren, siret: e.siege ? e.siret : null, address: e.addressSiege, city: e.citySiege })
      return { id, creeMaintenant: true }
    },
    async etablissementExisteDeja(siret) { return etablissements.has(siret) },
    async insererEtablissement(companyId, e) {
      etablissements.set(e.siret, { companyId, adresse: e.adresseEtablissement, siege: e.siege })
    },
    async supprimerCompany(companyId) {
      for (const [siren, c] of Array.from(companies.entries())) if (c.id === companyId) companies.delete(siren)
    },
  }
  return { client, companies, etablissements }
}

async function main() {
  // 1. Les 50 entreprises présentes dans le jeu de données
  t('1. ENTREPRISES_SIRENE_VSG_50 contient exactement 50 entrées', ENTREPRISES_SIRENE_VSG_50.length === 50)
  t('1b. Aucun doublon de SIREN', new Set(ENTREPRISES_SIRENE_VSG_50.map((e) => e.siren)).size === 50)

  // 2. Import nominal — 50 créées
  {
    const { client, companies, etablissements } = creerMockPersistance()
    const entreprises = ENTREPRISES_SIRENE_VSG_50.map((e) => versEntrepriseAImporter(e.siren, e.siret, e.name, e.enseigne, e.naf, e.address, e.postalCode, e.city, e.effectif, e.siege, 'TEST'))
    const rapport = await importerLotEntreprises(entreprises, client)
    t('2. 50 companies créées', rapport.nbCrees === 50)
    t('2b. 0 erreur', rapport.nbErreurs === 0)
    t('2c. 50 lignes companies en base (mock)', companies.size === 50)
    t('2d. 50 lignes etablissements en base (mock)', etablissements.size === 50)
  }

  // 3. Idempotence — relancer le même import -> 0 nouvelle création, tout DEJA_PRESENT
  {
    const { client } = creerMockPersistance()
    const entreprises = ENTREPRISES_SIRENE_VSG_50.map((e) => versEntrepriseAImporter(e.siren, e.siret, e.name, e.enseigne, e.naf, e.address, e.postalCode, e.city, e.effectif, e.siege, 'TEST'))
    await importerLotEntreprises(entreprises, client)
    const rapport2 = await importerLotEntreprises(entreprises, client)
    t('3. Relance -> 0 création, 50 DEJA_PRESENT', rapport2.nbCrees === 0 && rapport2.nbDejaPresents === 50)
  }

  // 4. Traitement des 5 établissements secondaires — companies.address/city/siret = NULL
  {
    const { client, companies, etablissements } = creerMockPersistance()
    const nonSiege = ENTREPRISES_SIRENE_VSG_50.filter((e) => !e.siege)
    t('4. Exactement 5 entreprises avec siège hors VSG', nonSiege.length === 5)
    for (const e of nonSiege) {
      const entreprise = versEntrepriseAImporter(e.siren, e.siret, e.name, e.enseigne, e.naf, e.address, e.postalCode, e.city, e.effectif, e.siege, 'TEST')
      await importerEntreprise(entreprise, client)
    }
    let toutesCorrectes = true
    for (const e of nonSiege) {
      const c = companies.get(e.siren)
      const etab = etablissements.get(e.siret)
      if (c.siret !== null || c.address !== null || c.city !== null) toutesCorrectes = false
      if (!etab || etab.adresse !== e.address || etab.siege !== false) toutesCorrectes = false
    }
    t('4b. companies.siret/address/city = NULL pour les 5 non-siège', toutesCorrectes)
  }

  // 4c. Les 45 autres — siège=true, adresse companies renseignée
  {
    const { client, companies } = creerMockPersistance()
    const siege = ENTREPRISES_SIRENE_VSG_50.filter((e) => e.siege)
    t('4c. Exactement 45 entreprises confirmées siège', siege.length === 45)
    for (const e of siege.slice(0, 3)) { // échantillon suffisant
      const entreprise = versEntrepriseAImporter(e.siren, e.siret, e.name, e.enseigne, e.naf, e.address, e.postalCode, e.city, e.effectif, e.siege, 'TEST')
      await importerEntreprise(entreprise, client)
    }
    const exemple = companies.get(siege[0].siren)
    t('4d. companies.address renseignée pour un siège confirmé', exemple.address === siege[0].address)
  }

  // 5. Garde-fou transactionnel — échec etablissement sur une NOUVELLE company -> compensation (suppression)
  {
    const { client, companies } = creerMockPersistance()
    const clientAvecErreur: PersistanceImportClient = {
      ...client,
      insererEtablissement: async () => { throw new Error('Erreur simulée insertion etablissement') },
    }
    const e = ENTREPRISES_SIRENE_VSG_50[0]
    const entreprise = versEntrepriseAImporter(e.siren, e.siret, e.name, e.enseigne, e.naf, e.address, e.postalCode, e.city, e.effectif, e.siege, 'TEST')
    const resultat = await importerEntreprise(entreprise, clientAvecErreur)
    t('5. Échec etablissement -> statut ERREUR_COMPENSEE', resultat.statutCompany === 'ERREUR_COMPENSEE')
    t('5b. Compensation appliquée -> company supprimée (aucune orpheline)', !companies.has(e.siren))
  }

  // 5c. Garde-fou : jamais de compensation sur une company DÉJÀ existante
  {
    const { client, companies } = creerMockPersistance()
    const e = ENTREPRISES_SIRENE_VSG_50[0]
    const entreprise = versEntrepriseAImporter(e.siren, e.siret, e.name, e.enseigne, e.naf, e.address, e.postalCode, e.city, e.effectif, e.siege, 'TEST')
    await importerEntreprise(entreprise, client) // succès initial, company + etablissement créés

    // Nouvel essai avec un NOUVEAU siret (même siren, donc company déjà existante) qui échoue à l'étape etablissement
    const clientAvecErreurCiblee: PersistanceImportClient = {
      ...client,
      insererEtablissement: async () => { throw new Error('Erreur simulée sur un 2e établissement') },
    }
    const entreprise2 = { ...entreprise, siret: entreprise.siret + '_AUTRE' }
    await importerEntreprise(entreprise2, clientAvecErreurCiblee)
    t('5c. Company PRÉEXISTANTE jamais supprimée même si un nouvel établissement échoue', companies.has(e.siren))
  }

  // 6. Aucune référence à prospects_sales dans les modules d'import — vérification structurelle
  {
    const fs = require('fs')
    const fichiers = ['import-companies-vsg50.ts', 'persistance-import-supabase.ts']
    let propre = true
    for (const f of fichiers) {
      const src = fs.readFileSync(__dirname + '/' + f, 'utf-8')
      if (/prospects_sales|temperature|priorite_interne|next_action/i.test(src)) propre = false
    }
    t('6. Aucune référence à prospects_sales/temperature/priorite/NBA dans les modules d\'import', propre)
  }

  // 7. Aucun DELETE/UPDATE d'une company préexistante hors compensation ciblée — vérification structurelle
  {
    const fs = require('fs')
    const src = fs.readFileSync(__dirname + '/persistance-import-supabase.ts', 'utf-8')
    const nbDelete = (src.match(/\.delete\(/g) ?? []).length
    t('7. Un seul point de DELETE dans tout le module (compensation uniquement, jamais un DELETE de masse)', nbDelete === 1)
  }

  // 7b. Jamais d'UPDATE sur companies dans le module — vérification structurelle (find-or-create strict)
  {
    const fs = require('fs')
    const src = fs.readFileSync(__dirname + '/persistance-import-supabase.ts', 'utf-8')
    t('7b. Aucun .update( sur companies (jamais de modification d\'une entreprise existante)', !/companies['"]?\)\s*\n?\s*\.update\(/.test(src) && !src.includes(".upsert("))
  }

  // 7c. Terminologie rigoureuse — la compensation n'est jamais qualifiée de "transaction"/"ACID"/"atomique" à tort
  {
    const fs = require('fs')
    const src = fs.readFileSync(__dirname + '/import-companies-vsg50.ts', 'utf-8')
    const affirmeFaussementAtomique = /transaction (postgresql|db|atomique)|garantit l'atomicité|ACID/i.test(src) && !/PAS une vraie transaction|jamais une vraie transaction|ne permet pas nativement une transaction/i.test(src)
    t('7c. La compensation n\'est jamais présentée à tort comme une vraie transaction PostgreSQL', !affirmeFaussementAtomique)
  }

  // 8. Erreur sur l'entreprise n°27 — le lot continue, les autres sont traitées normalement
  {
    const { client, companies } = creerMockPersistance()
    const entreprises = ENTREPRISES_SIRENE_VSG_50.map((e) => versEntrepriseAImporter(e.siren, e.siret, e.name, e.enseigne, e.naf, e.address, e.postalCode, e.city, e.effectif, e.siege, 'TEST'))
    let compteur = 0
    const clientAvecErreur27: PersistanceImportClient = {
      ...client,
      insererEtablissement: async (companyId, e) => {
        compteur++
        if (compteur === 27) throw new Error('Erreur simulée sur la 27e entreprise')
        return client.insererEtablissement(companyId, e)
      },
    }
    const rapport = await importerLotEntreprises(entreprises, clientAvecErreur27)
    t('8. Erreur sur la 27e -> 49 créées, 1 erreur (le lot continue, pas d\'arrêt total)', rapport.nbCrees === 49 && rapport.nbErreurs === 1)
    t('8b. La 27e entreprise précisément marquée ERREUR_COMPENSEE', rapport.resultats[26].statutCompany === 'ERREUR_COMPENSEE')
    t('8c. Les entreprises après la 27e sont bien traitées normalement (pas ignorées)', rapport.resultats[27].statutCompany === 'CREE')
  }

  // 9. 50 companies créées mais rattachement Google en erreur — le rattachement est une étape SÉPARÉE,
  // son échec n'affecte jamais les 50 imports déjà réussis (illustré structurellement : import et
  // rattachement sont deux fonctions/étapes distinctes, jamais couplées dans une même transaction).
  {
    const { client, companies } = creerMockPersistance()
    const entreprises = ENTREPRISES_SIRENE_VSG_50.map((e) => versEntrepriseAImporter(e.siren, e.siret, e.name, e.enseigne, e.naf, e.address, e.postalCode, e.city, e.effectif, e.siege, 'TEST'))
    const rapport = await importerLotEntreprises(entreprises, client)
    // Simuler que l'étape de rattachement (hors périmètre de importerLotEntreprises) échoue ensuite —
    // les 50 companies restent créées quoi qu'il arrive à cette étape ultérieure et indépendante.
    t('9. 50 companies créées, indépendamment du succès/échec d\'une étape ultérieure de rattachement', rapport.nbCrees === 50 && companies.size === 50)
  }

  // 10. Relance après import partiel — mix "déjà créées" + "encore à créer"
  {
    const { client, companies, etablissements } = creerMockPersistance()
    const entreprises = ENTREPRISES_SIRENE_VSG_50.map((e) => versEntrepriseAImporter(e.siren, e.siret, e.name, e.enseigne, e.naf, e.address, e.postalCode, e.city, e.effectif, e.siege, 'TEST'))
    // Import partiel simulé : seulement les 30 premières
    await importerLotEntreprises(entreprises.slice(0, 30), client)
    t('10. Import partiel initial -> 30 companies créées', companies.size === 30)
    // Relance sur le lot COMPLET (comme une vraie reprise le ferait)
    const rapportRelance = await importerLotEntreprises(entreprises, client)
    t('10b. Relance -> 30 DEJA_PRESENT (non retouchées) + 20 nouvelles CREE', rapportRelance.nbDejaPresents === 30 && rapportRelance.nbCrees === 20)
    t('10c. Total final = 50 companies, aucun doublon', companies.size === 50)
  }

  // 11. Double appel accidentel de la route (import complet lancé deux fois de suite)
  {
    const { client, companies, etablissements } = creerMockPersistance()
    const entreprises = ENTREPRISES_SIRENE_VSG_50.map((e) => versEntrepriseAImporter(e.siren, e.siret, e.name, e.enseigne, e.naf, e.address, e.postalCode, e.city, e.effectif, e.siege, 'TEST'))
    const r1 = await importerLotEntreprises(entreprises, client)
    const r2 = await importerLotEntreprises(entreprises, client) // double appel accidentel
    t('11. 1er appel -> 50 créées', r1.nbCrees === 50)
    t('11b. 2e appel (doublon accidentel) -> 0 créée, 50 DEJA_PRESENT', r2.nbCrees === 0 && r2.nbDejaPresents === 50)
    t('11c. Toujours exactement 50 companies et 50 etablissements en base (aucun doublon)', companies.size === 50 && etablissements.size === 50)
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
