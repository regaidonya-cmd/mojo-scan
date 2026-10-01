import { extraireEmailsEntreprise } from './extraction-email-sdr'
import { executerExtractionEmailSdr } from './orchestrateur-email-sdr'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

function fetchMockPages(pages: Record<string, string>) {
  return async (url: string) => {
    const html = pages[url]
    if (html === undefined) throw new Error(`404: ${url}`)
    return { status: 200, html, urlFinale: url }
  }
}

async function main() {
  // 1. gmail.com publié -> conservé comme WEBMAIL_PUBLIC
  {
    const fetch = fetchMockPages({ 'https://artisan-x.fr/': '<html>Contactez-nous: artisan.x@gmail.com</html>' })
    const resultat = await extraireEmailsEntreprise('c1', 's1', 'https://artisan-x.fr/', fetch)
    const email = resultat.emailsTrouves.find((e) => e.email === 'artisan.x@gmail.com')
    t('1. gmail.com publié -> WEBMAIL_PUBLIC, retenu', email?.relationDomaine === 'WEBMAIL_PUBLIC')
    t('1b. Compté dans nbRetenus (pas nbAVerifier)', resultat.nbRetenus === 1 && resultat.nbAVerifier === 0)
  }

  // 2. outlook.fr -> conservé
  {
    const fetch = fetchMockPages({ 'https://artisan-y.fr/': '<html><a href="mailto:pro@outlook.fr">Ecrire</a></html>' })
    const resultat = await extraireEmailsEntreprise('c2', 's2', 'https://artisan-y.fr/', fetch)
    const email = resultat.emailsTrouves.find((e) => e.email === 'pro@outlook.fr')
    t('2. outlook.fr (mailto) -> WEBMAIL_PUBLIC, retenu', email?.relationDomaine === 'WEBMAIL_PUBLIC')
    t('2b. extractionMethod = MAILTO', email?.extractionMethod === 'MAILTO')
  }

  // 3. domaine tiers explicitement présent -> A_VERIFIER, pas supprimé
  {
    const fetch = fetchMockPages({ 'https://artisan-z.fr/': '<html>Notre partenaire: support@plateforme-externe.com</html>' })
    const resultat = await extraireEmailsEntreprise('c3', 's3', 'https://artisan-z.fr/', fetch)
    const email = resultat.emailsTrouves.find((e) => e.email === 'support@plateforme-externe.com')
    t('3. Domaine tiers -> présent, PAS supprimé', email !== undefined)
    t('3b. Classé A_VERIFIER (DOMAINE_TIERS)', email?.relationDomaine === 'DOMAINE_TIERS' && email?.niveauConfiance === 'A_VERIFIER')
    t('3c. Compté dans nbAVerifier, pas nbRetenus', resultat.nbAVerifier === 1 && resultat.nbRetenus === 0)
  }

  // 4. domaine technique -> exclu
  {
    const fetch = fetchMockPages({ 'https://artisan-w.fr/': '<html>Erreur rapportée à noreply@sentry.io, site par wix via support@wixpress.com</html>' })
    const resultat = await extraireEmailsEntreprise('c4', 's4', 'https://artisan-w.fr/', fetch)
    t('4. Domaines techniques (sentry.io, wixpress.com) -> totalement exclus', resultat.emailsTrouves.length === 0)
  }

  // 5. Email du domaine du site lui-même -> DOMAINE_SITE
  {
    const fetch = fetchMockPages({ 'https://artisan-v.fr/': '<html>contact@artisan-v.fr</html>' })
    const resultat = await extraireEmailsEntreprise('c5', 's5', 'https://artisan-v.fr/', fetch)
    const email = resultat.emailsTrouves.find((e) => e.email === 'contact@artisan-v.fr')
    t('5. Email du domaine du site -> DOMAINE_SITE, CONFIRME', email?.relationDomaine === 'DOMAINE_SITE' && email?.niveauConfiance === 'CONFIRME')
  }

  // 6. URL Contact relative -> correctement résolue
  {
    const fetch = fetchMockPages({
      'https://artisan-u.fr/': '<html><a href="/contact">Contact</a></html>',
      'https://artisan-u.fr/contact': '<html>pro@artisan-u.fr</html>',
    })
    const resultat = await extraireEmailsEntreprise('c6', 's6', 'https://artisan-u.fr/', fetch)
    t('6. URL Contact relative résolue et visitée', resultat.pagesVisitees.includes('https://artisan-u.fr/contact'))
    t('6b. Email trouvé sur la page contact résolue', resultat.emailsTrouves.some((e) => e.email === 'pro@artisan-u.fr'))
  }

  // 6c. Lien externe (autre domaine) jamais suivi comme page interne
  {
    const fetch = fetchMockPages({
      'https://artisan-t.fr/': '<html><a href="https://autre-site.fr/contact">Contact</a></html>',
    })
    const resultat = await extraireEmailsEntreprise('c7', 's7', 'https://artisan-t.fr/', fetch)
    t('6c. Lien de contact vers un AUTRE domaine jamais suivi', resultat.pagesVisitees.length === 1)
  }

  // 7. Doublon du même email sur accueil + contact -> 1 seul email final
  {
    const fetch = fetchMockPages({
      'https://artisan-s.fr/': '<html><a href="/contact">Contact</a>contact@artisan-s.fr</html>',
      'https://artisan-s.fr/contact': '<html>Nous ecrire: contact@artisan-s.fr</html>',
    })
    const resultat = await extraireEmailsEntreprise('c8', 's8', 'https://artisan-s.fr/', fetch)
    const occurrences = resultat.emailsTrouves.filter((e) => e.email === 'contact@artisan-s.fr')
    t('7. Doublon accueil+contact -> 1 seul email final', occurrences.length === 1)
    t('7b. URL source = première occurrence (accueil)', occurrences[0]?.sourceUrl === 'https://artisan-s.fr/')
  }

  // 8. Aucun email détecté -> raison explicite, jamais inventé
  {
    const fetch = fetchMockPages({ 'https://artisan-r.fr/': '<html>Bienvenue, aucune coordonnee ici</html>' })
    const resultat = await extraireEmailsEntreprise('c9', 's9', 'https://artisan-r.fr/', fetch)
    t('8. Aucun email -> raisonAucunEmail renseignée, 0 candidat', resultat.emailsTrouves.length === 0 && resultat.raisonAucunEmail !== null)
  }

  // 9. Orchestrateur — rapport global cohérent, aucune écriture (vérification structurelle)
  {
    const fetch = fetchMockPages({
      'https://a.fr/': '<html>contact@a.fr</html>',
      'https://b.fr/': '<html>aucune coordonnee</html>',
    })
    const rapport = await executerExtractionEmailSdr([
      { companyId: 'c1', siren: '1', siteWeb: 'https://a.fr/' },
      { companyId: 'c2', siren: '2', siteWeb: 'https://b.fr/' },
    ], fetch)
    t('9. Rapport global : nbSites=2, nbAvecEmail=1, nbSansEmail=1', rapport.nbSites === 2 && rapport.nbAvecAuMoinsUnEmailRetenu === 1 && rapport.nbSansEmail === 1)
  }

  // 10. Aucune écriture DB — vérification structurelle (aucun import Supabase dans les modules d'extraction)
  {
    const fs = require('fs')
    let propre = true
    for (const f of ['extraction-email-sdr.ts', 'orchestrateur-email-sdr.ts']) {
      const src = fs.readFileSync(__dirname + '/' + f, 'utf-8')
      if (/@supabase\/supabase-js/.test(src)) propre = false
      if (/\.insert\(|\.update\(|\.upsert\(/.test(src)) propre = false
    }
    t('10. Aucun import Supabase / aucune écriture dans les modules d\'extraction', propre)
  }

  // 11. Jamais de fabrication d'email — vérification structurelle
  {
    const fs = require('fs')
    const src = fs.readFileSync(__dirname + '/extraction-email-sdr.ts', 'utf-8')
    t('11. Aucun pattern de génération prenom.nom@domaine dans le code', !/prenom.*nom@|firstname.*lastname@/i.test(src))
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
