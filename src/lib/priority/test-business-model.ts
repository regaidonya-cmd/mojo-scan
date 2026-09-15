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
const faitUsable: FaitCommercial = { texte: 'Diversification récente', texteAffichable: 'Diversification récente', sensibilite: 'UTILISABLE_DANS_ACCROCHE', source: 'test' }
const faitInterne: FaitCommercial = { texte: 'Changement de direction', texteAffichable: 'Changement de direction', sensibilite: 'CONTEXTE_INTERNE', source: 'test' }
const faitAVerifier: FaitCommercial = { texte: 'Statut incertain', texteAffichable: 'Statut incertain', sensibilite: 'A_VERIFIER', source: 'test' }

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
  const faitAnciennete: FaitCommercial = { texte: 'Dirigeant + 18 ans ancienneté', texteAffichable: 'Dirigeant + 18 ans ancienneté', sensibilite: 'CONTEXTE_INTERNE', source: 'test' }
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

import { sanitizeFaitTexte, buildFaitCommercial } from './business-model'

// 17. P2 -> "Pourquoi ce prospect ?"
{
  const input = base()
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, [faitUsable])
  t('17. P2 -> raisonLabel = Pourquoi ce prospect ?', bm.raisonLabel === 'Pourquoi ce prospect ?')
}
// 18. P0/P1 avec signal temporel reel -> "Pourquoi maintenant ?"
{
  const input = base({ events: [{ kind: 'CALLBACK_REQUESTED', occurredAt: '2026-09-15T09:00:00Z', dueAt: '2026-09-15T12:00:00Z', originatedByProspect: true }] })
  const r = evaluateProspect(input)
  t('18. prerequis : priorite bien P0 pour ce cas', r.priorite === 'P0')
  const bm = evaluateBusinessModel(input, r, [faitUsable])
  t('18. P0 -> raisonLabel = Pourquoi maintenant ?', bm.raisonLabel === 'Pourquoi maintenant ?')
}
// 19. Aucune duplication Fait/Angle : angle != texte brut du fait
{
  const input = base()
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, [faitUsable])
  t('19. angle != texte du fait (pas de duplication)', bm.angleApproche !== faitUsable.texte)
}
// 20. CONTEXTE_INTERNE non expose comme argument commercial (sanitisation)
{
  const texteMixte = 'Marche public notifie avec Client Public, 5M EUR, duree 3 ans; changement de gouvernance le 01/01/2026 (Nouvel Actionnaire)'
  const affichable = sanitizeFaitTexte(texteMixte)
  t('20. sanitizeFaitTexte retire la portion gouvernance', !affichable.toLowerCase().includes('gouvernance'))
  t('20. sanitizeFaitTexte conserve le marche public', affichable.toLowerCase().includes('marche public'))
}
// 21. DIAGOBAH reel : marche public conserve, gouvernance absente de texteAffichable
{
  const texteDiagobah = 'Marche public notifie avec Paris Habitat, 12.3M EUR, duree 4 ans, notifie 06/10/2025; ouverture 3eme agence reseau en Val-de-Marne (coherence geographique/temporelle avec la creation de lentite en 07/2023); changement de gouvernance le 09/10/2025 (2L INVEST/SP MERCURY)'
  const affichable = sanitizeFaitTexte(texteDiagobah)
  t('21. DIAGOBAH : gouvernance absente du texte affichable', !affichable.toLowerCase().includes('gouvernance'))
  t('21. DIAGOBAH : marche public conserve', affichable.toLowerCase().includes('marche public'))
  t('21. DIAGOBAH : ouverture agence conservee', affichable.toLowerCase().includes('agence'))
}
// 22. Interlocuteur ambigu -> uiNba QUALIFY
{
  const input = base({ contactMethods: [contact({ contactMethodId: 'a', personneId: 'p1' }), contact({ contactMethodId: 'b', personneId: 'p2' })] })
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, [faitUsable])
  t('22. interlocuteur ambigu -> uiNba QUALIFY', bm.uiNba === 'QUALIFY')
}
// 23. Contact clair + armement insuffisant -> uiNba ENRICH
{
  const input = base()
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, []) // aucun fait -> armement insuffisant
  t('23. contact clair + armement insuffisant -> ENRICH', bm.uiNba === 'ENRICH')
}
// 24. Contact clair + armement suffisant -> uiNba CALL (jamais ENRICH/QUALIFY force)
// hasReliableAngle aligné avec le fait fourni, comme le fait fetch-real.ts en production
{
  const input = base({ hasReliableAngle: true, angleSource: faitUsable.texte })
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, [faitUsable])
  t('24. contact clair + armement suffisant -> CALL, pas ENRICH', bm.uiNba === 'CALL')
}
// 25. READY existants non degrades : un fait utilisable seul reste suffisant pour READY
{
  const input = base()
  const r = evaluateProspect(input)
  const bm = evaluateBusinessModel(input, r, [faitUsable])
  t('25. READY non degrade par les changements FIX.2', bm.ready === true)
}

// 26. [FIX.3] Phrase UNIQUE sans ';' melangeant marche public reel ET
// gouvernance -> separation non fiable -> ne doit PAS etre expose comme
// UTILISABLE_DANS_ACCROCHE
{
  const texteMonophrase = "Marche public notifie avec un client public suite au changement de gouvernance recent de l'entreprise"
  const fait = buildFaitCommercial(texteMonophrase, 'test')
  t('26. mono-phrase ambigue -> retrogradee en CONTEXTE_INTERNE', fait.sensibilite === 'CONTEXTE_INTERNE')
  t('26. donnee brute conservee pour audit (texte inchange)', fait.texte === texteMonophrase)
}
// 27. [FIX.3] DIAGOBAH reel (avec ';') reste correctement exploitable
{
  const texteDiagobah = 'Marche public notifie avec Paris Habitat, 12.3M EUR, duree 4 ans, notifie 06/10/2025; ouverture 3eme agence reseau en Val-de-Marne (coherence geographique/temporelle avec la creation de lentite en 07/2023); changement de gouvernance le 09/10/2025 (2L INVEST/SP MERCURY)'
  const fait = buildFaitCommercial(texteDiagobah, 'test')
  t('27. DIAGOBAH (separation fiable via ;) reste UTILISABLE', fait.sensibilite === 'UTILISABLE_DANS_ACCROCHE')
  t('27. DIAGOBAH texteAffichable sans gouvernance', !fait.texteAffichable.toLowerCase().includes('gouvernance'))
  t('27. DIAGOBAH texteAffichable conserve le marche public', fait.texteAffichable.toLowerCase().includes('marche public'))
}
// 28. [FIX.3] Texte sain sans ';' et sans marqueur sensible -> reste exploitable
{
  const fait = buildFaitCommercial('Reservation en ligne disponible sur le site officiel', 'test')
  t('28. texte sain mono-phrase -> reste UTILISABLE', fait.sensibilite === 'UTILISABLE_DANS_ACCROCHE')
  t('28. texteAffichable = texte (rien a retirer)', fait.texteAffichable === 'Reservation en ligne disponible sur le site officiel')
}

console.log('')
const passed = results.filter((r) => r.pass).length
console.log(`${passed}/${results.length} tests passes`)
if (passed !== results.length) process.exit(1)
