import { fetchSecurise, ErreurSSRF } from './fetch-securise'

export type RelationDomaine = 'DOMAINE_SITE' | 'WEBMAIL_PUBLIC' | 'DOMAINE_TIERS'
export type ClassificationEmail = 'contact_commercial' | 'commercial_secondaire' | 'generique' | 'autre'
export type NiveauConfiance = 'CONFIRME' | 'PROBABLE' | 'A_VERIFIER'
export type MethodeExtraction = 'MAILTO' | 'HTML'

export interface EmailTrouve {
  email: string
  emailDomain: string
  relationDomaine: RelationDomaine
  classificationEmail: ClassificationEmail
  niveauConfiance: NiveauConfiance
  sourceUrl: string
  sourcePageType: 'ACCUEIL' | 'CONTACT' | 'MENTIONS_LEGALES' | 'AUTRE'
  extractionMethod: MethodeExtraction
}

export interface ResultatExtractionEntreprise {
  companyId: string
  siren: string
  siteWeb: string
  emailsTrouves: EmailTrouve[]
  nbTrouves: number
  nbRetenus: number // relation DOMAINE_SITE ou WEBMAIL_PUBLIC (jamais DOMAINE_TIERS/exclu)
  nbAVerifier: number // DOMAINE_TIERS non exclu
  raisonAucunEmail: string | null
  pagesVisitees: string[]
  erreurs: { url: string; raison: string }[]
}

// Webmails publics connus — explicitement publiés par une entreprise sur
// son propre site, recevables (jamais rejetés pour simple différence de domaine).
const WEBMAILS_PUBLICS = [
  'gmail.com', 'googlemail.com', 'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr',
  'live.com', 'live.fr', 'yahoo.com', 'yahoo.fr', 'orange.fr', 'wanadoo.fr', 'free.fr',
  'laposte.net', 'sfr.fr', 'bbox.fr', 'icloud.com', 'me.com', 'aol.com',
]

// Domaines techniques/parasites — toujours exclus, jamais une adresse d'entreprise.
const DOMAINES_TECHNIQUES = [
  'sentry.io', 'sentry-next.io', 'wixpress.com', 'wix.com', 'schema.org', 'w3.org',
  'example.com', 'example.org', 'exemple.fr', 'godaddy.com', 'cloudflare.com',
  'googleapis.com', 'gstatic.com', 'jsdelivr.net', 'cdnjs.cloudflare.com',
]

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const MAILTO_REGEX = /href\s*=\s*["']mailto:([^"'?]+)/gi

function normaliserEmail(email: string): string {
  return email.trim().toLowerCase()
}

function emailSyntaxiquementValide(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)
}

function domaineRacine(hostname: string): string {
  return hostname.replace(/^www\./, '')
}

function classifierRelationDomaine(emailDomain: string, domaineSite: string): RelationDomaine | 'EXCLU' {
  const emailRacine = domaineRacine(emailDomain)
  const siteRacine = domaineRacine(domaineSite)
  if (DOMAINES_TECHNIQUES.some((d) => emailRacine === d || emailRacine.endsWith('.' + d))) return 'EXCLU'
  if (emailRacine === siteRacine || emailRacine.endsWith('.' + siteRacine)) return 'DOMAINE_SITE'
  if (WEBMAILS_PUBLICS.includes(emailRacine)) return 'WEBMAIL_PUBLIC'
  return 'DOMAINE_TIERS' // jamais supprimé silencieusement — conservé en A_VERIFIER
}

function classifierTypeEmail(email: string): ClassificationEmail {
  const local = email.split('@')[0].toLowerCase()
  if (local.includes('contact')) return 'contact_commercial'
  if (['commercial', 'info', 'accueil'].some((k) => local.includes(k))) return 'commercial_secondaire'
  if (['hello', 'bonjour', 'admin'].some((k) => local.includes(k))) return 'generique'
  return 'autre'
}

function typePage(url: string): EmailTrouve['sourcePageType'] {
  if (/contact/i.test(url)) return 'CONTACT'
  if (/mentions?[-_]?l[ée]gales?/i.test(url)) return 'MENTIONS_LEGALES'
  const path = new URL(url).pathname
  if (path === '/' || path === '') return 'ACCUEIL'
  return 'AUTRE'
}

/** Détecte les liens Contact/Mentions légales RÉELLEMENT présents dans le
 * HTML, résolus UNIQUEMENT relativement à l'origine du site de départ
 * (jamais un lien externe suivi comme page interne). */
