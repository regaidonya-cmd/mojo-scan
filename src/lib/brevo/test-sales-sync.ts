import { mergeAttributesNonDestructif, synchroniserMembre, synchroniserLot } from './sales-sync'
import type { BrevoApiClient, BrevoContactSnapshot, MembreASynchroniser } from './sales-types'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) {
  results.push({ name, pass })
  console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name)
}

/** Mock Brevo en mémoire — simule fidèlement upsert/listes, AUCUN appel réseau. */
function createMockBrevoClient(seed?: { contacts?: Record<string, { attributes: Record<string, unknown>; listIds: number[] }>; lists?: Record<string, number> }) {
  const contacts = new Map<string, { attributes: Record<string, unknown>; listIds: number[] }>(Object.entries(seed?.contacts ?? {}))
  const lists = new Map<string, number>(Object.entries(seed?.lists ?? {}))
  let nextListId = 100
  let getContactCallCount = 0
  let createListCallCount = 0

  const client: BrevoApiClient = {
    async getContact(email) {
      getContactCallCount++
      const c = contacts.get(email)
      if (!c) return { found: false, attributes: {}, listIds: [] }
      return { found: true, id: email, attributes: c.attributes, listIds: c.listIds }
    },
    async upsertContact(email, attributes, listIds) {
      contacts.set(email, { attributes, listIds })
      return { id: email }
    },
    async getOrCreateList(name) {
      if (lists.has(name)) return { id: lists.get(name)!, created: false }
      createListCallCount++
      const id = nextListId++
      lists.set(name, id)
      return { id, created: true }
    },
  }
  return { client, contacts, lists, getCallCount: () => getContactCallCount, getCreateListCallCount: () => createListCallCount }
}

function membre(overrides: Partial<MembreASynchroniser>): MembreASynchroniser {
  return {
    companyId: 'c1', email: 'test@exemple.fr', emailExploitable: true, oppositionActive: false,
    eligibiliteCampagneToujoursValide: true,
    attributes: { MOJO_COMPANY_ID: 'c1', MOJO_CAMPAIGN_CODE: 'DIAG94', MOJO_LOT_CODE: 'BAT01', RAISON_SOCIALE: 'TEST SARL' },
    ...overrides,
  }
}

