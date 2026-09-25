const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

async function main() {
  const fs = require('fs')
  const routeSrc = fs.readFileSync(__dirname + '/../../app/api/admin/test-enrichissement-vsg-retest6/route.ts', 'utf-8')

  t('1. Vérification admin_auth présente', routeSrc.includes('admin_auth') && routeSrc.includes('status: 401'))
  t('2. Seul POST est exporté (GET refusé structurellement)', routeSrc.includes('export async function POST') && !routeSrc.includes('export async function GET'))

  const idxKeyCheck = routeSrc.indexOf('GOOGLE_PLACES_API_KEY absente')
  const idxEnrichir = routeSrc.indexOf('await enrichirBatch')
  t('3. Clé vérifiée AVANT enrichirBatch', idxKeyCheck > 0 && idxEnrichir > 0 && idxKeyCheck < idxEnrichir)

  t('4. Aucune lecture du body de la requête', !routeSrc.includes('req.json()') && !routeSrc.includes('request.json()'))
  t('4b. RETEST_6 contient exactement 6 entrées codées en dur', (routeSrc.match(/siren: '\d+'/g) ?? []).length === 6)
  t('4c. Les 4 MATCH_FORT du BAT 1 ne figurent PAS dans ce jeu (ALLO POULET / UNIV\'HAIR / EMERAUDE / CEVA absents)',
    !routeSrc.includes('ALLO POULET') && !routeSrc.includes("UNIV'HAIR") && !routeSrc.includes('EMERAUDE CONDUITE') && !routeSrc.includes('CEVA LOGISTICS'))

  t('5. Contrôle final des compteurs présent (via constantes)', routeSrc.includes('nbTextSearch > MAX_TEXT_SEARCH_CALLS') && routeSrc.includes('nbPlaceDetails > MAX_PLACE_DETAILS_CALLS'))

  t('6. Aucun import de client Supabase', !routeSrc.includes('createClient') && !routeSrc.includes('supabase') && !routeSrc.includes('.rpc('))
  t('7. Aucune référence Brevo', !/brevo/i.test(routeSrc))

  const secretJamaisExpose = !/NextResponse\.json\([^)]*process\.env\.GOOGLE_PLACES_API_KEY[^)]*\)/.test(routeSrc.replace(/\n/g, ' '))
  t('8. Clé jamais interpolée dans une réponse JSON', secretJamaisExpose)
  t('8b. Aucun console.log', !routeSrc.includes('console.log'))

  t('9. candidatsExamines exposé pour observabilité (max 3, imposé par matching.ts)', routeSrc.includes('candidatsExamines'))

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
export {}
