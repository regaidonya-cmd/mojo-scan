import type { DonneeTracee } from './types'

const PAGES_MAX = ['/', '/contact', '/mentions-legales']

// Regex email standard — utilisée UNIQUEMENT pour repérer un email déjà
// écrit en clair dans une page, jamais pour en générer un.
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

function classifierEmail(email: string): 'contact_commercial' | 'commercial_secondaire' | 'generique' | 'autre' {
  const local = email.split('@')[0].toLowerCase()
  if (local.includes('contact')) return 'contact_commercial'
  if (['commercial', 'info', 'accueil'].some((k) => local.includes(k))) return 'commercial_secondaire'
  if (['hello', 'bonjour', 'admin'].some((k) => local.includes(k))) return 'generique'
  return 'autre'
}

/**
 * extraireEmailSite — examine au maximum 3 pages (accueil/contact/mentions
 * légales) du domaine officiel identifié. Ne fabrique JAMAIS un email
 * (aucun firstname.lastname@domaine), ne prend jamais un email d'un AUTRE
 * domaine sans justification tracée. Retourne le meilleur email trouvé
 * selon l'ordre de préférence contact > générique > autre.
 */
export async function extraireEmailSite(
  domaine: string,
  fetchPage: (url: string) => Promise<string | null> // injecté — pas d'appel réseau direct dans cette fonction pure
): Promise<DonneeTracee<string> | null> {
  const candidats: { email: string; url: string; type: ReturnType<typeof classifierEmail> }[] = []

  for (const path of PAGES_MAX) {
    const url = `https://${domaine}${path}`
    const html = await fetchPage(url)
    if (!html) continue
    const emails = html.match(EMAIL_REGEX) ?? []
    for (const email of emails) {
      const domaineEmail = email.split('@')[1]?.toLowerCase()
      if (!domaineEmail || !domaineEmail.includes(domaine.replace('www.', ''))) continue // jamais un email d'un autre domaine sans justification
      candidats.push({ email, url, type: classifierEmail(email) })
    }
  }

  if (candidats.length === 0) return null

  const ordre = { contact_commercial: 0, commercial_secondaire: 1, generique: 2, autre: 3 }
  candidats.sort((a, b) => ordre[a.type] - ordre[b.type])
  const meilleur = candidats[0]

  return {
    valeur: meilleur.email,
    source: meilleur.url.includes('/contact') ? 'SITE_OFFICIEL_CONTACT' : meilleur.url.includes('mentions') ? 'SITE_OFFICIEL_MENTIONS' : 'SITE_OFFICIEL_AUTRE',
    urlSource: meilleur.url,
    niveauConfiance: meilleur.type === 'contact_commercial' ? 'CONFIRME' : 'PROBABLE',
  }
}
