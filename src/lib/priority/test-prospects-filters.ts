import { applyFilters, sortProspects, QUICK_VIEWS, EMPTY_FILTERS } from './prospects-filters'
import type { ProspectViewModel } from './fetch-real'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) {
  results.push({ name, pass })
  console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name)
}

function vm(overrides: Partial<ProspectViewModel>): ProspectViewModel {
  return {
    companyId: 'c1', companyName: 'CENTRAL DIAG', siren: '829606821', naf: '7120B',
    pipelineStage: 'A_CONTACTER', ville: 'SAINT-MAUR-DES-FOSSES', distanceKm: 5,
    engine: {
      companyId: 'c1', companyName: 'CENTRAL DIAG', potentiel: 'FORT', temperature: 'FROID', contactable: true,
      readiness: true, priorite: 'P2', secondaryScore: 9, scoreBreakdown: [],
      nextBestAction: { type: 'CALL', reason: 'x' }, selectedContact: null, whyNow: [], warnings: [],
    } as any,
    business: { contactabilite: 'BONNE', connaissance: 'BONNE', armement: 'PRET', ready: true, faitPrincipal: null, raisonMaintenant: 'x', raisonLabel: 'Pourquoi ce prospect ?', angleApproche: 'x', uiNba: 'CALL', displayNba: { type: 'CALL', dueAt: null, reason: '', source: 'STRUCTUREL' } },
    interlocuteur: { nom: 'LAKS', prenom: '', type: 'telephone', value: '0178541237' },
    telephoneAffichable: '0178541237',
    emailAffichable: null,
    persistedNextActionType: null,
    persistedNextActionDueAt: null,
    persistedNextActionReason: null,
    ...overrides,
  }
}

const dataset: ProspectViewModel[] = [
  vm({}),
  vm({ companyId: 'c2', companyName: 'AXM DIAG', siren: '977501477', ville: 'CHAMPS-SUR-MARNE', business: { ...vm({}).business, ready: true }, engine: { ...vm({}).engine, priorite: 'P2' } as any }),
  vm({ companyId: 'c3', companyName: 'DIAGALIS', siren: '890486962', ville: 'CHAMPS-SUR-MARNE', business: { ...vm({}).business, ready: false }, engine: { ...vm({}).engine, priorite: 'P3', temperature: 'FROID', nextBestAction: { type: 'QUALIFY', reason: 'x' } } as any }),
  vm({ companyId: 'c4', companyName: 'STOP CO', engine: { ...vm({}).engine, priorite: 'STOP' } as any }),
  vm({ companyId: 'c5', companyName: 'CHAUD SARL', engine: { ...vm({}).engine, priorite: 'P1', temperature: 'CHAUD' } as any }),
]

// Dataset dedie et isole pour les tests TERMINE (P0.7D-FIX.7) — ne modifie
// jamais le dataset partage ci-dessus (evite de casser les comptages fixes
// des tests 1-16 deja calibres dessus).
const datasetTermine: ProspectViewModel[] = [
  ...dataset,
  vm({ companyId: 'c6', companyName: 'PERDU SARL', siren: '111222333', pipelineStage: 'PERDU', engine: { ...vm({}).engine, priorite: 'TERMINE' } as any }),
]

