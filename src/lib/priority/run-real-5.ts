import { evaluateProspect } from './engine'
import type { ProspectInput } from './types'

const NOW = new Date().toISOString()

const prospects: ProspectInput[] = [
  {
    companyId: 'd616cec5-62d4-4d80-85e1-616fa1a8e8e5',
    companyName: 'BATIMO CONSEIL',
    fitCible: 'CIBLE',
    preuveMetier: 'CONFIRME',
    proximiteLocale: true, // Cachan (94230)
    pipelineStage: 'A_CONTACTER',
    contactMethods: [
      { contactMethodId: 'a1cf45fb-c2a3-407d-937c-11b118a68622', type: 'email', value: 'contact@batimoconseil.fr', personneId: '3a7a7b65-23f2-4493-a539-a7d5269fbbb0', personneNom: 'SUREL', personnePrenom: 'OLIVIER', nominatif: true, allowed: true },
      { contactMethodId: '1e3a49a9-606f-4fd0-9579-473cbcbe98a2', type: 'telephone', value: '0143501000', personneId: '3a7a7b65-23f2-4493-a539-a7d5269fbbb0', personneNom: 'SUREL', personnePrenom: 'OLIVIER', nominatif: true, allowed: true },
    ],
    hasReliableAngle: true,
    angleSource: 'Site FOUND crawlé — SIREN imprimé sur la page (TVA), CTA/formulaire confirmés',
    globalOppositionActive: false,
    isLostDefinitive: false,
    isWon: false,
    events: [],
    now: NOW,
  },
  {
    companyId: 'e5a34ade-bb75-4034-93b7-e97bdb472d89',
    companyName: 'ACAPA',
    fitCible: 'CIBLE',
    preuveMetier: 'CONFIRME',
    proximiteLocale: true, // Saint-Maur-des-Fossés (94100)
    pipelineStage: 'A_CONTACTER',
    contactMethods: [
      { contactMethodId: '06908e56-c46b-49fa-b2bd-e9d9132caff0', type: 'email', value: 'l.martin@acapa.fr', personneId: '64b71082-2b59-4e7b-b198-cdabe6bde015', personneNom: 'MARTIN', personnePrenom: 'LAURENT', nominatif: true, allowed: true },
      { contactMethodId: '0ac8e94a-5e2c-4eb5-b2c1-40571e5f54ee', type: 'telephone', value: '0607077963', personneId: '64b71082-2b59-4e7b-b198-cdabe6bde015', personneNom: 'MARTIN', personnePrenom: 'LAURENT', nominatif: true, allowed: true },
      { contactMethodId: 'e4f77f1e-f443-49e6-8fb2-78f878798edd', type: 'email', value: 'jb.pelaez@acapa.fr', personneId: 'abb70d65-e889-4169-9bd8-306764d89e4c', personneNom: 'PELAEZ', personnePrenom: 'JEAN BAPTISTE', nominatif: true, allowed: true },
      { contactMethodId: 'd6bda67c-aa26-4d69-93ab-6d5042f1d607', type: 'telephone', value: '0674561510', personneId: 'abb70d65-e889-4169-9bd8-306764d89e4c', personneNom: 'PELAEZ', personnePrenom: 'JEAN BAPTISTE', nominatif: true, allowed: true },
    ],
    hasReliableAngle: true,
    angleSource: 'Site FOUND identifié via LinkedIn officiel (SIREN+adresse concordants), non crawlé (robots.txt)',
    globalOppositionActive: false,
    isLostDefinitive: false,
    isWon: false,
    events: [],
    now: NOW,
  },
  {
    companyId: '2380ed1a-26a0-4974-8504-b29c5dbbbc2a',
    companyName: 'DIAGADOM',
    fitCible: 'CIBLE',
    preuveMetier: 'CONFIRME',
    proximiteLocale: true, // Chelles (77500)
    pipelineStage: 'A_CONTACTER',
    contactMethods: [
      { contactMethodId: 'afdb9da5-5883-41ac-8e20-5d2aade9211e', type: 'email', value: 'remi_cerceau@yahoo.fr', personneId: '732190ea-01b3-4b53-baaf-a667bb84e9d7', personneNom: 'CERCEAU', personnePrenom: 'REMI', nominatif: true, allowed: true },
      { contactMethodId: '5cd27576-c48f-4fc0-9f50-3ea40ed2c4ca', type: 'telephone', value: '0630658626', personneId: '732190ea-01b3-4b53-baaf-a667bb84e9d7', personneNom: 'CERCEAU', personnePrenom: 'REMI', nominatif: true, allowed: true },
      { contactMethodId: '28e2eee5-0ea7-46be-ab3d-8d01aec2be6f', type: 'email', value: 'yann.chapus@diagadom.com', personneId: 'c15e9d3a-c76f-46d9-8e33-0538746b757a', personneNom: 'CHAPUS', personnePrenom: 'YANN', nominatif: true, allowed: true },
      { contactMethodId: 'b5d7cd4c-bff5-4560-b738-748dae608c46', type: 'email', value: 'mazlum.eren@diagadom.com', personneId: 'c70c04d1-0ea3-4f11-8686-f72530ce89de', personneNom: 'EREN', personnePrenom: 'MAZLUM', nominatif: true, allowed: true },
      { contactMethodId: 'a90b98a3-ff5b-4565-abd3-b55fe81240f9', type: 'telephone', value: '0788795913', personneId: 'c70c04d1-0ea3-4f11-8686-f72530ce89de', personneNom: 'EREN', personnePrenom: 'MAZLUM', nominatif: true, allowed: true },
      { contactMethodId: '7f8f571d-2742-45bd-a1f4-f8a1871c8514', type: 'email', value: 'ali.kurt@diagadom.com', personneId: '16ab0dfd-1f13-4a7f-8cfb-8eda4bb9d358', personneNom: 'KURT', personnePrenom: 'ALI AYKUT', nominatif: true, allowed: true },
      { contactMethodId: '648b6c1c-5bd5-4270-970c-7e3aec5785e8', type: 'telephone', value: '0786939816', personneId: '16ab0dfd-1f13-4a7f-8cfb-8eda4bb9d358', personneNom: 'KURT', personnePrenom: 'ALI AYKUT', nominatif: true, allowed: true },
      { contactMethodId: 'dafe77b2-7b5e-440f-a81a-8df0422b95d4', type: 'email', value: 'iliana.laurent@diagadom.com', personneId: '0b871e5c-332b-42c6-90ce-2700dee941a9', personneNom: 'LAURENT', personnePrenom: 'ILIANA', nominatif: true, allowed: true },
      { contactMethodId: '85bb1c90-5f75-4cfe-b8c3-ca609f74146b', type: 'telephone', value: '0778356355', personneId: '0b871e5c-332b-42c6-90ce-2700dee941a9', personneNom: 'LAURENT', personnePrenom: 'ILIANA', nominatif: true, allowed: true },
      { contactMethodId: '61b934f4-d483-4b43-969a-206738ca2cca', type: 'email', value: 'dominik.pakuszewski@diagadom.com', personneId: '91ccd87c-6842-4140-a545-3e62ea35e69b', personneNom: 'PAKUSZEWSKI', personnePrenom: 'DOMINIK', nominatif: true, allowed: true },
      { contactMethodId: '165e34af-a593-4ae9-8253-0c84a6d1bf44', type: 'telephone', value: '0686658523', personneId: '91ccd87c-6842-4140-a545-3e62ea35e69b', personneNom: 'PAKUSZEWSKI', personnePrenom: 'DOMINIK', nominatif: true, allowed: true },
      { contactMethodId: '548bf86c-376c-4a4d-bc8e-c89972c0ef02', type: 'telephone', value: '0756944225', personneId: '91ccd87c-6842-4140-a545-3e62ea35e69b', personneNom: 'PAKUSZEWSKI', personnePrenom: 'DOMINIK', nominatif: true, allowed: true },
    ],
    hasReliableAngle: true,
    angleSource: 'Site FOUND identifié via plusieurs annuaires indépendants (SIREN exact), non crawlé (robots.txt)',
    globalOppositionActive: false,
    isLostDefinitive: false,
    isWon: false,
    events: [],
    now: NOW,
  },
  {
    companyId: 'ab82f9c0-4059-4b77-995d-753dd53bb00f',
    companyName: 'ARTWELL DIAGNOSTICS',
    fitCible: 'CIBLE',
    preuveMetier: 'CONFIRME',
    proximiteLocale: true, // Paris 75015
    pipelineStage: 'A_CONTACTER',
    contactMethods: [
      { contactMethodId: '6a879b26-add5-451e-93d6-7ffdb1396b11', type: 'email', value: 'contact@artwelldiagnostics.fr', personneId: 'a1b29a87-8a69-4232-9407-e5304c334c02', personneNom: 'MASSON', personnePrenom: 'ANTOINE', nominatif: true, allowed: true },
      { contactMethodId: '706599ab-d78a-45a9-8303-fe9e73a44b7a', type: 'telephone', value: '0142246550', personneId: 'a1b29a87-8a69-4232-9407-e5304c334c02', personneNom: 'MASSON', personnePrenom: 'ANTOINE', nominatif: true, allowed: true },
      { contactMethodId: '8e1861d8-c391-43bf-b222-61327d63080a', type: 'telephone', value: '0613369369', personneId: 'a1b29a87-8a69-4232-9407-e5304c334c02', personneNom: 'MASSON', personnePrenom: 'ANTOINE', nominatif: true, allowed: true },
    ],
    hasReliableAngle: true,
    angleSource: "Site AMBIGUOUS (SIREN concordant mais adresse associée au domaine incohérente) — angle légitime : lever l'ambiguïté en direct",
    globalOppositionActive: false,
    isLostDefinitive: false,
    isWon: false,
    events: [],
    now: NOW,
  },
  {
    companyId: '3e053de8-7cb0-4deb-a0d4-021630f1b392',
    companyName: 'DVM DIAGNOSTIC',
    fitCible: 'CIBLE',
    preuveMetier: 'CONFIRME',
    proximiteLocale: true, // Saint-Mandé (94160)
    pipelineStage: 'A_CONTACTER',
    contactMethods: [
      { contactMethodId: '575dcebb-2bf3-4290-8e30-98f9cb7316de', type: 'email', value: 'laureatmickael@gmail.com', personneId: '2295666f-2a5b-4764-9611-933e23790d02', personneNom: 'LAUREAT', personnePrenom: 'MICKAEL', nominatif: true, allowed: true },
      { contactMethodId: 'ecd77414-5861-465c-a8a6-50b448abd418', type: 'telephone', value: '0664913127', personneId: '2295666f-2a5b-4764-9611-933e23790d02', personneNom: 'LAUREAT', personnePrenom: 'MICKAEL', nominatif: true, allowed: true },
    ],
    hasReliableAngle: true,
    angleSource: "Site NOT_FOUND (recherche effectuée) — angle légitime : « je n'ai pas identifié de site officiel avec les sources consultées »",
    globalOppositionActive: false,
    isLostDefinitive: false,
    isWon: false,
    events: [],
    now: NOW,
  },
]

