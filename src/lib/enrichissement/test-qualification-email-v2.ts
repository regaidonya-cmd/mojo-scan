import { qualifierEntreprise, qualifierLotEntreprises } from './qualification-email-v2'
import type { EntreeQualification } from './qualification-email-v2'
import type { EmailTrouve } from './extraction-email-sdr'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

function email(partial: Partial<EmailTrouve> & { email: string; emailDomain: string }): EmailTrouve {
  return {
    relationDomaine: 'DOMAINE_TIERS', classificationEmail: 'autre', niveauConfiance: 'PROBABLE',
    sourceUrl: 'https://x.fr/', sourcePageType: 'ACCUEIL', extractionMethod: 'HTML', ...partial,
  }
}

const COMMUNE = 'Villeneuve-Saint-Georges'
const ALIASES = ['vsg']

function entree(overrides: Partial<EntreeQualification>): EntreeQualification {
  return { companyId: 'c1', siren: '1', siteWeb: 'https://x.fr/', telephone: null, telephoneFiable: false, emailsTrouves: [], communeCible: COMMUNE, aliasesCommune: ALIASES, ...overrides }
}

async function main() {
  // 1. CF Bâtiment / Gmail
  {
    const r = qualifierEntreprise(entree({ siteWeb: 'http://www.cf-batiment.com/', emailsTrouves: [email({ email: 'carlos@gmail.com', emailDomain: 'gmail.com', sourcePageType: 'ACCUEIL' })] }), false)
    t('1. CF Bâtiment / Gmail -> WEBMAIL_PUBLIC, emailPrincipal', r.emailPrincipal?.relationDomaine === 'WEBMAIL_PUBLIC')
  }

  // 2. VSG Pneus / domaine affilié (présent en mentions légales du site propre)
  {
    const r = qualifierEntreprise(entree({ siteWeb: 'https://vsgpneu.com/', emailsTrouves: [email({ email: 'contact@vsg-pneus.fr', emailDomain: 'vsg-pneus.fr', sourcePageType: 'MENTIONS_LEGALES' })] }), false)
    t('2. VSG Pneus -> retenu (DOMAINE_AFFILIE ou SITE_RESEAU_FRANCHISE, coïncidence réelle alias "vsg"/nom commercial)', r.emailPrincipal?.relationDomaine === 'DOMAINE_AFFILIE' || r.emailPrincipal?.relationDomaine === 'SITE_RESEAU_FRANCHISE')
  }

  // 2b. CORRECTION 1 : similarité SEULE sans présence sur page propre -> PAS DOMAINE_AFFILIE
  {
    const r = qualifierEntreprise(entree({
      siteWeb: 'https://vsgpneu.com/',
      emailsTrouves: [email({ email: 'contact@vsg-pneus.fr', emailDomain: 'vsg-pneus.fr', sourcePageType: 'AUTRE' })], // page AUTRE = pas ACCUEIL/CONTACT/MENTIONS_LEGALES
    }), false)
    t('2b. Similarité lexicale SEULE (page AUTRE) -> PAS DOMAINE_AFFILIE', r.emailPrincipal?.relationDomaine !== 'DOMAINE_AFFILIE')
  }

  // 3. Foncia Villeneuve / réseau local (identifiant géographique)
  {
    const emails = [
      email({ email: 'ft-efimo-villeneuve@foncia.fr', emailDomain: 'foncia.fr', sourcePageType: 'AUTRE' }),
      email({ email: 'ft-efimo-athismons@foncia.com', emailDomain: 'foncia.com', sourcePageType: 'AUTRE' }),
      email({ email: 'dpo@foncia.com', emailDomain: 'foncia.com', sourcePageType: 'AUTRE' }),
    ]
    const r = qualifierEntreprise(entree({ siteWeb: 'https://fr.foncia.com/agence-villeneuve', emailsTrouves: emails }), false)
    t('3. Foncia Villeneuve -> SITE_RESEAU_FRANCHISE retenu comme principal', r.emailPrincipal?.email === 'ft-efimo-villeneuve@foncia.fr' && r.emailPrincipal?.relationDomaine === 'SITE_RESEAU_FRANCHISE')
    t('3b. Autre agence (athismons) exclue', r.emailsExclus.some((e) => e.email.includes('athismons')))
    t('3c. dpo@foncia.com exclu (technique)', r.emailsExclus.some((e) => e.email === 'dpo@foncia.com' && e.relationDomaine === 'EXCLU_TECHNIQUE'))
  }

  // 4. Doctolib / faux positifs — 0 email retenu
  {
    const emails = [
      email({ email: 'hash123@exceptions.doctolib.fr', emailDomain: 'exceptions.doctolib.fr', sourcePageType: 'AUTRE' }),
      email({ email: 'jean.dupont@email.fr', emailDomain: 'email.fr', sourcePageType: 'AUTRE' }),
      email({ email: 'martindupont@gmail.com', emailDomain: 'gmail.com', sourcePageType: 'AUTRE' }),
      email({ email: 'contact.dataprivacy@doctolib.fr', emailDomain: 'doctolib.fr', sourcePageType: 'AUTRE' }),
      email({ email: 'xxx@xxx.mssante.fr', emailDomain: 'xxx.mssante.fr', sourcePageType: 'AUTRE' }),
    ]
    const r = qualifierEntreprise(entree({ siteWeb: 'https://www.doctolib.fr/praticien/x', emailsTrouves: emails }), false)
    t('4. Doctolib -> 0 email retenu (principal + secondaires)', r.emailPrincipal === null && r.emailsSecondaires.length === 0)
  }

  // 5. notaires.fr / webmaster national -> EXCLU_TECHNIQUE
  {
    const r = qualifierEntreprise(entree({ siteWeb: 'https://www.notaires.fr/fr', emailsTrouves: [email({ email: 'webmestre.csn@notaires.fr', emailDomain: 'notaires.fr', sourcePageType: 'MENTIONS_LEGALES' })] }), false)
    t('5. notaires.fr webmestre -> EXCLU_TECHNIQUE', r.emailsExclus.some((e) => e.relationDomaine === 'EXCLU_TECHNIQUE'))
    t('5b. 0 email retenu', r.emailPrincipal === null)
  }

  // 6. DNA / contact.vsg -> SITE_RESEAU_FRANCHISE via alias "vsg"
  {
    const emails = [
      email({ email: 'contact.vsg@dnavsg.notaires.fr', emailDomain: 'dnavsg.notaires.fr', sourcePageType: 'ACCUEIL' }),
      email({ email: 'dpo.not@adnov.fr', emailDomain: 'adnov.fr', sourcePageType: 'MENTIONS_LEGALES' }),
      email({ email: 'mediateurdunotariat@notaires.fr', emailDomain: 'notaires.fr', sourcePageType: 'MENTIONS_LEGALES' }),
    ]
    const r = qualifierEntreprise(entree({ siteWeb: 'https://dna.notaires.fr/', emailsTrouves: emails }), false)
    t('6. DNA contact.vsg -> SITE_RESEAU_FRANCHISE principal (alias "vsg")', r.emailPrincipal?.email === 'contact.vsg@dnavsg.notaires.fr' && r.emailPrincipal?.relationDomaine === 'SITE_RESEAU_FRANCHISE')
    t('6b. dpo.not exclu technique', r.emailsExclus.some((e) => e.email.includes('dpo')))
    t('6c. mediateurdunotariat exclu technique', r.emailsExclus.some((e) => e.email.includes('mediateur')))
  }

  // 7. Pharmacorp / faux .jpg -> EXCLU_TECHNIQUE
  {
    const r = qualifierEntreprise(entree({ siteWeb: 'https://pharmacie-x.pharmacorp.fr/', emailsTrouves: [email({ email: 'bienvenue@2x.jpg', emailDomain: '2x.jpg', sourcePageType: 'ACCUEIL' })] }), false)
    t('7. Faux .jpg -> EXCLU_TECHNIQUE', r.emailsExclus.some((e) => e.relationDomaine === 'EXCLU_TECHNIQUE'))
  }

  // 8. Bien Vieillir IDF / sélection antenne Villeneuve (multi-antennes)
  {
    const villes = ['antony', 'arcueil', 'boissy', 'ormesson', 'charenton', 'deuil', 'joinville', 'villeneuve', 'vitry']
    const emails = [
      email({ email: 'contact@bienvieillir-idf.org', emailDomain: 'bienvieillir-idf.org', sourcePageType: 'ACCUEIL' }),
      ...villes.map((v) => email({ email: `${v}@bienvieillir-idf.org`, emailDomain: 'bienvieillir-idf.org', sourcePageType: 'ACCUEIL' })),
    ]
    const r = qualifierEntreprise(entree({ siteWeb: 'http://bienvieillir-idf.org/', emailsTrouves: emails }), false)
    t('8. Bien Vieillir -> villeneuve@ retenu comme PRINCIPAL', r.emailPrincipal?.email === 'villeneuve@bienvieillir-idf.org')
    t('8b. contact@ générique en secondaire', r.emailsSecondaires.some((e) => e.email === 'contact@bienvieillir-idf.org'))
    t('8c. autres antennes (antony, arcueil...) exclues', r.emailsExclus.some((e) => e.email === 'antony@bienvieillir-idf.org') && r.emailsExclus.some((e) => e.email === 'vitry@bienvieillir-idf.org'))
  }

  // 9. Jouy/JMR / attribution ambiguë — téléphone FIABLE
  {
    const emailsTrouves = [email({ email: 'jouy.moto@orange.fr', emailDomain: 'orange.fr', sourcePageType: 'AUTRE' })]
    const lot = qualifierLotEntreprises([
      entree({ companyId: 'c-jouy', siren: '401113162', siteWeb: 'https://jouymoto.fr/atelier', telephone: '0143890433', telephoneFiable: true, emailsTrouves }),
      entree({ companyId: 'c-jmr', siren: '401112008', siteWeb: 'https://jouymoto.fr/atelier', telephone: '0143890433', telephoneFiable: true, emailsTrouves }),
    ])
    t('9. Jouy -> A_VERIFIER_ATTRIBUTION (téléphone fiable partagé)', lot[0].emailPrincipal?.niveauConfiance === 'A_VERIFIER_ATTRIBUTION')
    t('9b. JMR -> A_VERIFIER_ATTRIBUTION également', lot[1].emailPrincipal?.niveauConfiance === 'A_VERIFIER_ATTRIBUTION')
  }

  // 9c. CORRECTION 4 : doublon avec téléphone NON FIABLE -> ne déclenche PAS A_VERIFIER_ATTRIBUTION
  {
    const emailsTrouves = [email({ email: 'jouy.moto@orange.fr', emailDomain: 'orange.fr', sourcePageType: 'ACCUEIL' })]
    const lot = qualifierLotEntreprises([
      entree({ companyId: 'c-jouy2', siren: '1', siteWeb: 'https://jouymoto.fr/atelier', telephone: '0143890433', telephoneFiable: false, emailsTrouves }),
      entree({ companyId: 'c-jmr2', siren: '2', siteWeb: 'https://jouymoto.fr/atelier', telephone: '0143890433', telephoneFiable: false, emailsTrouves }),
    ])
    t('9c. Téléphone NON fiable partagé -> PAS de A_VERIFIER_ATTRIBUTION', lot[0].emailPrincipal?.niveauConfiance !== 'A_VERIFIER_ATTRIBUTION')
  }

  // 10. Linkeo / prestataire technique
  {
    const r = qualifierEntreprise(entree({ siteWeb: 'http://www.cf-batiment.com/', emailsTrouves: [email({ email: 'service@linkeo.com', emailDomain: 'linkeo.com', sourcePageType: 'MENTIONS_LEGALES' })] }), false)
    t('10. Linkeo -> EXCLU_TECHNIQUE (prestataire connu)', r.emailsExclus.some((e) => e.relationDomaine === 'EXCLU_TECHNIQUE'))
  }

  // 11. CORRECTION 3 : communeCible générique — changement de commune, moteur non spécifique à VSG
  {
    const emails = [
      email({ email: 'lyon@monreseau.fr', emailDomain: 'monreseau.fr', sourcePageType: 'ACCUEIL' }),
      ...['paris', 'marseille', 'nantes', 'lille', 'nancy'].map((v) => email({ email: `${v}@monreseau.fr`, emailDomain: 'monreseau.fr', sourcePageType: 'ACCUEIL' })),
    ]
    const r = qualifierEntreprise(entree({ siteWeb: 'https://monreseau.fr/', communeCible: 'Lyon', aliasesCommune: [], emailsTrouves: emails }), false)
    t('11. communeCible="Lyon" (générique, pas VSG) -> lyon@ retenu comme principal', r.emailPrincipal?.email === 'lyon@monreseau.fr')
  }

  // 12. Aucune commune/alias codé en dur dans le moteur — vérification structurelle
  {
    const fs = require('fs')
    const src = fs.readFileSync(__dirname + '/qualification-email-v2.ts', 'utf-8')
    t('12. Aucun "villeneuve" ou "vsg" codé en dur dans le moteur (hors commentaires d\'exemple)', !/['"]villeneuve|['"]vsg['"]/i.test(src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')))
  }

  // 13. Aucune écriture DB — vérification structurelle
  {
    const fs = require('fs')
    const src = fs.readFileSync(__dirname + '/qualification-email-v2.ts', 'utf-8')
    t('13. Aucun import Supabase / aucune écriture', !/@supabase\/supabase-js/.test(src) && !/\.insert\(|\.update\(|\.upsert\(/.test(src))
  }

  // 14. CORRECTION CIBLÉE 1 : "saint" seul ne doit jamais suffire comme preuve géographique
  {
    const emails = [
      email({ email: 'saint@monreseau.fr', emailDomain: 'monreseau.fr', sourcePageType: 'ACCUEIL' }),
      ...['a', 'b', 'c', 'd', 'e'].map((v) => email({ email: `${v}ville@monreseau.fr`, emailDomain: 'monreseau.fr', sourcePageType: 'ACCUEIL' })),
    ]
    const r = qualifierEntreprise(entree({ siteWeb: 'https://monreseau.fr/', communeCible: 'Villeneuve-Saint-Georges', aliasesCommune: ['vsg'], emailsTrouves: emails }), false)
    t('14. "saint@..." seul -> PAS retenu comme correspondance géographique (mot trop générique)', r.emailPrincipal?.email !== 'saint@monreseau.fr')
  }

  // 15. CORRECTION CIBLÉE 2 : correspondance géographique seule ne donne JAMAIS CONFIRME
  {
    const villes = ['antony', 'arcueil', 'boissy', 'ormesson', 'charenton', 'villeneuve']
    const emails = villes.map((v) => email({ email: `${v}@bienvieillir-idf.org`, emailDomain: 'bienvieillir-idf.org', sourcePageType: 'ACCUEIL' }))
    const r = qualifierEntreprise(entree({ siteWeb: 'http://bienvieillir-idf.org/', emailsTrouves: emails }), false)
    t('15. Antenne géo-matchée -> niveau PROBABLE, jamais CONFIRME sur la seule base géographique', r.emailPrincipal?.email === 'villeneuve@bienvieillir-idf.org' && r.emailPrincipal?.niveauConfiance === 'PROBABLE')
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
