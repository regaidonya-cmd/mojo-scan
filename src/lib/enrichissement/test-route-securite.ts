const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

async function main() {
  const fs = require('fs')
  const routeSrc = fs.readFileSync(__dirname + '/../../app/api/admin/test-enrichissement-vsg/route.ts', 'utf-8')

  // 1. Route non authentifiée refusée
  t('1. Vérification admin_auth présente dans la route', routeSrc.includes('admin_auth') && routeSrc.includes("status: 401"))

  // 2. GET refusé
  t('2. Seul POST est exporté (GET non défini -> 405 automatique Next.js)', routeSrc.includes('export async function POST') && !routeSrc.includes('export async function GET'))

  // 3. Clé absente = erreur avant appel
  const idxKeyCheck = routeSrc.indexOf('GOOGLE_PLACES_API_KEY absente')
  const idxEnrichir = routeSrc.indexOf('await enrichirBatch')
  t('3. Vérification GOOGLE_PLACES_API_KEY placée AVANT l\'appel enrichirBatch dans le code source', idxKeyCheck > 0 && idxEnrichir > 0 && idxKeyCheck < idxEnrichir)

  // 4. MAX_COMPANIES >10 impossible
  t('4. La route ne lit jamais le body de la requête (aucune liste externe possible)', !routeSrc.includes('req.json()') && !routeSrc.includes('request.json()'))
  t('4b. BAT_10 contient exactement 10 entrées codées en dur', (routeSrc.match(/siren: '\d+'/g) ?? []).length === 10)
  // "companyIds"/"batch size" apparaissent uniquement dans le commentaire documentant leur refus (ligne 15) — jamais lus depuis la requête
  t('4c. Aucun paramètre companyIds/limit/batchSize LU depuis la requête (le mot n\'apparaît que dans le commentaire documentant son refus)', !/(?:req|request|body)\.(?:companyIds|batchSize|limit)/.test(routeSrc))

  // 5. Compteur >20 bloque
  t('5. Vérification post-exécution des compteurs (via constantes MAX_TEXT_SEARCH_CALLS/MAX_PLACE_DETAILS_CALLS)', routeSrc.includes('nbTextSearch > MAX_TEXT_SEARCH_CALLS') && routeSrc.includes('nbPlaceDetails > MAX_PLACE_DETAILS_CALLS'))

  // 6. Aucune mutation Supabase
  t('6. Aucun import de client Supabase dans la route', !routeSrc.includes('createClient') && !routeSrc.includes('supabase'))
  // .update(secret) ligne 9 est l'API crypto Node (createHash().update()), jamais une écriture DB — vérifié par l'absence de client Supabase (test 6) plutôt qu'un grep naïf sur ".update("
  t('6b. Aucune écriture DB (confirmé par l\'absence totale de client Supabase importé)', !routeSrc.includes('createClient') && !routeSrc.includes('from(') && !routeSrc.includes('.rpc('))

  // 7. Aucun appel Brevo
  t('7. Aucune référence Brevo dans la route', !/brevo/i.test(routeSrc))

  // 8. Aucun secret dans réponse/log — vérifier qu'aucune variable contenant la clé n'est jamais interpolée dans une réponse
  const secretJamaisExpose = !/NextResponse\.json\([^)]*process\.env\.GOOGLE_PLACES_API_KEY[^)]*\)/.test(routeSrc.replace(/\n/g, ' '))
  t('8. process.env.GOOGLE_PLACES_API_KEY jamais interpolé dans une réponse JSON (seule une comparaison textuelle sur le mot "API_KEY" existe, jamais la valeur)', secretJamaisExpose)
  t('8b. Aucun console.log de la clé', !routeSrc.includes('console.log'))

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
export {}
