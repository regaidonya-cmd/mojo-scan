import { classifyForMaJournee } from './ma-journee-sort'
import type { ProspectViewModel } from './fetch-real'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) {
  results.push({ name, pass })
  console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name)
}

function vm(overrides: Partial<ProspectViewModel>): ProspectViewModel {
  return {
    companyId: 'c',
    companyName: 'ZZZ',
    ville: null,
    distanceKm: null,
    engine: {
      companyId: 'c', companyName: 'ZZZ', potentiel: 'FORT', temperature: 'FROID', contactable: true,
      readiness: true, priorite: 'P2', secondaryScore: 9, scoreBreakdown: [],
      nextBestAction: { type: 'CALL', reason: 'x' }, selectedContact: null, whyNow: [], warnings: [],
    } as any,
    business: { contactabilite: 'BONNE', connaissance: 'BONNE', armement: 'PRET', ready: true, faitPrincipal: null, raisonMaintenant: 'x' },
    interlocuteur: null,
    ...overrides,
  }
}

// 17. Distance depart deux prospects strictement equivalents par ailleurs
{
  const a = vm({ companyId: 'a', companyName: 'B ENTREPRISE', distanceKm: 15 })
  const b = vm({ companyId: 'b', companyName: 'A ENTREPRISE', distanceKm: 3 })
  const { zoneBReady } = classifyForMaJournee([a, b])
  t('17. distance departage a egalite stricte (plus proche en premier)', zoneBReady[0].companyId === 'b')
}

// 18. Alphabetique seulement en dernier recours (aucune distance connue)
{
  const a = vm({ companyId: 'a', companyName: 'B ENTREPRISE', distanceKm: null })
  const b = vm({ companyId: 'b', companyName: 'A ENTREPRISE', distanceKm: null })
  const { zoneBReady } = classifyForMaJournee([a, b])
  t('18. alphabetique en dernier recours si distance inconnue', zoneBReady[0].companyId === 'b')
}

// 19. Distance ne prime jamais sur la priorite
{
  const a = vm({ companyId: 'a', companyName: 'A', distanceKm: 50, engine: { ...vm({}).engine, priorite: 'P2' } as any })
  const b = vm({ companyId: 'b', companyName: 'B', distanceKm: 1, engine: { ...vm({}).engine, priorite: 'P3' } as any, business: { ...vm({}).business, ready: false } })
  const { zoneBReady, aPreparer } = classifyForMaJournee([a, b])
  t('19. P2 loin passe devant P3 proche (priorite prime toujours)', zoneBReady[0]?.companyId === 'a' && aPreparer[0]?.companyId === 'b')
}

console.log('')
const passed = results.filter((r) => r.pass).length
console.log(`${passed}/${results.length} tests passes`)
if (passed !== results.length) process.exit(1)