console.log('=== RÉSULTATS RÉELS SUR LES 5 PROSPECTS (lecture seule, aucune écriture) ===\n')
const results = prospects.map(evaluateProspect)
for (const r of results) {
  console.log(`--- ${r.companyName} ---`)
  console.log(`POTENTIEL: ${r.potentiel} | TEMPERATURE: ${r.temperature} | CONTACTABLE: ${r.contactable} | READINESS: ${r.readiness} | PRIORITE: ${r.priorite} | SCORE: ${r.secondaryScore}`)
  console.log(`scoreBreakdown: ${r.scoreBreakdown.map((l) => `${l.label} +${l.delta}`).join(', ')}`)
  console.log(`NBA: ${r.nextBestAction.type} — ${r.nextBestAction.reason}`)
  console.log(`selectedContact: ${r.selectedContact ? `${r.selectedContact.type} ${r.selectedContact.value} (${r.selectedContact.nominatif ? 'nominatif' : 'générique'}) — ${r.selectedContact.reason}` : 'aucun'}`)
  console.log(`whyNow: ${r.whyNow.join(' | ')}`)
  console.log(`warnings: ${r.warnings.length ? r.warnings.join(' | ') : 'aucun'}`)
  console.log('')
}

// Classement "J'ai 1 heure : qui dois-je prospecter ?"
const priorityOrder = ['STOP', 'P0', 'P1', 'P2', 'P3', 'P4']
const sorted = [...results].sort((a, b) => {
  const pDiff = priorityOrder.indexOf(a.priorite) - priorityOrder.indexOf(b.priorite)
  if (pDiff !== 0) return pDiff
  if (b.secondaryScore !== a.secondaryScore) return b.secondaryScore - a.secondaryScore
  // tie-break : action directement exécutable (CALL/EMAIL) avant action nécessitant préparation (QUALIFY)
  const aDirect = a.nextBestAction.type === 'CALL' || a.nextBestAction.type === 'EMAIL' ? 0 : 1
  const bDirect = b.nextBestAction.type === 'CALL' || b.nextBestAction.type === 'EMAIL' ? 0 : 1
  if (aDirect !== bDirect) return aDirect - bDirect
  return a.companyName.localeCompare(b.companyName) // dernier recours, PAS un signal commercial
})

console.log('=== CLASSEMENT "J\'ai 1 heure : qui dois-je prospecter ?" ===')
sorted.forEach((r, i) => {
  console.log(`${i + 1}. ${r.companyName} — ${r.priorite}, score ${r.secondaryScore}, NBA ${r.nextBestAction.type}`)
})
