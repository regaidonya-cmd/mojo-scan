// ══════════════════════════════════════════════════════════════
// MOJO SCAN — Source de campagne (?src=...)
// Lue à l'arrivée sur le scan, conservée pendant le parcours
// (sessionStorage, survit à un rechargement), envoyée au submit.
// ══════════════════════════════════════════════════════════════

const CLE = 'mojo_scan_src'

// Codes de campagne : lettres, chiffres, _ et - (ex. DIAG_REX_DMH_2026_10)
export const SOURCE_CAMPAGNE_REGEX = /^[A-Za-z0-9_-]{1,64}$/

export function normaliserSourceCampagne(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return SOURCE_CAMPAGNE_REGEX.test(s) ? s : null
}

/** À appeler à l'arrivée sur le scan : mémorise ?src= s'il est valide. */
export function capterSourceCampagne(): string | null {
  if (typeof window === 'undefined') return null
  const src = normaliserSourceCampagne(new URLSearchParams(window.location.search).get('src'))
  if (src) {
    try { window.sessionStorage.setItem(CLE, src) } catch {}
    return src
  }
  return lireSourceCampagne()
}

/** Source mémorisée pour ce parcours, ou null. */
export function lireSourceCampagne(): string | null {
  if (typeof window === 'undefined') return null
  try { return normaliserSourceCampagne(window.sessionStorage.getItem(CLE)) } catch { return null }
}
