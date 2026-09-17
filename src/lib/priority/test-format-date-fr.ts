import { formatDateHeureFr, formatDateFr } from './format-date-fr'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean, detail?: string) {
  results.push({ name, pass })
  console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name + (detail && !pass ? ` (${detail})` : ''))
}

// 1. Cas réel de recette : UTC -> Paris en CEST (septembre, UTC+2)
{
  const r = formatDateHeureFr('2026-09-21T11:06:00Z')
  t('1. cas recette : 2026-09-21T11:06:00Z -> 21/09/2026 13:06 (CEST, +2)', r === '21/09/2026 13:06', r)
}

// 2. Heure d'hiver : UTC -> Paris en CET (décembre, UTC+1)
{
  const r = formatDateHeureFr('2026-12-21T12:06:00Z')
  t('2. hiver : 2026-12-21T12:06:00Z -> 21/12/2026 13:06 (CET, +1)', r === '21/12/2026 13:06', r)
}

// 3. Date seule (formatDateFr), fuseau Europe/Paris
{
  const r = formatDateFr('2026-09-21T23:30:00Z') // 23h30 UTC = 01h30 le lendemain a Paris (CEST)
  t('3. date seule : bascule de jour correcte via Europe/Paris (23:30 UTC -> 22/09 a Paris)', r === '22/09/2026', r)
}

// 4. Valeur invalide -> comportement sur, jamais "Invalid Date"
{
  const r1 = formatDateHeureFr('n-importe-quoi')
  const r2 = formatDateFr('n-importe-quoi')
  t('4a. valeur invalide (heure) -> fallback sur, pas "Invalid Date"', r1 === '—' && !r1.includes('Invalid'))
  t('4b. valeur invalide (date) -> fallback sur, pas "Invalid Date"', r2 === '—' && !r2.includes('Invalid'))
}

// 5. null/undefined -> pas de crash, fallback sur
{
  t('5a. null -> fallback sur', formatDateHeureFr(null) === '—')
  t('5b. undefined -> fallback sur', formatDateHeureFr(undefined) === '—')
}

// 6. Chaine vide -> fallback sur
{
  t('6. chaine vide -> fallback sur', formatDateHeureFr('') === '—')
}

console.log('')
const passed = results.filter((r) => r.pass).length
console.log(`${passed}/${results.length} tests passes`)
if (passed !== results.length) process.exit(1)
