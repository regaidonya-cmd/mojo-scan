import { evaluateProspect } from './engine'
import { evaluateBusinessModel, FaitCommercial } from './business-model'
import { classifyForMaJournee } from './ma-journee-sort'
import type { ProspectInput, ContactMethod } from './types'
import fs from 'node:fs'

const raw = JSON.parse(fs.readFileSync('/home/claude/p05b1/data66.json', 'utf-8'))
const NOW = new Date().toISOString()

const FAIT_MAP: Record<string, { sens: 'UTILISABLE_DANS_ACCROCHE' | 'CONTEXTE_INTERNE' | 'A_VERIFIER'; texte: string }> = {
  '445106677': { sens: 'UTILISABLE_DANS_ACCROCHE', texte: 'Site FOUND crawle - SIREN imprime sur la page, CTA/formulaire confirmes' },
  '522727478': { sens: 'UTILISABLE_DANS_ACCROCHE', texte: 'Activite technique confirmee (infiltrometrie, thermographie RT2012)' },
  '829606821': { sens: 'UTILISABLE_DANS_ACCROCHE', texte: 'Dessert 4 departements voisins, note 5/5 sur 6 avis' },
  '920589868': { sens: 'UTILISABLE_DANS_ACCROCHE', texte: 'Rattache reseau Diagadom, specialisation Val-de-Marne' },
  '500502687': { sens: 'UTILISABLE_DANS_ACCROCHE', texte: 'Activite elargie (habitat, amenagement, renovation)' },
  '977501477': { sens: 'UTILISABLE_DANS_ACCROCHE', texte: 'Creation recente AXM ENERGIE (mars 2024), diversification' },
  '821714102': { sens: 'UTILISABLE_DANS_ACCROCHE', texte: 'Reservation en ligne, couverture Paris et Ile-de-France' },
  '452253974': { sens: 'A_VERIFIER', texte: 'Site AMBIGUOUS seul - adresse a confirmer' },
  '809399645': { sens: 'A_VERIFIER', texte: 'Statut actif/inactif contradictoire selon les sources' },
  '978117653': { sens: 'CONTEXTE_INTERNE', texte: 'Changement de direction et actionnariat le 09/10/2025' },
  '848750931': { sens: 'CONTEXTE_INTERNE', texte: 'Site + dirigeant + anciennete seuls (insuffisant)' },
}
function contact(id: string, type: 'telephone' | 'email', personneId: string): ContactMethod {
  return { contactMethodId: id, type, value: `(masqué)`, personneId, nominatif: true, allowed: true }
}

const results = raw.map((row: any) => {
  const methods: ContactMethod[] = []
  const single = row.nbPersonnes <= 1
  if (row.hasTelephone) methods.push(contact(`${row.companyId}-t`, 'telephone', single ? `${row.companyId}-p` : `${row.companyId}-p1`))
  if (row.hasEmail) methods.push(contact(`${row.companyId}-e`, 'email', single ? `${row.companyId}-p` : `${row.companyId}-p2`))

  const fm = FAIT_MAP[row.siren]
  const faits: FaitCommercial[] = fm ? [{ texte: fm.texte, sensibilite: fm.sens, source: 'P0.5B' }] : []
  const hasReliableAngle = faits.some((f) => f.sensibilite === 'UTILISABLE_DANS_ACCROCHE')

  const input: ProspectInput = {
    companyId: row.companyId,
    companyName: row.companyName,
    fitCible: row.fitCible,
    preuveMetier: row.preuveMetier,
    proximiteLocale: true,
    pipelineStage: 'A_CONTACTER',
    contactMethods: methods,
    hasReliableAngle,
    angleSource: hasReliableAngle ? faits[0].texte : '',
    globalOppositionActive: false,
    isLostDefinitive: false,
    isWon: false,
    events: [],
    now: NOW,
  }
  const engine = evaluateProspect(input)
  const business = evaluateBusinessModel(input, engine, faits)
  const interlocuteur = business.contactabilite === 'BONNE' && engine.selectedContact
    ? { nom: '', prenom: '', type: engine.selectedContact.type, value: engine.selectedContact.value }
    : null
  return { companyId: row.companyId, companyName: row.companyName, ville: row.ville ?? null, engine, business, interlocuteur }
})

const classification = classifyForMaJournee(results as any)

console.log('=== ZONE A (P0/P1 réels) ===', classification.zoneA.length)
console.log('=== ZONE B READY ===', classification.zoneBReady.length)
console.log('=== A PREPARER (NOT READY) ===', classification.aPreparer.length)
console.log('total classé:', classification.zoneA.length + classification.zoneBReady.length + classification.aPreparer.length, '/ 66')

console.log('\n=== 5 premiers Zone B ===')
classification.zoneBReady.slice(0, 5).forEach((v: any, i: number) =>
  console.log(`${i + 1}. ${v.companyName} — ${v.engine.priorite} score=${v.engine.secondaryScore} NBA=${v.engine.nextBestAction.type} raison="${v.business.raisonMaintenant}"`)
)

console.log('\n=== Répartition A préparer par NBA ===')
const byNba: Record<string, number> = {}
for (const v of classification.aPreparer as any[]) byNba[v.engine.nextBestAction.type] = (byNba[v.engine.nextBestAction.type] || 0) + 1
console.log(byNba)
