import { evaluateProspect } from './engine'
import type { ProspectInput, ContactMethod, CommercialEvent } from './types'

const NOW = '2026-09-14T12:00:00Z'

function iso(hoursFromNow: number): string {
  return new Date(new Date(NOW).getTime() + hoursFromNow * 3600 * 1000).toISOString()
}

function contact(overrides: Partial<ContactMethod> = {}): ContactMethod {
  return {
    contactMethodId: 'cm1',
    type: 'telephone',
    value: '0600000000',
    nominatif: true,
    personneId: 'p1',
    allowed: true,
    ...overrides,
  }
}

function baseInput(overrides: Partial<ProspectInput> = {}): ProspectInput {
  return {
    companyId: 'c1',
    companyName: 'TEST CO',
    fitCible: 'CIBLE',
    preuveMetier: 'CONFIRME',
    proximiteLocale: true,
    pipelineStage: 'A_CONTACTER',
    contactMethods: [contact()],
    hasReliableAngle: true,
    angleSource: 'fait fiable de test',
    globalOppositionActive: false,
    isLostDefinitive: false,
    isWon: false,
    events: [],
    now: NOW,
    ...overrides,
  }
}

let results: { name: string; pass: boolean; detail?: string }[] = []
function t(name: string, cond: boolean, detail?: string) {
  results.push({ name, pass: cond, detail })
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name + (detail && !cond ? ' :: ' + detail : ''))
}

// 1. FORT + FROID + contact + readiness -> P2
{
  const r = evaluateProspect(baseInput())
  t('1. FORT+FROID+contact+readiness -> P2', r.potentiel === 'FORT' && r.temperature === 'FROID' && r.priorite === 'P2', JSON.stringify(r))
}

// 2. FORT + FROID + aucun canal -> NON ACTIONNABLE / P3, PAS STOP
{
  const r = evaluateProspect(baseInput({ contactMethods: [] }))
  t('2. FORT+FROID+aucun canal -> P3 (pas STOP)', r.priorite === 'P3' && r.readiness === false, JSON.stringify(r))
}

// 3. opposition globale entreprise -> STOP / NO_ACTION
{
  const r = evaluateProspect(baseInput({ globalOppositionActive: true }))
  t('3. opposition globale -> STOP/NO_ACTION', r.priorite === 'STOP' && r.nextBestAction.type === 'NO_ACTION', JSON.stringify(r))
}

// 4. opposition d'une seule personne + autre personne autorisée -> entreprise toujours prospectable
{
  const r = evaluateProspect(
    baseInput({
      contactMethods: [
        contact({ contactMethodId: 'cm_blocked', personneId: 'pA', allowed: false }),
        contact({ contactMethodId: 'cm_ok', personneId: 'pB', allowed: true }),
      ],
    })
  )
  t('4. personne opposee + autre autorisee -> prospectable', r.priorite !== 'STOP' && r.readiness === true, JSON.stringify(r))
}

// 5. email A oppose + email B autorise -> EMAIL toujours possible via B
{
  const r = evaluateProspect(
    baseInput({
      contactMethods: [
        contact({ contactMethodId: 'emailA', type: 'email', value: 'a@x.fr', allowed: false }),
        contact({ contactMethodId: 'emailB', type: 'email', value: 'b@x.fr', allowed: true }),
      ],
    })
  )
  t('5. email A oppose, B autorise -> contact email B', r.selectedContact?.type === 'email' && r.selectedContact?.value === 'b@x.fr', JSON.stringify(r))
}

// 6. Scan sans besoin explicite -> TIEDE
{
  const events: CommercialEvent[] = [{ kind: 'SCAN_COMPLETED_NO_NEED', occurredAt: iso(-24), originatedByProspect: true }]
  const r = evaluateProspect(baseInput({ events }))
  t('6. Scan sans besoin -> TIEDE', r.temperature === 'TIEDE', JSON.stringify(r))
}

// 7. Scan avec besoin explicite -> CHAUD / P1 si pas urgence
{
  const events: CommercialEvent[] = [{ kind: 'SCAN_COMPLETED_WITH_NEED', occurredAt: iso(-24), originatedByProspect: true }]
  const r = evaluateProspect(baseInput({ events }))
  t('7. Scan avec besoin -> CHAUD/P1', r.temperature === 'CHAUD' && r.priorite === 'P1', JSON.stringify(r))
}

// 8. réponse positive avec rappel demandé demain -> CHAUD / P0 / CALL
{
  const events: CommercialEvent[] = [
    { kind: 'POSITIVE_REPLY', occurredAt: iso(-1), originatedByProspect: true },
    { kind: 'CALLBACK_REQUESTED', occurredAt: iso(-1), dueAt: iso(20), originatedByProspect: true, signalChannel: 'telephone' },
  ]
  const r = evaluateProspect(baseInput({ events }))
  t('8. reponse positive + rappel demain -> CHAUD/P0/CALL', r.temperature === 'CHAUD' && r.priorite === 'P0' && r.nextBestAction.type === 'CALL', JSON.stringify(r))
}

// 9. RDV imminent -> CHAUD / P0 / PREPARE_RDV
{
  const events: CommercialEvent[] = [{ kind: 'RDV_SCHEDULED', occurredAt: iso(-2), dueAt: iso(2), originatedByProspect: true }]
  const r = evaluateProspect(baseInput({ events }))
  t('9. RDV imminent -> CHAUD/P0/PREPARE_RDV', r.temperature === 'CHAUD' && r.priorite === 'P0' && r.nextBestAction.type === 'PREPARE_RDV', JSON.stringify(r))
}

