import { BAT_50 } from './bat-50-vsg'
import { enrichirBatch } from './orchestrateur'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

async function main() {
  {
    const dejaEnrichi = BAT_50.filter((e) => e.statut === 'DEJA_ENRICHI')
    const aInterroger = BAT_50.filter((e) => e.statut === 'A_INTERROGER')
    t('1. BAT_50 contient exactement 50 entrées', BAT_50.length === 50)
    t('1b. Exactement 10 DEJA_ENRICHI', dejaEnrichi.length === 10)
    t('1c. Exactement 40 A_INTERROGER', aInterroger.length === 40)
    t('1d. Aucun doublon de SIREN', new Set(BAT_50.map((e) => e.siren)).size === 50)
  }

  {
    const dejaConnus = ['889352886', '931188304', '509503777', '453757973', '966201717', '444928923', '542050315', '823882006', '883261752', '904898863']
    const dejaEnrichi = BAT_50.filter((e) => e.statut === 'DEJA_ENRICHI').map((e) => e.siren).sort()
    t('2. Les 10 DEJA_ENRICHI correspondent exactement aux 10 SIREN déjà interrogés', JSON.stringify(dejaEnrichi) === JSON.stringify([...dejaConnus].sort()))
  }

  {
    const autresActivites = BAT_50.filter((e) => e.secteur === 'Autres activités')
    t('3. Aucune entreprise "Autres activités" dans le BAT 50', autresActivites.length === 0)
  }

  {
    const blackHole = BAT_50.find((e) => e.raisonSociale === 'BLACK & HOLE')
    t('4. BLACK & HOLE reclassée "Services techniques & B2B" (plus Immobilier)', blackHole?.secteur === 'Services techniques & B2B')
    t('4b. Métier précis correct pour BLACK & HOLE', blackHole?.metierPrecis === 'Analyses, essais et inspections techniques')
  }

  // ENRICH.VSG.5C — CCPJJ (contrôle technique automobile) ne doit plus être classée Immobilier
  {
    const ccpjj = BAT_50.find((e) => e.raisonSociale === 'CCPJJ')
    t('4c. CCPJJ reclassée "Automobile & auto-écoles" (plus Immobilier)', ccpjj?.secteur === 'Automobile & auto-écoles')
    t('4d. Métier précis correct pour CCPJJ', ccpjj?.metierPrecis === 'Contrôle technique automobile')
    t('4e. CCPJJ reste DEJA_ENRICHI (statut non modifié par cette correction)', ccpjj?.statut === 'DEJA_ENRICHI')
  }

  {
    const mockClient: any = {
      textSearch: async () => [],
      placeDetails: async () => ({ telephone: null, siteWeb: null, googleMapsUri: null }),
    }
    const aInterroger = BAT_50.filter((e) => e.statut === 'A_INTERROGER')
    const { nbTextSearch } = await enrichirBatch(aInterroger, async () => null, mockClient, 40, 40, 40)
    t('5. enrichirBatch appelé uniquement sur les 40 A_INTERROGER -> 40 Text Search exactement', nbTextSearch === 40)
  }

  // Hard-stop AVANT chaque appel — vérifié réellement avec une limite artificiellement basse
  {
    let appels = 0
    const mockClient: any = {
      textSearch: async () => { appels++; return [] },
      placeDetails: async () => ({ telephone: null, siteWeb: null, googleMapsUri: null }),
    }
    const aInterroger = BAT_50.filter((e) => e.statut === 'A_INTERROGER')
    try {
      await enrichirBatch(aInterroger, async () => null, mockClient, 40, 5, 40) // limite Text Search artificiellement à 5
      t('6. FAIL attendu', false)
    } catch (e: any) {
      t('6. Hard-stop déclenché avant le 6e appel (limite=5)', appels === 5 && e.message.includes('limite=5'))
    }
  }

  {
    const fs = require('fs')
    const routeSrc = fs.readFileSync(__dirname + '/../../app/api/admin/test-enrichissement-vsg-bat50/route.ts', 'utf-8')
    t('7. La route appelle enrichirBatch(aInterroger, ...) et non BAT_50 entier', /enrichirBatch\(\s*aInterroger/.test(routeSrc))
    t('7b. dejaEnrichi jamais transmis à enrichirBatch', routeSrc.includes('const dejaEnrichi = BAT_50.filter') && !/enrichirBatch\([^)]*dejaEnrichi/.test(routeSrc))
    t('7c. LIMITE_TEXT_SEARCH_BAT50 = 40, sous le plafond Google (50/jour)', routeSrc.includes('LIMITE_TEXT_SEARCH_BAT50 = 40'))
    t('8. admin_auth vérifié', routeSrc.includes('admin_auth') && routeSrc.includes('status: 401'))
    t('8b. Seul POST exporté', routeSrc.includes('export async function POST') && !routeSrc.includes('export async function GET'))
    t('8c. Aucune lecture du body HTTP', !routeSrc.includes('req.json()') && !routeSrc.includes('request.json()'))
    t('8d. Aucun client Supabase importé', !routeSrc.includes('createClient') && !routeSrc.includes('supabase'))
    t('8e. Aucune référence Brevo', !/brevo/i.test(routeSrc))
    const secretJamaisExpose = !/NextResponse\.json\([^)]*process\.env\.GOOGLE_PLACES_API_KEY[^)]*\)/.test(routeSrc.replace(/\n/g, ' '))
    t('8f. Clé jamais interpolée dans une réponse', secretJamaisExpose)
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
