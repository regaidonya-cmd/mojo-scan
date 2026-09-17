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
t('5. filtre potentiel', applyFilters(dataset, { ...EMPTY_FILTERS, potentiel: new Set(['FORT']) }).length === 5) // P0.7D-FIX.12 : STOP inclus (potentiel FORT par défaut)
// 6. Filtre température
t('6. filtre temperature CHAUD', applyFilters(dataset, { ...EMPTY_FILTERS, temperature: new Set(['CHAUD']) }).length === 1)
// 7. Filtre priorite
t('7. filtre priorite P3', applyFilters(dataset, { ...EMPTY_FILTERS, priorite: new Set(['P3']) }).length === 1)
// 8. Pipeline
t('8. filtre pipeline', applyFilters(dataset, { ...EMPTY_FILTERS, pipeline: new Set(['A_CONTACTER']) }).length === 5) // P0.7D-FIX.12 : STOP inclus (pipeline A_CONTACTER par défaut)
// 9. Combinaison de filtres
t(
  '9. combinaison filtres (ville + potentiel)',
  applyFilters(dataset, { ...EMPTY_FILTERS, ville: 'champs', potentiel: new Set(['FORT']) }).length === 2
)
// 10. Aucun resultat
t('10. aucun resultat', applyFilters(dataset, { ...EMPTY_FILTERS, search: 'zzz_inexistant' }).length === 0)
// 11. STOP exclu systematiquement
// 11. [P0.7D-FIX.12] STOP présent par défaut (comme "Tous"), mais peut être exclu par un filtre priorité explicite
t('11a. STOP present par defaut dans applyFilters (Tous)', applyFilters(dataset, EMPTY_FILTERS).some((v) => v.engine.priorite === 'STOP'))
t('11b. filtre priorite explicite (P2) exclut STOP normalement', !applyFilters(dataset, { ...EMPTY_FILTERS, priorite: new Set(['P2']) }).some((v) => v.engine.priorite === 'STOP'))
// 12. NBA correct (juste propagation, pas de recalcul)
t('12. NBA propage tel quel (pas recalcule en UI)', applyFilters(dataset, EMPTY_FILTERS).find((v) => v.companyId === 'c3')?.engine.nextBestAction.type === 'QUALIFY')
// 13. Ordre deterministe (tri par defaut) parmi les prospects actifs (P0.7D-FIX.12 : STOP prend desormais la 1ere place si present, donc on filtre explicitement pour isoler l'ordre P1/P2/P3 comme le ferait une vue active reelle)
{
  const actifs = applyFilters(dataset, EMPTY_FILTERS).filter((v) => v.engine.priorite !== 'STOP')
  const sorted = sortProspects(actifs, 'DEFAULT')
  t('13. ordre deterministe : P1 chaud devant P2/P3 (parmi les actifs)', sorted[0].companyId === 'c5')
}
// 13b. [P0.7D-FIX.12] STOP prend la 1ere place dans le tri par defaut si inclus (coherent avec PRIORITY_ORDER)
{
  const sorted = sortProspects(applyFilters(dataset, EMPTY_FILTERS), 'DEFAULT')
  t('13b. STOP en tete du tri par defaut quand present (comportement documente, pas un bug)', sorted[0].engine.priorite === 'STOP')
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
// 24. [P0.7D-FIX.12] applyFilters seul (sans quick view) : TERMINE et STOP tous deux presents desormais
{
  const r = applyFilters(datasetTermine, EMPTY_FILTERS)
  t('24. applyFilters brut : TERMINE present', r.some((v) => v.companyId === 'c6'))
  t('24. applyFilters brut : STOP desormais present aussi (FIX.12)', r.some((v) => v.engine.priorite === 'STOP'))
}

// ── P0.7D-FIX.12 : STOP visible dans Tous, exclu des vues actives ──
// datasetTermine contient c4 (STOP) et c6 (TERMINE), déjà définis ci-dessus.
t('25. Tous contient STOP', QUICK_VIEWS.find((q) => q.id === 'TOUS')!.apply(datasetTermine).some((v) => v.companyId === 'c4'))
t('26. Tous contient TERMINE', QUICK_VIEWS.find((q) => q.id === 'TOUS')!.apply(datasetTermine).some((v) => v.companyId === 'c6'))
t('27. recherche SIREN retrouve STOP', applyFilters(datasetTermine, { ...EMPTY_FILTERS, search: datasetTermine.find((v) => v.companyId === 'c4')!.siren }).some((v) => v.companyId === 'c4'))
t('28. Ready exclut STOP', !QUICK_VIEWS.find((q) => q.id === 'READY')!.apply(datasetTermine).some((v) => v.companyId === 'c4'))
t('29. Chauds exclut STOP et TERMINE', (() => {
  const r = QUICK_VIEWS.find((q) => q.id === 'CHAUDS')!.apply(datasetTermine)
  return !r.some((v) => v.companyId === 'c4') && !r.some((v) => v.companyId === 'c6')
})())
t('30. A_PREPARER exclut STOP et TERMINE', (() => {
  const r = QUICK_VIEWS.find((q) => q.id === 'A_PREPARER')!.apply(datasetTermine)
  return !r.some((v) => v.companyId === 'c4') && !r.some((v) => v.companyId === 'c6')
})())
t('31. A_RELANCER exclut STOP et TERMINE', (() => {
  const r = QUICK_VIEWS.find((q) => q.id === 'A_RELANCER')!.apply(datasetTermine)
  return !r.some((v) => v.companyId === 'c4') && !r.some((v) => v.companyId === 'c6')
})())
t('32. Tous + aucun filtre = tout le dataset (7 elements : 5 base + STOP + TERMINE)', QUICK_VIEWS.find((q) => q.id === 'TOUS')!.apply(datasetTermine).length === datasetTermine.length)
t('33. applyFilters brut (sans quick view) inclut desormais aussi STOP', applyFilters(datasetTermine, EMPTY_FILTERS).some((v) => v.companyId === 'c4'))

console.log('')
const passed = results.filter((r) => r.pass).length
console.log(`${passed}/${results.length} tests passes`)
if (passed !== results.length) process.exit(1)