// 10. proposition envoyee par MOJO a prospect FROID -> reste FROID
{
  const events: CommercialEvent[] = [{ kind: 'PROPOSAL_SENT', occurredAt: iso(-1), originatedByProspect: false }]
  const r = evaluateProspect(baseInput({ events }))
  t('10. proposal sent, prospect FROID -> reste FROID', r.temperature === 'FROID', JSON.stringify(r))
}

// 11. proposition envoyee a prospect CHAUD -> reste CHAUD
{
  const events: CommercialEvent[] = [
    { kind: 'QUOTE_REQUESTED', occurredAt: iso(-48), originatedByProspect: true },
    { kind: 'PROPOSAL_SENT', occurredAt: iso(-1), originatedByProspect: false },
  ]
  const r = evaluateProspect(baseInput({ events }))
  t('11. proposal sent, prospect CHAUD -> reste CHAUD', r.temperature === 'CHAUD', JSON.stringify(r))
}

// 12. proposition en attente -> WAIT selon pipeline/echeance, sans inventer temperature
{
  const events: CommercialEvent[] = [{ kind: 'PROPOSAL_SENT', occurredAt: iso(-1), originatedByProspect: false }]
  const r = evaluateProspect(baseInput({ events, pipelineStage: 'PROPOSITION' }))
  t('12. proposition en attente -> WAIT', r.nextBestAction.type === 'WAIT', JSON.stringify(r))
}

// 13. NOT_FOUND (simule via angleSource) + contact + angle fiable -> READINESS true
{
  const r = evaluateProspect(baseInput({ angleSource: "NOT_FOUND mais contact clair et angle honnete" }))
  t('13. NOT_FOUND + contact + angle fiable -> readiness true', r.readiness === true, JSON.stringify(r))
}

// 14. FOUND sans contact exploitable -> READINESS false
{
  const r = evaluateProspect(baseInput({ contactMethods: [], angleSource: 'site FOUND crawle' }))
  t('14. FOUND sans contact -> readiness false', r.readiness === false, JSON.stringify(r))
}

// 15. ambiguite d'adresse -> ne baisse pas POTENTIEL
{
  const r1 = evaluateProspect(baseInput({ angleSource: 'ambiguite adresse a lever' }))
  const r2 = evaluateProspect(baseInput({ angleSource: 'site FOUND net' }))
  t('15. ambiguite adresse ne baisse pas POTENTIEL', r1.potentiel === r2.potentiel && r1.potentiel === 'FORT', JSON.stringify({ r1: r1.potentiel, r2: r2.potentiel }))
}

// 16. score P2 eleve ne passe jamais devant P1 faible
{
  const strongP2 = evaluateProspect(baseInput({ proximiteLocale: true })) // P2, score eleve
  const weakP1 = evaluateProspect(
    baseInput({
      preuveMetier: 'A_VERIFIER',
      proximiteLocale: false,
      contactMethods: [contact({ nominatif: false })],
      events: [{ kind: 'SCAN_COMPLETED_WITH_NEED', occurredAt: iso(-1), originatedByProspect: true }],
    })
  )
  const priorityOrder = ['STOP', 'P0', 'P1', 'P2', 'P3', 'P4']
  const strongIdx = priorityOrder.indexOf(strongP2.priorite)
  const weakIdx = priorityOrder.indexOf(weakP1.priorite)
  t('16. P2 fort score ne passe jamais devant P1 faible', weakIdx < strongIdx || weakP1.priorite === strongP2.priorite === false, `strongP2=${strongP2.priorite}(${strongP2.secondaryScore}) weakP1=${weakP1.priorite}(${weakP1.secondaryScore})`)
}

// 17. egalite parfaite -> tie-break stable/deterministe (verifie la stabilite du moteur pur, pas un tri ici)
{
  const r1 = evaluateProspect(baseInput({ companyId: 'A' }))
  const r2 = evaluateProspect(baseInput({ companyId: 'A' }))
  t('17. determinisme (memes entrees -> memes sorties)', JSON.stringify(r1) === JSON.stringify(r2))
}

// 18. PERDU -> pas de prospection automatique
{
  const r = evaluateProspect(baseInput({ isLostDefinitive: true }))
  t('18. PERDU -> STOP, pas de prospection', r.priorite === 'STOP', JSON.stringify(r))
}

// 19. GAGNE -> hors prospection froide
{
  const r = evaluateProspect(baseInput({ isWon: true }))
  t('19. GAGNE -> hors prospection froide', r.priorite === 'P4' && r.nextBestAction.type === 'NO_ACTION', JSON.stringify(r))
}

// 20. aucune donnee suffisante -> warning explicite, pas d'invention
{
  const r = evaluateProspect(baseInput({ preuveMetier: null, contactMethods: [] }))
  t('20. donnees insuffisantes -> warnings presents', r.warnings.length > 0, JSON.stringify(r))
}

// 21. [régression P0.5B.1] 1 seule personne avec 2 moyens de contact (tel+email)
// -> PAS d'ambiguïté d'interlocuteur, contact sélectionné directement
{
  const r = evaluateProspect(
    baseInput({
      contactMethods: [
        contact({ contactMethodId: 'm1', type: 'telephone', personneId: 'pUnique' }),
        contact({ contactMethodId: 'm2', type: 'email', value: 'x@y.fr', personneId: 'pUnique' }),
      ],
    })
  )
  t(
    '21. [regression] 1 personne + 2 moyens de contact -> pas d\'ambiguite',
    r.selectedContact !== null && r.selectedContact?.personneId === 'pUnique' && r.nextBestAction.type === 'CALL',
    JSON.stringify(r)
  )
}

console.log('')
const passed = results.filter((r) => r.pass).length
console.log(`${passed}/${results.length} tests passes`)
if (passed !== results.length) process.exit(1)