// 1. Recherche entreprise
t('1. recherche entreprise (insensible casse)', applyFilters(dataset, { ...EMPTY_FILTERS, search: 'axm' }).length === 1)
// 2. Recherche ville
t('2. recherche ville', applyFilters(dataset, { ...EMPTY_FILTERS, search: 'champs-sur-marne' }).length === 2)
// 3. Filtre READY
t('3. filtre READY', applyFilters(dataset, { ...EMPTY_FILTERS, statut: 'READY' }).every((v) => v.business.ready))
// 4. Filtre A_PREPARER
t('4. filtre A_PREPARER', applyFilters(dataset, { ...EMPTY_FILTERS, statut: 'A_PREPARER' }).every((v) => !v.business.ready))
// 5. Filtre potentiel
t('5. filtre potentiel', applyFilters(dataset, { ...EMPTY_FILTERS, potentiel: new Set(['FORT']) }).length === 4) // STOP exclu d'office
// 6. Filtre température
t('6. filtre temperature CHAUD', applyFilters(dataset, { ...EMPTY_FILTERS, temperature: new Set(['CHAUD']) }).length === 1)
// 7. Filtre priorite
t('7. filtre priorite P3', applyFilters(dataset, { ...EMPTY_FILTERS, priorite: new Set(['P3']) }).length === 1)
// 8. Pipeline
t('8. filtre pipeline', applyFilters(dataset, { ...EMPTY_FILTERS, pipeline: new Set(['A_CONTACTER']) }).length === 4)
// 9. Combinaison de filtres
t(
  '9. combinaison filtres (ville + potentiel)',
  applyFilters(dataset, { ...EMPTY_FILTERS, ville: 'champs', potentiel: new Set(['FORT']) }).length === 2
)
// 10. Aucun resultat
t('10. aucun resultat', applyFilters(dataset, { ...EMPTY_FILTERS, search: 'zzz_inexistant' }).length === 0)
// 11. STOP exclu systematiquement
t('11. STOP toujours exclu', !applyFilters(dataset, EMPTY_FILTERS).some((v) => v.engine.priorite === 'STOP'))
// 12. NBA correct (juste propagation, pas de recalcul)
t('12. NBA propage tel quel (pas recalcule en UI)', applyFilters(dataset, EMPTY_FILTERS).find((v) => v.companyId === 'c3')?.engine.nextBestAction.type === 'QUALIFY')
// 13. Ordre deterministe (tri par defaut)
{
  const sorted = sortProspects(applyFilters(dataset, EMPTY_FILTERS), 'DEFAULT')
  t('13. ordre deterministe : P1 chaud devant P2/P3', sorted[0].companyId === 'c5')
}
// 14. Vues rapides : READY ne contient jamais STOP
t('14. vue rapide READY exclut STOP', !QUICK_VIEWS.find((q) => q.id === 'READY')!.apply(dataset).some((v) => v.engine.priorite === 'STOP'))
// 15. Vue A_RELANCER : aucun contenu simule si pas de FOLLOW_UP reel
t('15. vue A_RELANCER vide si aucun FOLLOW_UP reel (pas simule)', QUICK_VIEWS.find((q) => q.id === 'A_RELANCER')!.apply(dataset).length === 0)
// 16. Tri par entreprise
t('16. tri alphabetique par entreprise', sortProspects(dataset, 'ENTREPRISE')[0].companyName === 'AXM DIAG')

// 17. [P0.7D-FIX.7] TERMINE reste visible dans "Tous"
t('17. TERMINE visible dans vue Tous', QUICK_VIEWS.find((q) => q.id === 'TOUS')!.apply(datasetTermine).some((v) => v.companyId === 'c6'))
// 18. TERMINE exclu de READY
t('18. TERMINE exclu de la vue READY', !QUICK_VIEWS.find((q) => q.id === 'READY')!.apply(datasetTermine).some((v) => v.companyId === 'c6'))
// 19. TERMINE exclu de CHAUDS
t('19. TERMINE exclu de la vue CHAUDS', !QUICK_VIEWS.find((q) => q.id === 'CHAUDS')!.apply(datasetTermine).some((v) => v.companyId === 'c6'))
// 20. TERMINE exclu de A_PREPARER
t('20. TERMINE exclu de la vue A_PREPARER', !QUICK_VIEWS.find((q) => q.id === 'A_PREPARER')!.apply(datasetTermine).some((v) => v.companyId === 'c6'))
// 21. TERMINE exclu de A_RELANCER
t('21. TERMINE exclu de la vue A_RELANCER', !QUICK_VIEWS.find((q) => q.id === 'A_RELANCER')!.apply(datasetTermine).some((v) => v.companyId === 'c6'))
// 22. Recherche par SIREN retrouve TERMINE
t('22. recherche SIREN retrouve un prospect TERMINE', applyFilters(datasetTermine, { ...EMPTY_FILTERS, search: '111222333' }).some((v) => v.companyId === 'c6'))
// 23. Filtre Pipeline=PERDU retrouve TERMINE
t('23. filtre pipeline PERDU retrouve TERMINE', applyFilters(datasetTermine, { ...EMPTY_FILTERS, pipeline: new Set(['PERDU']) }).some((v) => v.companyId === 'c6'))
// 24. applyFilters seul (sans quick view) : TERMINE reste present, STOP absent
{
  const r = applyFilters(datasetTermine, EMPTY_FILTERS)
  t('24. applyFilters brut : TERMINE present', r.some((v) => v.companyId === 'c6'))
  t('24. applyFilters brut : STOP toujours absent', !r.some((v) => v.engine.priorite === 'STOP'))
}

console.log('')
const passed = results.filter((r) => r.pass).length
console.log(`${passed}/${results.length} tests passes`)
if (passed !== results.length) process.exit(1)
