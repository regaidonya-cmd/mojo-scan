import { evaluateProspect } from './engine'
import { evaluateBusinessModel, FaitCommercial } from './business-model'
import type { ProspectInput, ContactMethod } from './types'

const results: { name: string; pass: boolean; detail?: string }[] = []
function t(name: string, pass: boolean, detail?: string) {
  results.push({ name, pass, detail })
  console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name + (detail && !pass ? ` (${detail})` : ''))
}

function contact(overrides: Partial<ContactMethod>): ContactMethod {
  return { contactMethodId: 'c1', type: 'telephone', value: 'x', nominatif: true, personneId: 'p1', allowed: true, ...overrides }
}
function base(overrides: Partial<ProspectInput> = {}): ProspectInput {
  return {
    companyId: 'c', companyName: 'TEST', fitCible: 'CIBLE', preuveMetier: 'CONFIRME',
    proximiteLocale: true, pipelineStage: 'A_CONTACTER', contactMethods: [contact({})],
    hasReliableAngle: false, angleSource: '', globalOppositionActive: false,
    isLostDefinitive: false, isWon: false, events: [], now: '2026-09-15T10:00:00Z', ...overrides,
  }
}
const faitUsable: FaitCommercial = { texte: 'Diversification récente', sensibilite: 'UTILISABLE_DANS_ACCROCHE', source: 'test' }
const faitInterne: FaitCommercial = { texte: 'Changement de direction', sensibilite: 'CONTEXTE_INTERNE', source: 'test' }
const faitAVerifier: FaitCommercial = { texte: 'Statut incertain', sensibilite: 'A_VERIFIER', source: 'test' }

// 1. Opposition entreprise globale -> BLOQUEE
{
  const input = base({ globalOppositionActive: true })
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, [faitUsable])
  t('1. opposition globale -> BLOQUEE', bm.contactabilite === 'BLOQUEE')
}

// 2. Opposition personne (allowed=false sur toutes ses methodes) mais entreprise pas globalement opposee, aucune autre personne -> BLOQUEE (aucun canal)
{
  const input = base({ contactMethods: [contact({ allowed: false })] })
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, [faitUsable])
  t('2. tous canaux opposes -> BLOQUEE (pas INSUFFISANTE)', bm.contactabilite === 'BLOQUEE')
}

// 3. Aucun moyen de contact du tout (pas d'opposition) -> INSUFFISANTE
{
  const input = base({ contactMethods: [] })
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, [])
  t('3. aucun contact, pas opposition -> INSUFFISANTE', bm.contactabilite === 'INSUFFISANTE')
}

// 4. Email A oppose + Email B autorise -> PARTIELLE, pas BLOQUEE
{
  const input = base({
    contactMethods: [
      contact({ contactMethodId: 'a', type: 'email', value: 'a@x.fr', allowed: false }),
      contact({ contactMethodId: 'b', type: 'email', value: 'b@x.fr', allowed: true }),
    ],
  })
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, [faitUsable])
  t('4. email partiellement oppose -> PARTIELLE', bm.contactabilite === 'PARTIELLE')
}

// 5. Plusieurs interlocuteurs autorises, aucun critere -> PARTIELLE
{
  const input = base({
    contactMethods: [
      contact({ contactMethodId: 'a', personneId: 'p1' }),
      contact({ contactMethodId: 'b', personneId: 'p2' }),
    ],
  })
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, [faitUsable])
  t('5. plusieurs interlocuteurs -> PARTIELLE', bm.contactabilite === 'PARTIELLE')
}

// 6. Fait UTILISABLE_DANS_ACCROCHE + contact bon -> ARMEMENT PRET, READY true
{
  const input = base()
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, [faitUsable])
  t('6. fait utilisable + contact bon -> READY', bm.armement === 'PRET' && bm.ready === true)
}

// 7. Fait CONTEXTE_INTERNE seul -> ARMEMENT INSUFFISANT (cas DIAGOBAH)
{
  const input = base()
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, [faitInterne])
  t('7. fait contexte interne seul -> INSUFFISANT (pas READY)', bm.armement === 'INSUFFISANT' && bm.ready === false)
}

// 8. Fait A_VERIFIER seul -> ARMEMENT INSUFFISANT (cas DFG DIAG)
{
  const input = base()
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, [faitAVerifier])
  t('8. fait a verifier seul -> INSUFFISANT', bm.armement === 'INSUFFISANT' && bm.ready === false)
}

// 9. Aucun fait -> CONNAISSANCE FAIBLE, ARMEMENT INSUFFISANT (cas DIAGPROEVO revise : site+dirigeant+anciennete seuls ne comptent pas)
{
  const input = base()
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, [])
  t('9. aucun fait -> FAIBLE + INSUFFISANT', bm.connaissance === 'FAIBLE' && bm.armement === 'INSUFFISANT')
}

// 10. BLOQUEE -> jamais READY meme avec fait utilisable
{
  const input = base({ globalOppositionActive: true })
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, [faitUsable])
  t('10. BLOQUEE -> jamais READY', bm.ready === false)
}

import { classifySiteStatutOnly } from './business-model'

// 11. SITE FOUND seul -> pas de fait -> jamais READY
{
  t('11. classifySiteStatutOnly(FOUND) -> null (pas de fait)', classifySiteStatutOnly('FOUND') === null)
}
// 12. SITE AMBIGUOUS seul -> A_VERIFIER, pas UTILISABLE
{
  t('12. classifySiteStatutOnly(AMBIGUOUS) -> A_VERIFIER', classifySiteStatutOnly('AMBIGUOUS') === 'A_VERIFIER')
}
// 13. SITE NOT_FOUND seul -> pas de fait -> jamais READY
{
  t('13. classifySiteStatutOnly(NOT_FOUND) -> null (pas de fait)', classifySiteStatutOnly('NOT_FOUND') === null)
}
// 14. Ancienneté seule (simulée comme un fait CONTEXTE_INTERNE, jamais UTILISABLE) -> pas READY
{
  const input = base()
  const r = evaluateProspect(input)
  const faitAnciennete: FaitCommercial = { texte: 'Dirigeant + 18 ans ancienneté', sensibilite: 'CONTEXTE_INTERNE', source: 'test' }
  const bm = evaluateBusinessModel(input, r, [faitAnciennete])
  t('14. anciennete seule -> pas READY', bm.ready === false)
}
// 15. Opposition reelle -> BLOQUEE (deja couvert au test 1, reconfirme explicitement)
{
  const input = base({ contactMethods: [contact({ allowed: false })], globalOppositionActive: false })
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, [faitUsable])
  t('15. opposition reelle (tous canaux opposes) -> BLOQUEE', bm.contactabilite === 'BLOQUEE')
}
// 16. Absence de contact (pas opposition) -> INSUFFISANTE, jamais BLOQUEE
{
  const input = base({ contactMethods: [] })
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, [])
  t('16. absence de contact -> INSUFFISANTE (pas BLOQUEE)', bm.contactabilite === 'INSUFFISANTE')
}

console.log('')
const passed = results.filter((r) => r.pass).length
console.log(`${passed}/${results.length} tests passes`)
if (passed !== results.length) process.exit(1)