async function main() {
  // 1. Nouveau contact
  {
    const { client, contacts } = createMockBrevoClient()
    const r = await synchroniserMembre(membre({}), 100, client)
    t('1. Nouveau contact -> SYNCHRONISE', r.statut === 'SYNCHRONISE')
    t('1b. Contact créé avec les attributs MOJO', (contacts.get('test@exemple.fr')?.attributes as any)?.MOJO_COMPANY_ID === 'c1')
  }

  // 2. Contact Brevo existant (avec attributs Scan préexistants)
  {
    const { client, contacts } = createMockBrevoClient({
      contacts: { 'test@exemple.fr': { attributes: { PRENOM: 'Jean', SOURCE: 'mojo-scan' }, listIds: [5] } },
    })
    const r = await synchroniserMembre(membre({}), 100, client)
    t('2. Contact existant -> SYNCHRONISE', r.statut === 'SYNCHRONISE')
    const after = contacts.get('test@exemple.fr')!
    t('2b. Attribut Scan préexistant PRENOM conservé (merge non destructif)', (after.attributes as any).PRENOM === 'Jean')
    t('2c. Attribut Scan préexistant SOURCE conservé', (after.attributes as any).SOURCE === 'mojo-scan')
    t('2d. Nouvel attribut MOJO_COMPANY_ID ajouté', (after.attributes as any).MOJO_COMPANY_ID === 'c1')
  }

  // 3. Merge non destructif — fonction pure directement testée
  {
    const existing = { PRENOM: 'Jean', ENTREPRISE: 'Ancienne Boite', STATUT_PROSPECT: 'DIAGNOSTIC_COMPLETED' }
    const merged = mergeAttributesNonDestructif(existing, { MOJO_COMPANY_ID: 'c1', RAISON_SOCIALE: '' as any })
    t('3. Merge : attributs existants non MOJO conservés', merged.PRENOM === 'Jean' && merged.ENTREPRISE === 'Ancienne Boite' && merged.STATUT_PROSPECT === 'DIAGNOSTIC_COMPLETED')
  }

  // 4. Valeur vide n'écrase rien
  {
    const existing = { ENTREPRISE: 'Vraie Entreprise SARL' }
    const merged = mergeAttributesNonDestructif(existing, { RAISON_SOCIALE: '' as any, COMMUNE: null as any, DEPARTEMENT: undefined as any } as any)
    t('4. "" ne remplace jamais une valeur existante (et n\'ajoute rien de vide)', merged.RAISON_SOCIALE === undefined)
    t('4b. null/undefined jamais appliqués', merged.COMMUNE === undefined && merged.DEPARTEMENT === undefined)
    t('4c. Valeur existante intacte', merged.ENTREPRISE === 'Vraie Entreprise SARL')
  }

  // 5. Liste créée
  {
    const { client, getCreateListCallCount } = createMockBrevoClient()
    const r = await synchroniserLot('MOJO — DIAG94 — BAT01', [membre({})], client)
    t('5. Liste créée au premier appel', getCreateListCallCount() === 1)
    t('5b. brevoListId retourné', r.brevoListId !== null)
  }

  // 6. Liste existante réutilisée (idempotence liste)
  {
    const { client, getCreateListCallCount } = createMockBrevoClient({ lists: { 'MOJO — DIAG94 — BAT01': 42 } })
    const r = await synchroniserLot('MOJO — DIAG94 — BAT01', [membre({})], client)
    t('6. Liste existante réutilisée, jamais recréée', getCreateListCallCount() === 0)
    t('6b. brevoListId = celui existant (42)', r.brevoListId === 42)
  }

  // 7. Appartenance liste
  {
    const { client, contacts } = createMockBrevoClient()
    await synchroniserLot('MOJO — DIAG94 — BAT01', [membre({})], client)
    const c = contacts.get('test@exemple.fr')
    t('7. Contact ajouté à la liste', (c?.listIds ?? []).length > 0)
  }

  // 8. Retry (relance du même lot) — idempotent
  {
    const { client, contacts } = createMockBrevoClient({ lists: { 'MOJO — DIAG94 — BAT01': 42 } })
    const r1 = await synchroniserLot('MOJO — DIAG94 — BAT01', [membre({})], client, 42)
    const r2 = await synchroniserLot('MOJO — DIAG94 — BAT01', [membre({})], client, 42)
    t('8. Retry -> toujours SYNCHRONISE, jamais d\'erreur de doublon', r1.synchronises === 1 && r2.synchronises === 1)
    const c = contacts.get('test@exemple.fr')!
    t('8b. Un seul contact en mémoire (pas de doublon), une seule occurrence dans la liste', c.listIds.filter((id) => id === 42).length === 1)
  }

  // 9. Double clic (2 appels simultanés-like, séquentiels dans ce test)
  {
    const { client } = createMockBrevoClient({ lists: { L: 42 } })
    const [r1, r2] = await Promise.all([
      synchroniserLot('L', [membre({})], client, 42),
      synchroniserLot('L', [membre({})], client, 42),
    ])
    t('9. Double clic -> les deux appels réussissent sans état incohérent', r1.synchronises === 1 && r2.synchronises === 1)
  }

  // 10. Opposition apparue après création du lot -> EXCLU
  {
    const { client } = createMockBrevoClient()
    const r = await synchroniserMembre(membre({ oppositionActive: true }), 100, client)
    t('10. Opposition apparue depuis -> EXCLU (jamais synchronisé)', r.statut === 'EXCLU')
    t('10b. Raison explicite', r.raison !== null)
  }

  // 11. Email devenu invalide -> EXCLU
  {
    const { client } = createMockBrevoClient()
    const r = await synchroniserMembre(membre({ emailExploitable: false }), 100, client)
    t('11. Email devenu invalide -> EXCLU', r.statut === 'EXCLU')
  }

  // 11b. Éligibilité campagne plus valide -> EXCLU
  {
    const { client } = createMockBrevoClient()
    const r = await synchroniserMembre(membre({ eligibiliteCampagneToujoursValide: false }), 100, client)
    t('11b. Éligibilité recalculée invalide -> EXCLU', r.statut === 'EXCLU')
  }

  // 12. Erreur sur 1 contact sans corruption du reste
  {
    const { client } = createMockBrevoClient()
    const clientAvecErreur: BrevoApiClient = {
      ...client,
      upsertContact: async (email, attrs, listIds) => {
        if (email === 'erreur@exemple.fr') throw new Error('Panne Brevo simulée')
        return client.upsertContact(email, attrs, listIds)
      },
    }
    const r = await synchroniserLot('L2', [
      membre({ companyId: 'c1', email: 'ok1@exemple.fr' }),
      membre({ companyId: 'c2', email: 'erreur@exemple.fr' }),
      membre({ companyId: 'c3', email: 'ok2@exemple.fr' }),
    ], clientAvecErreur)
    t('12. 1 erreur -> les 2 autres restent SYNCHRONISE (aucune corruption du reste du lot)', r.synchronises === 2 && r.erreurs === 1)
  }

  // 13-14. Aucune campagne email créée, aucun email envoyé — vérification structurelle
  {
    const fs = require('fs')
    const src = fs.readFileSync(__dirname + '/sales-sync.ts', 'utf-8')
    t('13. Aucun appel à un endpoint d\'envoi de campagne/email dans sales-sync.ts', !src.includes('/v3/smtp/email') && !src.includes('/v3/emailCampaigns') && !/sendTransacEmail/i.test(src))
    t('14. Aucune fonction d\'envoi d\'email dans ce module (uniquement contacts/listes)', !/sendEmail|sendCampaign/i.test(src))
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