function detecterLiensInternes(html: string, baseUrl: string): { contact: string | null; mentionsLegales: string | null } {
  const liens: { href: string; texte: string }[] = []
  const regexLien = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = regexLien.exec(html))) {
    const texte = m[2].replace(/<[^>]+>/g, ' ').trim().toLowerCase()
    liens.push({ href: m[1], texte })
  }

  const base = new URL(baseUrl)
  const memesDomaine = (href: string) => {
    try { return new URL(href, baseUrl).hostname === base.hostname } catch { return false }
  }

  const contactLien = liens.find((l) => memesDomaine(l.href) && /contact/i.test(l.texte + l.href))
  const mentionsLien = liens.find((l) => memesDomaine(l.href) && /mentions?\s*l[ée]gales?/i.test(l.texte + l.href))

  return {
    contact: contactLien ? new URL(contactLien.href, baseUrl).toString() : null,
    mentionsLegales: mentionsLien ? new URL(mentionsLien.href, baseUrl).toString() : null,
  }
}

/**
 * extraireEmailsEntreprise — visite au maximum 3 pages (accueil + Contact
 * + Mentions légales, détectées dynamiquement, jamais supposées). Conserve
 * PLUSIEURS emails pertinents, déduplique le même email trouvé sur
 * plusieurs pages (1 seule entrée finale, URL source = 1ère occurrence).
 * Ne fabrique JAMAIS un email. Ne rejette jamais silencieusement un
 * domaine différent — classifie DOMAINE_SITE/WEBMAIL_PUBLIC/DOMAINE_TIERS,
 * seuls les domaines techniques connus sont exclus.
 */
export async function extraireEmailsEntreprise(
  companyId: string, siren: string, siteWeb: string,
  fetchFn?: (url: string) => Promise<{ status: number; html: string; urlFinale: string }>
): Promise<ResultatExtractionEntreprise> {
  const fetcher = fetchFn ?? ((url: string) => fetchSecurise(url))
  const pagesVisitees: string[] = []
  const erreurs: ResultatExtractionEntreprise['erreurs'] = []
  const emailsVus = new Map<string, EmailTrouve>()

  let domaineSite: string
  try {
    domaineSite = new URL(siteWeb).hostname
  } catch {
    return { companyId, siren, siteWeb, emailsTrouves: [], nbTrouves: 0, nbRetenus: 0, nbAVerifier: 0, raisonAucunEmail: 'URL de site invalide', pagesVisitees: [], erreurs: [] }
  }

  function extraireDeLaPage(html: string, url: string) {
    const trouvesIci = new Set<string>()
    let m
    const mailtoRe = new RegExp(MAILTO_REGEX)
    while ((m = mailtoRe.exec(html))) {
      const email = normaliserEmail(m[1])
      if (emailSyntaxiquementValide(email)) trouvesIci.add(email + '|MAILTO')
    }
    const emailRe = new RegExp(EMAIL_REGEX)
    while ((m = emailRe.exec(html))) {
      const email = normaliserEmail(m[0])
      if (emailSyntaxiquementValide(email)) trouvesIci.add(email + '|HTML')
    }

    for (const cle of Array.from(trouvesIci)) {
      const [email, methode] = cle.split('|') as [string, MethodeExtraction]
      if (emailsVus.has(email)) continue
      const emailDomain = email.split('@')[1]
      const relation = classifierRelationDomaine(emailDomain, domaineSite)
      if (relation === 'EXCLU') continue

      emailsVus.set(email, {
        email, emailDomain, relationDomaine: relation,
        classificationEmail: classifierTypeEmail(email),
        niveauConfiance: relation === 'DOMAINE_TIERS' ? 'A_VERIFIER' : (classifierTypeEmail(email) === 'contact_commercial' ? 'CONFIRME' : 'PROBABLE'),
        sourceUrl: url, sourcePageType: typePage(url), extractionMethod: methode,
      })
    }
  }

  async function visiter(url: string): Promise<string | null> {
    try {
      const res = await fetcher(url)
      pagesVisitees.push(url)
      extraireDeLaPage(res.html, url)
      return res.html
    } catch (e: any) {
      erreurs.push({ url, raison: e instanceof ErreurSSRF ? `${e.raison}: ${e.message}` : e.message })
      return null
    }
  }

  const htmlAccueil = await visiter(siteWeb)
  if (htmlAccueil) {
    const { contact, mentionsLegales } = detecterLiensInternes(htmlAccueil, siteWeb)
    if (contact) await visiter(contact)
    if (mentionsLegales) await visiter(mentionsLegales)
  }

  const emailsTrouves = Array.from(emailsVus.values())
  const nbRetenus = emailsTrouves.filter((e) => e.relationDomaine !== 'DOMAINE_TIERS' as RelationDomaine).length
  const nbAVerifier = emailsTrouves.filter((e) => e.relationDomaine === 'DOMAINE_TIERS').length

  let raisonAucunEmail: string | null = null
  if (emailsTrouves.length === 0) {
    raisonAucunEmail = erreurs.length > 0 ? `Échec de récupération: ${erreurs.map((e) => e.raison).join('; ')}` : 'Aucun email publiquement affiché détecté sur les pages visitées'
  }

  return {
    companyId, siren, siteWeb, emailsTrouves,
    nbTrouves: emailsTrouves.length, nbRetenus, nbAVerifier,
    raisonAucunEmail, pagesVisitees, erreurs,
  }
}
