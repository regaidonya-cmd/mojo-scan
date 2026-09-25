import { calculerMatching } from './matching'
import { calculerContactabilite } from './contactabilite'
import { extraireEmailSite } from './email-extraction'
import type { EtablissementReference, CandidatGooglePlace, FicheEnrichie } from './types'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

function ref(overrides: Partial<EtablissementReference>): EtablissementReference {
  return { siren: '123456789', siret: '12345678900010', raisonSociale: 'ALLO POULET', enseigne: null, adresse: '284 RUE DE PARIS', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '56.10C', ...overrides }
}

async function main() {
  // 1. Entreprise trouvée sans ambiguïté
  {
    const candidats: CandidatGooglePlace[] = [{ placeId: 'p1', displayName: 'Allo Poulet', formattedAddress: '284 Rue de Paris, 94190 Villeneuve-Saint-Georges' }]
    const r = calculerMatching(ref({}), candidats)
    t('1. Entreprise trouvée sans ambiguïté -> MATCH_FORT', r.statut === 'MATCH_FORT')
  }

  // 2. Homonyme (même nom, adresse différente)
  {
    const candidats: CandidatGooglePlace[] = [{ placeId: 'p1', displayName: 'Allo Poulet', formattedAddress: '10 Rue de Lyon, 69001 Lyon' }]
    const r = calculerMatching(ref({}), candidats)
    t('2. Homonyme (nom identique, adresse différente) -> jamais MATCH_FORT', r.statut !== 'MATCH_FORT')
  }

  // 3. Adresse différente (mais nom proche)
  {
    const candidats: CandidatGooglePlace[] = [{ placeId: 'p1', displayName: 'Allo Poulet VSG', formattedAddress: '99 Avenue Foch, 75116 Paris' }]
    const r = calculerMatching(ref({}), candidats)
    t('3. Adresse différente -> pas MATCH_FORT (code postal non concordant)', r.statut !== 'MATCH_FORT')
  }

  // 4. Plusieurs établissements (scores proches) -> AMBIGU
  {
    const candidats: CandidatGooglePlace[] = [
      { placeId: 'p1', displayName: 'Allo Poulet Express', formattedAddress: '284 Rue de Paris, 94190 Villeneuve-Saint-Georges' },
      { placeId: 'p2', displayName: 'Allo Poulet Grill', formattedAddress: '284 Rue de Paris, 94190 Villeneuve-Saint-Georges' },
    ]
    const r = calculerMatching(ref({}), candidats)
    t('4. Plusieurs établissements scores proches -> AMBIGU (jamais tranché automatiquement)', r.statut === 'AMBIGU')
  }

  // 5. Aucun résultat Google
  {
    const r = calculerMatching(ref({}), [])
    t('5. Aucun résultat -> NON_TROUVE', r.statut === 'NON_TROUVE')
  }

  // 6. Téléphone sans site
  {
    const fiche: Pick<FicheEnrichie, 'telephone' | 'email' | 'siteWeb' | 'matchGoogle'> = {
      telephone: { valeur: '+33123456789', source: 'GOOGLE_PLACES', urlSource: null, niveauConfiance: 'CONFIRME' },
      email: null, siteWeb: null,
      matchGoogle: { statut: 'MATCH_FORT', candidatRetenu: null, score: 0.9, raisons: [] },
    }
    const r = calculerContactabilite(fiche, false)
    t('6. Téléphone confirmé sans site -> BONNE', r.contactabilite === 'BONNE')
  }

  // 7. Site sans téléphone (mais match fort)
  {
    const fiche: Pick<FicheEnrichie, 'telephone' | 'email' | 'siteWeb' | 'matchGoogle'> = {
      telephone: null, email: null,
      siteWeb: { valeur: 'https://allopoulet.fr', source: 'GOOGLE_PLACES', urlSource: null, niveauConfiance: 'CONFIRME' },
      matchGoogle: { statut: 'MATCH_FORT', candidatRetenu: null, score: 0.9, raisons: [] },
    }
    const r = calculerContactabilite(fiche, false)
    t('7. Site confirmé + match fort, sans téléphone -> BONNE', r.contactabilite === 'BONNE')
  }

  // 8. Site avec email
  {
    const html = '<html><body>Contactez-nous: contact@allopoulet.fr</body></html>'
    const fetchPage = async (url: string) => (url.includes('/contact') ? html : null)
    const email = await extraireEmailSite('allopoulet.fr', fetchPage)
    t('8. Email trouvé sur page contact -> extrait correctement', email?.valeur === 'contact@allopoulet.fr')
    t('8b. Source tracée = SITE_OFFICIEL_CONTACT', email?.source === 'SITE_OFFICIEL_CONTACT')
  }

  // 9. Site sans email
  {
    const fetchPage = async () => '<html><body>Bienvenue</body></html>'
    const email = await extraireEmailSite('exemple.fr', fetchPage)
    t('9. Aucun email présent -> null (jamais inventé)', email === null)
  }

  // 10. Email présent dans mentions légales uniquement
  {
    const fetchPage = async (url: string) => (url.includes('mentions-legales') ? '<html>SIRET 123 - admin@exemple.fr</html>' : null)
    const email = await extraireEmailSite('exemple.fr', fetchPage)
    t('10. Email trouvé uniquement en mentions légales -> extrait, confiance PROBABLE', email?.valeur === 'admin@exemple.fr' && email.niveauConfiance === 'PROBABLE')
  }

  // 11. Plusieurs emails -> préférence contact > générique > autre
  {
    const html = '<html>info@exemple.fr contact@exemple.fr webmaster@exemple.fr</html>'
    const fetchPage = async () => html
    const email = await extraireEmailSite('exemple.fr', fetchPage)
    t('11. Plusieurs emails -> "contact@" préféré (contact_commercial prioritaire)', email?.valeur === 'contact@exemple.fr')
  }

  // 12. Fiche Google ambiguë -> jamais enrichie automatiquement (contactabilité prudente)
  {
    const fiche: Pick<FicheEnrichie, 'telephone' | 'email' | 'siteWeb' | 'matchGoogle'> = {
      telephone: null, email: null, siteWeb: null,
      matchGoogle: { statut: 'AMBIGU', candidatRetenu: null, score: 0.4, raisons: ['ambigu'] },
    }
    const r = calculerContactabilite(fiche, false)
    t('12. Fiche ambiguë sans coordonnée -> INSUFFISANTE (jamais BONNE par défaut)', r.contactabilite === 'INSUFFISANTE')
  }

  // Vérification structurelle : aucun secteur/commune codé en dur
  {
    const fs = require('fs')
    const files = ['matching.ts', 'contactabilite.ts', 'email-extraction.ts', 'google-places-client.ts']
    let clean = true
    for (const f of files) {
      const src = fs.readFileSync(__dirname + '/' + f, 'utf-8')
      if (/villeneuve|diagnostiqueur|auto.?[ée]cole/i.test(src)) clean = false
    }
    t('13. Aucun fichier moteur ne contient de secteur/commune codé en dur', clean)
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
