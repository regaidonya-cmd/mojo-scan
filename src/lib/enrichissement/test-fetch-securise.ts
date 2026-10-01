import { estIpInterdite, fetchSecurise, ErreurSSRF } from './fetch-securise'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

function lookupFixe(adresse: string) { return async () => ({ address: adresse }) }

async function main() {
  t('1. 127.0.0.1 -> IP_LOOPBACK', estIpInterdite('127.0.0.1') === 'IP_LOOPBACK')
  t('1b. 10.0.0.1 -> IP_PRIVEE', estIpInterdite('10.0.0.1') === 'IP_PRIVEE')
  t('1c. 172.16.0.1 -> IP_PRIVEE', estIpInterdite('172.16.0.1') === 'IP_PRIVEE')
  t('1d. 192.168.1.1 -> IP_PRIVEE', estIpInterdite('192.168.1.1') === 'IP_PRIVEE')
  t('1e. 169.254.169.254 (metadata cloud) -> IP_LINK_LOCAL', estIpInterdite('169.254.169.254') === 'IP_LINK_LOCAL')
  t('1f. 8.8.8.8 (IP publique) -> autorisée', estIpInterdite('8.8.8.8') === null)
  t('1g. ::1 -> IP_LOOPBACK', estIpInterdite('::1') === 'IP_LOOPBACK')

  {
    try {
      await fetchSecurise('ftp://exemple.fr', (async () => { throw new Error('jamais appelé') }) as any, lookupFixe('8.8.8.8'))
      t('2. FAIL attendu', false)
    } catch (e: any) {
      t('2. Scheme ftp:// rejeté', e instanceof ErreurSSRF && e.raison === 'SCHEME_NON_AUTORISE')
    }
  }

  {
    let fetchAppele = false
    const fetchMock = (async () => { fetchAppele = true; return { status: 200, headers: new Map() } }) as any
    try {
      await fetchSecurise('https://interne.exemple.fr', fetchMock, lookupFixe('192.168.1.1'))
      t('3. FAIL attendu', false)
    } catch (e: any) {
      t('3. IP privée détectée avant tout appel fetch', e instanceof ErreurSSRF && e.raison === 'IP_PRIVEE' && !fetchAppele)
    }
  }

  // 4. Redirection externe -> nouvelle validation SSRF à chaque saut (vers IP privée ici)
  {
    let appel = 0
    let lookupCourant = '8.8.8.8'
    const lookupDynamique = async () => ({ address: lookupCourant })
    const fetchMock = (async () => {
      appel++
      if (appel === 1) {
        lookupCourant = '127.0.0.1'
        return { status: 302, headers: new Map([['location', 'https://interne.local/']]) }
      }
      return { status: 200, headers: new Map([['content-type', 'text/html']]), body: null }
    }) as any
    try {
      await fetchSecurise('https://public.exemple.fr', fetchMock, lookupDynamique)
      t('4. FAIL attendu', false)
    } catch (e: any) {
      t('4. Redirection externe -> revalidation SSRF au saut suivant (rejetée)', e instanceof ErreurSSRF && e.raison === 'IP_LOOPBACK')
    }
  }

  {
    const fetchMock = (async () => ({ status: 200, headers: new Map([['content-type', 'text/html'], ['content-length', String(3 * 1024 * 1024)]]) })) as any
    try {
      await fetchSecurise('https://gros-site.exemple.fr', fetchMock, lookupFixe('8.8.8.8'))
      t('5. FAIL attendu', false)
    } catch (e: any) {
      t('5. Réponse > 2 Mo rejetée', e instanceof ErreurSSRF && e.raison === 'REPONSE_TROP_GRANDE')
    }
  }

  {
    const fetchMock = (async () => ({ status: 200, headers: new Map([['content-type', 'application/pdf']]) })) as any
    try {
      await fetchSecurise('https://pdf.exemple.fr', fetchMock, lookupFixe('8.8.8.8'))
      t('6. FAIL attendu', false)
    } catch (e: any) {
      t('6. Content-Type non-HTML rejeté', e instanceof ErreurSSRF && e.raison === 'CONTENT_TYPE_NON_AUTORISE')
    }
  }

  {
    const fetchMock = (async (_url: string, opts: any) => new Promise((_resolve, reject) => {
      opts.signal.addEventListener('abort', () => { const e: any = new Error('aborted'); e.name = 'AbortError'; reject(e) })
    })) as any
    try {
      await fetchSecurise('https://lent.exemple.fr', fetchMock, lookupFixe('8.8.8.8'))
      t('7. FAIL attendu', false)
    } catch (e: any) {
      t('7. Timeout détecté', e instanceof ErreurSSRF && e.raison === 'TIMEOUT')
    }
  }

  {
    const encoder = new TextEncoder()
    const chunk = encoder.encode('<html>ok</html>')
    let lu = false
    const fetchMock = (async () => ({
      status: 200, headers: new Map([['content-type', 'text/html; charset=utf-8']]),
      body: { getReader: () => ({ read: async () => { if (lu) return { done: true, value: undefined }; lu = true; return { done: false, value: chunk } } }) },
    })) as any
    const res = await fetchSecurise('https://ok.exemple.fr', fetchMock, lookupFixe('8.8.8.8'))
    t('8. Cas nominal réussi -> HTML récupéré', res.html.includes('ok'))
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
