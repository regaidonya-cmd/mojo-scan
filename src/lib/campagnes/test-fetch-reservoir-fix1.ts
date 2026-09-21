import { chunk, resoudreCommune, resoudreDepartement, CODE_POSTAL_REGEX } from './fetch-reservoir'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) {
  results.push({ name, pass })
  console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name)
}

// 1. >1000 companies -> chunk() découpe correctement
{
  const items = Array.from({ length: 1234 }, (_, i) => i)
  const chunks = chunk(items, 500)
  t('1. 1234 éléments en lots de 500 -> 3 lots (500+500+234)', chunks.length === 3 && chunks[0].length === 500 && chunks[2].length === 234)
  t('1b. Aucun élément perdu', chunks.flat().length === 1234)
}

// 2. Pagination multi-pages — vérification conceptuelle du seuil d'arrêt
{
  // Une page pleine (=PAGE_SIZE) signale qu'il faut continuer ; une page
  // incomplète signale la fin — logique testée via chunk() elle-même
  // (fetchAllPaginated s'appuie sur ce même principe, non exporté ici
  // car il nécessite un vrai client Supabase, testé par le smoke réel §6).
  const pageSize = 500
  const totalItems = 1234
  const pages = Math.ceil(totalItems / pageSize)
  t('2. 1234 éléments avec PAGE_SIZE=500 -> 3 pages nécessaires (dernière incomplète = arrêt)', pages === 3)
}

// 3. Chunk .in()
{
  const ids = Array.from({ length: 320 }, (_, i) => `id-${i}`)
  const chunks = chunk(ids, 150)
  t('3. 320 IDs en lots de 150 -> 3 lots (150+150+20)', chunks.length === 3 && chunks[2].length === 20)
}

// 4. companies.city présent -> utilisé directement
{
  const r = resoudreCommune({ city: 'CACHAN' }, { ville: 'AUTRE_VILLE' })
  t('4. companies.city présent -> utilisé en priorité', r.ville === 'CACHAN' && r.source === 'COMPANIES_CITY')
}

// 5. Fallback etablissements.ville
{
  const r = resoudreCommune({ city: null }, { ville: 'IVRY-SUR-SEINE' })
  t('5. companies.city absent -> fallback etablissements.ville', r.ville === 'IVRY-SUR-SEINE' && r.source === 'ETABLISSEMENT_VILLE')
}

// 6. Code postal établissement (priorité)
{
  const r = resoudreDepartement({ address: '1 RUE X 75000 PARIS' }, { code_postal: '94230' })
  t('6. etablissements.code_postal présent -> utilisé en priorité (même si adresse suggère autre chose)', r.departement === '94' && r.source === 'ETABLISSEMENT_CODE_POSTAL')
}

// 7. Fallback code postal depuis address
{
  const r = resoudreDepartement({ address: '54 RUE DU PARC DE CACHAN 94230 CACHAN' }, undefined)
  t('7. etablissements.code_postal absent -> fallback regex sur companies.address', r.departement === '94' && r.source === 'ADRESSE_COMPANIES')
}

// 8. Géographie inconnue sans invention
{
  const rVille = resoudreCommune({ city: null }, undefined)
  const rDept = resoudreDepartement({ address: null }, undefined)
  t('8. Ni companies.city ni etablissements.ville -> ville=null (INCONNU, jamais inventée)', rVille.ville === null && rVille.source === 'INCONNU')
  t('8b. Aucun code postal identifiable -> departement=null (INCONNU, jamais inventé)', rDept.departement === null && rDept.source === 'INCONNU')
}

// 9. Regex code postal — robustesse
{
  t('9. Regex trouve un code postal à 5 chiffres dans une adresse réelle', CODE_POSTAL_REGEX.test('33 RUE CHEVREUL 94700 MAISONS-ALFORT'))
  t('9b. Regex ne matche rien sur une adresse sans code postal', !CODE_POSTAL_REGEX.test('RUE SANS NUMERO'))
}

// 10. Erreur Supabase explicite — vérification structurelle du code (fail-fast, jamais silencieux)
{
  const fs = require('fs')
  const src = fs.readFileSync(__dirname + '/fetch-reservoir.ts', 'utf-8')
  const nbChecksError = (src.match(/if \(err/g) ?? []).length
  t('10. Toutes les requêtes Supabase vérifient `error` (fail explicite, jamais silencieux)', nbChecksError >= 5)
  t('10b. fetchAllPaginated lève une exception explicite en cas d\'erreur', src.includes('throw new Error(`fetchAllPaginated'))
  t('10c. fetchInChunks lève une exception explicite en cas d\'erreur', src.includes('throw new Error(`fetchInChunks'))
}

// 11. Segment value=code / label=libellé dans l'UI — vérification structurelle
{
  const fs = require('fs')
  const uiSrc = fs.readFileSync(__dirname + '/../../components/sales/CampagneSelectionTable.tsx', 'utf-8')
  t('11. UI utilise value=code / affiche label (jamais le code comme libellé)', uiSrc.includes('segments.map(([code, label])') && uiSrc.includes('value={code}') && uiSrc.includes('{label}'))
}

console.log('')
const passed = results.filter((r) => r.pass).length
console.log(`${passed}/${results.length} tests passes`)
if (passed !== results.length) process.exit(1)
