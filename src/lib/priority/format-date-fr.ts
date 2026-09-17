// ══════════════════════════════════════════════════════════════
// P0.7D-FIX.6 — Formatage centralisé des dates commerciales.
// Explicite Europe/Paris (IANA), jamais de décalage +1/+2h manuel —
// géré nativement par Intl/toLocaleString, identique côté Server
// Component et Client Component (le fuseau ne dépend jamais du
// runtime qui exécute le code).
// ══════════════════════════════════════════════════════════════

const TIMEZONE = 'Europe/Paris'

function isValidIso(iso: string | null | undefined): iso is string {
  return typeof iso === 'string' && iso.length > 0 && !Number.isNaN(new Date(iso).getTime())
}

/** « 21/09/2026 13:06 » — jour/mois/année + heure/minute, fuseau Europe/Paris. */
export function formatDateHeureFr(iso: string | null | undefined): string {
  if (!isValidIso(iso)) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    timeZone: TIMEZONE,
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/** « 21/09/2026 » — jour/mois/année seuls, fuseau Europe/Paris. */
export function formatDateFr(iso: string | null | undefined): string {
  if (!isValidIso(iso)) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    timeZone: TIMEZONE,
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}
