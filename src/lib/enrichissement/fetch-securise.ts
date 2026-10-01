import * as dns from 'dns'

type FonctionLookup = (hostname: string) => Promise<{ address: string }>

const dnsLookupParDefaut: FonctionLookup = (hostname) => new Promise((resolve, reject) => {
  dns.lookup(hostname, (err, address) => {
    if (err) reject(err)
    else resolve({ address })
  })
})

const TIMEOUT_MS = 8000
const TAILLE_MAX_OCTETS = 2 * 1024 * 1024 // 2 Mo
const MAX_REDIRECTIONS = 5
const USER_AGENT = 'MojoAcademieBot/1.0 (+https://mojoacademie.fr/bot; enrichissement contact professionnel)'

export type RaisonRejetSSRF =
  | 'SCHEME_NON_AUTORISE' | 'IP_PRIVEE' | 'IP_LOOPBACK' | 'IP_LINK_LOCAL' | 'IP_METADATA_CLOUD'
  | 'TROP_DE_REDIRECTIONS' | 'CONTENT_TYPE_NON_AUTORISE' | 'REPONSE_TROP_GRANDE' | 'TIMEOUT' | 'DNS_ECHEC'

export class ErreurSSRF extends Error {
  constructor(public raison: RaisonRejetSSRF, message: string) {
    super(message)
    this.name = 'ErreurSSRF'
  }
}

/** Vérifie qu'une IP (v4 ou v6) n'appartient à aucune plage privée,
 * loopback, link-local, ou metadata cloud connue. */
export function estIpInterdite(ip: string): RaisonRejetSSRF | null {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    const [a, b] = ip.split('.').map(Number)
    if (a === 127) return 'IP_LOOPBACK'
    if (a === 10) return 'IP_PRIVEE'
    if (a === 172 && b >= 16 && b <= 31) return 'IP_PRIVEE'
    if (a === 192 && b === 168) return 'IP_PRIVEE'
    if (a === 169 && b === 254) return 'IP_LINK_LOCAL' // couvre 169.254.169.254 (metadata cloud)
    if (a === 0) return 'IP_PRIVEE'
    return null
  }
  const ipLower = ip.toLowerCase()
  if (ipLower === '::1') return 'IP_LOOPBACK'
  if (ipLower.startsWith('fc') || ipLower.startsWith('fd')) return 'IP_PRIVEE'
  if (ipLower.startsWith('fe80')) return 'IP_LINK_LOCAL'
  return null
}

async function resoudreEtValider(hostname: string, lookupFn: FonctionLookup): Promise<void> {
  let adresse: string
  try {
    const resultat = await lookupFn(hostname)
    adresse = resultat.address
  } catch {
    throw new ErreurSSRF('DNS_ECHEC', `Résolution DNS échouée pour ${hostname}`)
  }
  const raison = estIpInterdite(adresse)
  if (raison) throw new ErreurSSRF(raison, `IP interdite (${raison}) pour ${hostname} -> ${adresse}`)
}

export interface ReponseSecurisee {
  status: number
  html: string
  urlFinale: string
}

/**
 * fetchSecurise — HTTPS prioritaire (HTTP accepté seulement si l'appelant
 * le demande explicitement), résolution DNS + blocage IP privées/
 * loopback/link-local/metadata à CHAQUE requête (y compris après
 * redirection — jamais une seule validation en début de chaîne),
 * redirections MANUELLES, timeout 8s, taille max 2 Mo, Content-Type HTML
 * requis, User-Agent identifiable. Aucune exploration incontrôlée : cette
 * fonction ne fait qu'UNE requête logique (avec ses redirections), jamais
 * un crawl.
 */
export async function fetchSecurise(
  urlDepart: string,
  fetchFn: typeof fetch = fetch,
  lookupFn: FonctionLookup = dnsLookupParDefaut
): Promise<ReponseSecurisee> {
  let url = urlDepart
  for (let saut = 0; saut <= MAX_REDIRECTIONS; saut++) {
    if (saut === MAX_REDIRECTIONS) throw new ErreurSSRF('TROP_DE_REDIRECTIONS', `Plus de ${MAX_REDIRECTIONS} redirections`)

    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new ErreurSSRF('SCHEME_NON_AUTORISE', `Scheme non autorisé: ${parsed.protocol}`)
    }
    // Contrôle SSRF à CHAQUE saut (y compris après redirection).
    await resoudreEtValider(parsed.hostname, lookupFn)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let res: Response
    try {
      res = await fetchFn(url, {
        signal: controller.signal,
        redirect: 'manual',
        headers: { 'User-Agent': USER_AGENT },
      })
    } catch (e: any) {
      if (e.name === 'AbortError') throw new ErreurSSRF('TIMEOUT', `Timeout après ${TIMEOUT_MS}ms sur ${url}`)
      throw e
    } finally {
      clearTimeout(timeoutId)
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location')
      if (!location) return { status: res.status, html: '', urlFinale: url }
      url = new URL(location, url).toString() // résolu relativement à l'URL courante, jamais absolu non vérifié
      continue
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) {
      throw new ErreurSSRF('CONTENT_TYPE_NON_AUTORISE', `Content-Type non autorisé: ${contentType}`)
    }

    const contentLength = res.headers.get('content-length')
    if (contentLength && Number(contentLength) > TAILLE_MAX_OCTETS) {
      throw new ErreurSSRF('REPONSE_TROP_GRANDE', `Content-Length ${contentLength} > ${TAILLE_MAX_OCTETS}`)
    }

    const reader = res.body?.getReader()
    if (!reader) return { status: res.status, html: await res.text(), urlFinale: url }
    let recu = 0
    const chunks: Uint8Array[] = []
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      recu += value.length
      if (recu > TAILLE_MAX_OCTETS) throw new ErreurSSRF('REPONSE_TROP_GRANDE', `Réponse dépasse ${TAILLE_MAX_OCTETS} octets`)
      chunks.push(value)
    }
    const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf-8')
    return { status: res.status, html, urlFinale: url }
  }
  throw new ErreurSSRF('TROP_DE_REDIRECTIONS', 'Boucle de redirection non résolue')
}
