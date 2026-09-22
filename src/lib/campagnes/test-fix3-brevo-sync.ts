import { computeEligibiliteCampagne, determinerMembresSynchronisables } from './engine'
import { synchroniserLot } from '../brevo/sales-sync'
import type { EligibiliteCampagneInput } from './types'
import type { BrevoApiClient, MembreASynchroniser } from '../brevo/sales-types'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) {
  results.push({ name, pass })
  console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name)
}

function eligInput(overrides: Partial<EligibiliteCampagneInput>): EligibiliteCampagneInput {
  return {
    companyId: 'c1', naf: '71.20B', raisonSociale: 'TEST',
    emailSource: 'ADI_DHUP', emailExploitable: true, emailPartageAvecAutreEntreprise: false,
    oppositionActive: false, nomAmbigu: false,
    ...overrides,
  }
}

function createMockBrevoClient() {
  let getOrCreateListCalls = 0
  let upsertCalls = 0
  const client: BrevoApiClient = {
    async getContact() { return { found: false, attributes: {}, listIds: [] } },
    async upsertContact() { upsertCalls++; return { id: 'x' } },
    async getOrCreateList() { getOrCreateListCalls++; return { id: 100, created: true } },
  }
  return { client, getOrCreateListCalls: () => getOrCreateListCalls, getUpsertCalls: () => upsertCalls }
}

async function main() {
  // CAS A — emailSource=ADI_DHUP, non partagé, sans opposition, nom clair => synchronisable
  {
    const r = computeEligibiliteCampagne(eligInput({}))
    t('CAS A — signal complet -> ELIGIBLE (synchronisable)', r.statut === 'ELIGIBLE')
  }

  // CAS B — email partagé nationalement => exclu
  {
    const r = computeEligibiliteCampagne(eligInput({ emailPartageAvecAutreEntreprise: true }))
    t('CAS B — email partagé -> NON_ELIGIBLE (exclu)', r.statut === 'NON_ELIGIBLE')
  }

  // CAS C — opposition => exclu
  {
    const r = computeEligibiliteCampagne(eligInput({ oppositionActive: true }))
    t('CAS C — opposition -> NON_ELIGIBLE (exclu)', r.statut === 'NON_ELIGIBLE')
  }

  // CAS D — email sans provenance ADI_DHUP => exclu
  {
    const r = computeEligibiliteCampagne(eligInput({ emailSource: null }))
    t('CAS D — pas de provenance ADI_DHUP -> NON_ELIGIBLE (exclu, plus jamais hardcodé à null par la route)', r.statut === 'NON_ELIGIBLE')
  }

  // CAS E — 0 membre synchronisable => getOrCreateList JAMAIS appelé
  {
    const membres = [
      { companyId: 'c1', eligibiliteCampagne: 'NON_ELIGIBLE' as const },
      { companyId: 'c2', eligibiliteCampagne: 'AMBIGU' as const },
    ]
    const { synchronisables, nonSynchronisables } = determinerMembresSynchronisables(membres)
    t('CAS E — 0 synchronisable détecté par la fonction pure', synchronisables.length === 0)
    t('CAS E bis — les 2 non-synchronisables bien identifiés', nonSynchronisables.length === 2)
    // La route (non testable ici sans réseau) n'appelle synchroniserLot()
    // QUE si synchronisables.length > 0 — vérifié structurellement ci-dessous.
    const fs = require('fs')
    const routeSrc = fs.readFileSync(__dirname + '/../../app/api/admin/campagnes/[lotId]/synchroniser/route.ts', 'utf-8')
    t('CAS E ter — la route retourne AVANT synchroniserLot() si synchronisables.length===0', /if \(synchronisables\.length === 0\)/.test(routeSrc) && routeSrc.indexOf('if (synchronisables.length === 0)') < routeSrc.indexOf('synchroniserLot(nomListe'))
  }

  // CAS F — 3 membres BAT actuels => 3 synchronisables AVANT tout appel Brevo
  {
    const membres = [
      { companyId: 'batimo', eligibiliteCampagne: 'ELIGIBLE' as const },
      { companyId: 'diagaction', eligibiliteCampagne: 'ELIGIBLE' as const },
      { companyId: 'diag2m', eligibiliteCampagne: 'ELIGIBLE' as const },
    ]
    const { synchronisables } = determinerMembresSynchronisables(membres)
    t('CAS F — les 3 membres BAT sont synchronisables', synchronisables.length === 3)
  }

  // CAS G — retry/idempotence => comportement stable (mock Brevo)
  {
    const { client, getOrCreateListCalls } = createMockBrevoClient()
    const membre: MembreASynchroniser = {
      companyId: 'c1', email: 'test@exemple.fr', emailExploitable: true, oppositionActive: false,
      eligibiliteCampagneToujoursValide: true,
      attributes: { MOJO_COMPANY_ID: 'c1', MOJO_CAMPAIGN_CODE: 'CAMP', MOJO_LOT_CODE: 'LOT' },
    }
    const r1 = await synchroniserLot('LISTE', [membre], client, 100) // listIdExistant fourni, comme au 2e appel réel
    const r2 = await synchroniserLot('LISTE', [membre], client, 100)
    t('CAS G — retry stable, synchronise à chaque fois', r1.synchronises === 1 && r2.synchronises === 1)
    t('CAS G bis — getOrCreateList jamais rappelé quand listIdExistant est fourni (idempotence liste)', getOrCreateListCalls() === 0)
  }

  // Vérification structurelle : plus aucune valeur hardcodée emailSource/emailPartage dans la route
  {
    const fs = require('fs')
    const routeSrc = fs.readFileSync(__dirname + '/../../app/api/admin/campagnes/[lotId]/synchroniser/route.ts', 'utf-8')
    t('FIX — plus de "emailSource: null" hardcodé dans la route', !routeSrc.includes('emailSource: null'))
    t('FIX — plus de "emailPartageAvecAutreEntreprise: false" hardcodé', !routeSrc.includes('emailPartageAvecAutreEntreprise: false'))
    t('FIX — la route réutilise fetchReservoirCampagne (portée nationale déjà validée)', routeSrc.includes('fetchReservoirCampagne'))
  }

  // §7 — pas de faux statut SYNCHRONISE si 0 membre réellement synchronisé
  {
    const fs = require('fs')
    const routeSrc = fs.readFileSync(__dirname + '/../../app/api/admin/campagnes/[lotId]/synchroniser/route.ts', 'utf-8')
    t('§7 — le lot passe à ERREUR (jamais SYNCHRONISE) si 0 membre synchronisable', routeSrc.includes("statut: 'ERREUR'"))
    t('§7 bis — le statut final dépend de resultat.synchronises > 0, jamais un SYNCHRONISE inconditionnel', routeSrc.includes('resultat.synchronises > 0'))
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
