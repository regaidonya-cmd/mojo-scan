import { deciderAccesSales, deciderAccesProspect, filtreAffectation, estUuid } from './acces-sdr'
import { traiterActiviteSdr, type DepsActiviteSdr, type ParamsRpcResultatAppel } from './activite-sdr'
import { fetchMaJourneeData, fetchSingleProspect } from '../priority/fetch-real'
import { construireContactMethods } from '../priority/contacts-prospect'
import { evaluateProspect } from '../priority/engine'
import { evaluateBusinessModel } from '../priority/business-model'
import type { Profil } from './auth-session'
import type { ProspectInput } from '../priority/types'

// ══════════════════════════════════════════════════════════════
// MOJO SALES — SDR / PR3 — Tests (aucun réseau, aucune base réelle).
// Lancer : npx tsx src/lib/sales/test-pr3-sdr.ts
// ══════════════════════════════════════════════════════════════

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

const SACHA = '0beb391e-6524-4ecb-8abd-b2139b98db4e'
const AUTRE_SDR = '22222222-2222-4222-8222-222222222222'
const ADMIN_ID = '11bf7250-fd59-46d8-bd71-c04e244e0bc5'
const CO_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' // portefeuille Sacha, téléphone entreprise
const CO_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' // portefeuille d'un autre SDR
const CO_P = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' // pilote, non affecté
const MOYEN_A = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const MOYEN_P = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const PERS_P = 'ffffffff-ffff-4fff-8fff-ffffffffffff'

function profil(o: Partial<Profil>): Profil {
  return { userId: SACHA, nom: 'Sacha Lair', role: 'SDR', actif: true, ...o }
}
const ADMIN = profil({ userId: ADMIN_ID, nom: 'Donya REGAI', role: 'ADMIN' })
const SDR = profil({})
const SDR_INACTIF = profil({ actif: false })

// ── Faux client Supabase (chaînable, filtre eq/in, journal des filtres) ──
function fauxClient(tables: Record<string, any[]>, journal: { table: string; op: string; col: string; val: any }[] = []) {
  return {
    from(table: string) {
      const filtres: [string, string, any][] = []
      const b: any = {
        select() { return b },
        order() { return b },
        eq(col: string, val: any) { filtres.push(['eq', col, val]); journal.push({ table, op: 'eq', col, val }); return b },
        in(col: string, val: any[]) { filtres.push(['in', col, val]); journal.push({ table, op: 'in', col, val }); return b },
        then(res: any, rej: any) {
          const rows = (tables[table] ?? []).filter((r) => filtres.every(([op, c, v]) => (op === 'eq' ? r[c] === v : v.includes(r[c]))))
          return Promise.resolve({ data: rows, error: null }).then(res, rej)
        },
      }
      return b
    },
  }
}

function donnees(opts: { oppositions?: any[]; sansActionPersistee?: boolean } = {}) {
  return {
    prospects_sales: [
      { company_id: CO_A, pipeline_stage: 'A_CONTACTER', temperature: null, next_action_type: opts.sansActionPersistee ? null : 'CALL', next_action_due_at: null, next_action_reason: opts.sansActionPersistee ? null : 'Portefeuille SDR PR3 — premier appel à réaliser', assigned_to: SACHA, besoin_identifie: null },
      { company_id: CO_B, pipeline_stage: 'A_CONTACTER', temperature: null, next_action_type: 'CALL', next_action_due_at: null, next_action_reason: 'Portefeuille SDR PR3 — premier appel à réaliser', assigned_to: AUTRE_SDR, besoin_identifie: null },
      { company_id: CO_P, pipeline_stage: 'A_CONTACTER', temperature: null, next_action_type: 'CALL', next_action_due_at: null, next_action_reason: 'Import pilote P0.3D', assigned_to: null, besoin_identifie: null },
    ],
    companies: [
      { id: CO_A, name: 'ENTREPRISE A', siren: '111111111', naf: '43.22A', city: null },
      { id: CO_B, name: 'ENTREPRISE B', siren: '222222222', naf: '56.10C', city: 'VSG' },
      { id: CO_P, name: 'PILOTE P', siren: '333333333', naf: '69.20Z', city: 'CRETEIL' },
    ],
    qualifications_courantes: [],
    etablissements: [
      { company_id: CO_A, ville: 'VILLENEUVE-SAINT-GEORGES', latitude: null, longitude: null, siege: false },
      { company_id: CO_P, ville: 'CRETEIL', latitude: 48.79, longitude: 2.45, siege: true },
    ],
    personnes: [{ id: PERS_P, company_id: CO_P, nom: 'DUPONT', prenom: 'Jean' }],
    personnes_moyens_contact: [
      { id: 'pmc-p', personne_id: PERS_P, company_id: null, moyen_contact_id: MOYEN_P, moyens_contact: { type: 'telephone', valeur_normalisee: '0611111111' } },
      { id: 'pmc-a', personne_id: null, company_id: CO_A, moyen_contact_id: MOYEN_A, moyens_contact: { type: 'telephone', valeur_normalisee: '0143000000' } },
    ],
    oppositions: (opts.oppositions ?? []).map((o) => ({ actif: true, ...o })),
    observations_entreprise: [],
    enrichissement_resultats: [
      { company_id: CO_A, site_web: 'https://entreprise-a.fr', email: 'contact@entreprise-a.fr' },
    ],
  }
}

// ── Faux deps de la route d'activité ──
function fauxDeps(o: {
  profil: Profil | null
  rpcData?: any
  rpcError?: string
}) {
  const appelsRpc: ParamsRpcResultatAppel[] = []
  const besoins: { companyId: string; besoin: string; restreindreA: string | null }[] = []
  const affectations: Record<string, string | null> = { [CO_A]: SACHA, [CO_B]: AUTRE_SDR, [CO_P]: null }
  const deps: DepsActiviteSdr = {
    profilCourant: async () => o.profil,
    lireAffectation: async (id) => (id in affectations ? { existe: true, assignedTo: affectations[id] } : { existe: false, assignedTo: null }),
    personneAppartient: async (pid, cid) => pid === PERS_P && cid === CO_P,
    moyenAppartient: async (mid, cid) => (mid === MOYEN_A && cid === CO_A) || (mid === MOYEN_P && cid === CO_P),
    appelerRpc: async (p) => { appelsRpc.push(p); return { data: o.rpcData ?? { activite_id: 'act-1', deja_existant: false, opposition_id: null }, error: o.rpcError ? { message: o.rpcError } : null } },
    enregistrerBesoin: async (companyId, besoin, restreindreA) => { besoins.push({ companyId, besoin, restreindreA }); return { error: null } },
    now: () => '2026-10-02T10:00:00.000Z',
  }
  return { deps, appelsRpc, besoins }
}

const CLE = '9b2c0a4e-1111-4222-8333-444455556666'

async function main() {
  const fs = require('fs')
  const path = require('path')
  const racine = path.join(__dirname, '..', '..', '..')
  const lire = (f: string) => fs.readFileSync(path.join(racine, f), 'utf-8')

  // ═════ 1. ACCÈS (fonctions pures) ═════
  t('1. ADMIN actif -> accès GLOBAL', deciderAccesSales(ADMIN).statut === 'AUTORISE' && (deciderAccesSales(ADMIN) as any).perimetre === 'GLOBAL')
  t('1b. ADMIN -> accès à un prospect affecté à un SDR', deciderAccesProspect(ADMIN, { existe: true, assignedTo: SACHA }).statut === 'AUTORISE')
  t('1c. ADMIN -> accès à un prospect non affecté (pilote)', deciderAccesProspect(ADMIN, { existe: true, assignedTo: null }).statut === 'AUTORISE')
  t('1d. ADMIN -> liste sans filtre assigned_to', filtreAffectation(deciderAccesSales(ADMIN)) === undefined)
  t('2. SDR propriétaire -> AUTORISE', deciderAccesProspect(SDR, { existe: true, assignedTo: SACHA }).statut === 'AUTORISE')
  t('3. SDR non propriétaire -> INTROUVABLE (404)', deciderAccesProspect(SDR, { existe: true, assignedTo: AUTRE_SDR }).statut === 'INTROUVABLE')
  t('3b. SDR sur prospect non affecté (pilote) -> INTROUVABLE', deciderAccesProspect(SDR, { existe: true, assignedTo: null }).statut === 'INTROUVABLE')
  t('3c. Prospect inexistant -> INTROUVABLE (même réponse qu\'hors portefeuille)', deciderAccesProspect(SDR, { existe: false, assignedTo: null }).statut === 'INTROUVABLE')
  t('4. SDR inactif -> NON_AUTORISE', deciderAccesSales(SDR_INACTIF).statut === 'NON_AUTORISE' && deciderAccesProspect(SDR_INACTIF, { existe: true, assignedTo: SACHA }).statut === 'NON_AUTORISE')
  t('4b. ADMIN inactif -> NON_AUTORISE', deciderAccesSales(profil({ role: 'ADMIN', actif: false })).statut === 'NON_AUTORISE')
  t('5. Sans session (cookie admin_auth seul) -> NON_AUTORISE', deciderAccesSales(null).statut === 'NON_AUTORISE' && deciderAccesProspect(null, { existe: true, assignedTo: null }).statut === 'NON_AUTORISE')
  t('6. Liste SDR -> filtre assigned_to = user_id', filtreAffectation(deciderAccesSales(SDR)) === SACHA)
  t('6b. estUuid rejette un companyId forgé non-UUID', !estUuid("x' or 1=1") && !estUuid('') && estUuid(CO_A))

  // ═════ 5bis. admin_auth jamais accepté côté SDR (structure) ═════
  {
    const fichiersSdr = [
      'src/lib/sales/acces-sdr.ts', 'src/lib/sales/activite-sdr.ts',
      'src/app/api/sdr/prospects/[companyId]/activite/route.ts',
      'src/app/sdr/prospects/page.tsx', 'src/app/sdr/prospects/[companyId]/page.tsx',
    ]
    const aucunLegacy = fichiersSdr.every((f) => {
      const c = lire(f)
      return !c.includes('adminAuthCookieValide(') && !c.includes('estAutoriseAdmin(') && !c.includes("get('admin_auth')")
    })
    t('5c. Aucune page/route SDR n\'accepte le cookie admin_auth comme identité', aucunLegacy)
    t('5d. Pages SDR : contrôle serveur avant lecture', lire('src/app/sdr/prospects/[companyId]/page.tsx').indexOf('autoriserAccesProspect(') < lire('src/app/sdr/prospects/[companyId]/page.tsx').indexOf('fetchSingleProspect(params'))
  }

  // ═════ 7. LISTE FILTRÉE DANS LA REQUÊTE ═════
  {
    const journal: any[] = []
    const liste = await fetchMaJourneeData({ assignedTo: SACHA }, fauxClient(donnees(), journal))
    t('7. Liste SDR : uniquement les prospects affectés (A seul)', liste.length === 1 && liste[0].companyId === CO_A)
    t('7b. Filtre assigned_to appliqué DANS la requête prospects_sales', journal.some((j) => j.table === 'prospects_sales' && j.op === 'eq' && j.col === 'assigned_to' && j.val === SACHA))
    t('7c. Aucune donnée d\'un autre portefeuille chargée (companies limité au portefeuille)',
      journal.filter((j) => j.table === 'companies' && j.op === 'in').every((j) => j.val.length === 1 && j.val[0] === CO_A))
    const listeAdmin = await fetchMaJourneeData({}, fauxClient(donnees()))
    t('7d. ADMIN : tous les prospects (3)', listeAdmin.length === 3)
    const listeVide = await fetchMaJourneeData({ assignedTo: '99999999-9999-4999-8999-999999999999' }, fauxClient(donnees()))
    t('7e. SDR sans portefeuille -> liste vide (fallback /sdr/attente)', listeVide.length === 0)
  }

  // ═════ 8. URL FORGÉE / FICHE CIBLÉE ═════
  {
    const journal: any[] = []
    const vm = await fetchSingleProspect(CO_A, fauxClient(donnees(), journal))
    t('8. fetchSingleProspect ciblé (filtre company_id dans la requête)', !!vm && journal.some((j) => j.table === 'prospects_sales' && j.op === 'in' && j.col === 'company_id' && j.val[0] === CO_A))
    const { deps, appelsRpc } = fauxDeps({ profil: SDR })
    const r = await traiterActiviteSdr(deps, CO_B, { resultat: 'PAS_DE_REPONSE', idempotencyKey: CLE })
    t('8b. URL forgée (prospect d\'un autre SDR) -> 404, RPC jamais appelée', r.status === 404 && appelsRpc.length === 0)
    const r2 = await traiterActiviteSdr(deps, CO_P, { resultat: 'PAS_DE_REPONSE', idempotencyKey: CLE })
    t('8c. URL forgée (pilote non affecté) -> 404', r2.status === 404 && appelsRpc.length === 0)
    const r3 = await traiterActiviteSdr(deps, 'pas-un-uuid', { resultat: 'PAS_DE_REPONSE', idempotencyKey: CLE })
    t('8d. companyId non-UUID -> 404', r3.status === 404)
    const { deps: d0, appelsRpc: a0 } = fauxDeps({ profil: null })
    const r4 = await traiterActiviteSdr(d0, CO_A, { resultat: 'PAS_DE_REPONSE', idempotencyKey: CLE })
    t('8e. Sans session (admin_auth seul) -> 401', r4.status === 401 && a0.length === 0)
    const { deps: dI, appelsRpc: aI } = fauxDeps({ profil: SDR_INACTIF })
    const r5 = await traiterActiviteSdr(dI, CO_A, { resultat: 'PAS_DE_REPONSE', idempotencyKey: CLE })
    t('8f. SDR inactif -> 401', r5.status === 401 && aI.length === 0)
    const { deps: dA, appelsRpc: aA } = fauxDeps({ profil: ADMIN })
    const r6 = await traiterActiviteSdr(dA, CO_B, { resultat: 'PAS_DE_REPONSE', idempotencyKey: CLE })
    t('8g. ADMIN -> peut enregistrer sur n\'importe quel prospect', r6.status === 200 && aA.length === 1)
  }

  // ═════ 9. TÉLÉPHONE ENTREPRISE NON NOMINATIF ═════
  {
    const [vm] = await fetchMaJourneeData({ assignedTo: SACHA }, fauxClient(donnees()))
    t('9. Téléphone entreprise visible', vm.telephoneAffichable === '0143000000')
    t('9b. Aucun interlocuteur inventé (interlocuteur=null)', vm.interlocuteur === null)
    t('9c. Contact sélectionné non nominatif, sans personneId, avec moyen_contact_id réel',
      vm.engine.selectedContact?.nominatif === false && vm.engine.selectedContact?.personneId === undefined && vm.engine.selectedContact?.contactMethodId === MOYEN_A)
    t('9d. Prochaine action affichée = CALL (action persistée PR3)', vm.business.displayNba.type === 'CALL' && vm.business.displayNba.source === 'PERSISTE')
    t('9e. Contactabilité BONNE, priorité active (pas STOP)', vm.business.contactabilite === 'BONNE' && vm.engine.priorite !== 'STOP')
    t('9f. Commune : repli sur établissement non-siège', vm.ville === 'VILLENEUVE-SAINT-GEORGES')
    t('9g. Site et email d\'enrichissement exposés (lecture seule)', vm.siteWeb === 'https://entreprise-a.fr' && vm.emailEnrichissement === 'contact@entreprise-a.fr')

    const [sansAction] = await fetchMaJourneeData({ assignedTo: SACHA }, fauxClient(donnees({ sansActionPersistee: true })))
    t('9h. Sans action persistée : reste contactable (ENRICH, pas NO_ACTION_TEMPORAIRE)',
      sansAction.engine.contactable && sansAction.business.displayNba.type === 'ENRICH')

    const [oppE] = await fetchMaJourneeData({ assignedTo: SACHA }, fauxClient(donnees({ oppositions: [{ company_id: CO_A, type: 'prospection_globale' }] })))
    t('9i. Opposition ENTREPRISE : téléphone masqué, STOP, email masqué', oppE.telephoneAffichable === null && oppE.engine.priorite === 'STOP' && oppE.emailEnrichissement === null)
    const [oppM] = await fetchMaJourneeData({ assignedTo: SACHA }, fauxClient(donnees({ oppositions: [{ moyen_contact_id: MOYEN_A, type: 'telephone' }] })))
    t('9j. Opposition MOYEN sur le standard : téléphone masqué, ENRICH (pas STOP)', oppM.telephoneAffichable === null && oppM.business.displayNba.type === 'ENRICH' && oppM.engine.priorite !== 'STOP')
    const [oppC] = await fetchMaJourneeData({ assignedTo: SACHA }, fauxClient(donnees({ oppositions: [{ company_id: CO_A, type: 'telephone' }] })))
    t('9k. Opposition canal téléphone entreprise : téléphone masqué', oppC.telephoneAffichable === null)

    // Pilote (contact nominatif) : comportement historique inchangé.
    const pilote = (await fetchMaJourneeData({}, fauxClient(donnees()))).find((v) => v.companyId === CO_P)!
    t('9l. Pilote : contact nominatif inchangé (interlocuteur Jean DUPONT)', pilote.interlocuteur?.prenom === 'Jean' && pilote.interlocuteur?.nom === 'DUPONT' && pilote.engine.selectedContact?.nominatif === true)
    t('9m. Pilote : leftover "Import pilote P0.3D" toujours ignoré', pilote.business.displayNba.source === 'STRUCTUREL')

    // Construction pure : pas de doublon personne/entreprise pour un même moyen.
    const cms = construireContactMethods({
      companyId: CO_A,
      personnes: [{ id: PERS_P, nom: 'X', prenom: 'Y' }],
      contactsParPersonne: new Map([[PERS_P, [{ moyen_contact_id: MOYEN_A, moyens_contact: { type: 'telephone', valeur_normalisee: '0143000000' } }]]]),
      contactsEntreprise: [{ moyen_contact_id: MOYEN_A, moyens_contact: [{ type: 'telephone', valeur_normalisee: '0143000000' }] }],
      oppositions: { entrepriseGlobale: new Set(), personneGlobale: new Set(), moyen: new Set(), canalEntreprise: new Map() },
    })
    t('9n. Moyen présent via personne ET entreprise -> une seule entrée (nominative)', cms.length === 1 && cms[0].nominatif === true)

    // Moteur pur : contact générique seul + action CALL persistée.
    const input: ProspectInput = {
      companyId: CO_A, companyName: 'A', fitCible: 'INCONNU', preuveMetier: 'A_VERIFIER', proximiteLocale: true,
      pipelineStage: 'A_CONTACTER',
      contactMethods: [{ contactMethodId: MOYEN_A, type: 'telephone', value: '0143000000', nominatif: false, allowed: true }],
      hasReliableAngle: false, globalOppositionActive: false, isLostDefinitive: false, isWon: false, events: [],
      persistedTemperature: null,
      persistedNextAction: { type: 'CALL', dueAt: null, reason: 'Portefeuille SDR PR3 — premier appel à réaliser' },
      now: '2026-10-02T10:00:00.000Z',
    }
    const eng = evaluateProspect(input)
    const bm = evaluateBusinessModel(input, eng, [], false)
    t('9o. Moteur : standard non nominatif appelable -> displayNba CALL', eng.contactable && bm.displayNba.type === 'CALL')
  }

  // ═════ 10. RÉSULTAT D'APPEL / NOTES / BESOIN / PROCHAINE ACTION ═════
  {
    const { deps, appelsRpc, besoins } = fauxDeps({ profil: SDR })
    const r = await traiterActiviteSdr(deps, CO_A, {
      resultat: 'PAS_DE_REPONSE', idempotencyKey: CLE, moyenContactId: MOYEN_A,
      notes: '  Messagerie, rappeler le matin  ', besoinIdentifie: '',
    })
    t('10. Résultat d\'appel (SDR propriétaire) -> 200 + RPC existante appelée', r.status === 200 && appelsRpc.length === 1)
    t('10b. Notes -> activites.description (p_description, nettoyées)', appelsRpc[0]?.p_description === 'Messagerie, rappeler le matin')
    t('10c. Prochaine action calculée (PAS_DE_REPONSE -> CALLBACK daté)', appelsRpc[0]?.p_next_action_type === 'CALLBACK' && !!appelsRpc[0]?.p_next_action_due_at)
    t('10d. Besoin vide -> aucune écriture besoin', besoins.length === 0)
    t('10e. moyenContactId du prospect accepté et transmis', appelsRpc[0]?.p_moyen_contact_id === MOYEN_A)

    const { deps: d2, appelsRpc: a2, besoins: b2 } = fauxDeps({ profil: SDR })
    const dateRappel = '2026-10-05T09:00:00.000Z'
    const r2 = await traiterActiviteSdr(d2, CO_A, {
      resultat: 'A_RAPPELER', idempotencyKey: CLE, dateRappelSaisie: dateRappel, besoinIdentifie: '  Recrutement d\'un apprenti à former  ',
    })
    t('10f. Prochaine action : date de rappel saisie respectée', r2.status === 200 && a2[0]?.p_next_action_due_at === dateRappel && a2[0]?.p_next_action_type === 'CALLBACK')
    t('10g. Besoin identifié enregistré (nettoyé)', b2.length === 1 && b2[0].besoin === "Recrutement d'un apprenti à former" && r2.body.besoinEnregistre === true)
    t('10h. Besoin SDR restreint à son affectation (assigned_to)', b2[0]?.restreindreA === SACHA)

    const { deps: d3 } = fauxDeps({ profil: SDR })
    const r3 = await traiterActiviteSdr(d3, CO_A, { resultat: 'A_RAPPELER', idempotencyKey: CLE, dateRappelSaisie: '2020-01-01T00:00:00.000Z' })
    t('10i. Date de prochaine action dans le passé -> 400', r3.status === 400)
    const { deps: d4, appelsRpc: a4 } = fauxDeps({ profil: SDR })
    const r4 = await traiterActiviteSdr(d4, CO_A, { resultat: 'VENDU', idempotencyKey: CLE })
    t('10j. Résultat hors des 10 existants -> 400, RPC non appelée', r4.status === 400 && a4.length === 0)
    const { deps: d5 } = fauxDeps({ profil: SDR })
    const r5 = await traiterActiviteSdr(d5, CO_A, { resultat: 'RDV_OBTENU', idempotencyKey: CLE, dateRdvSaisie: '2026-10-08T14:00:00.000Z' })
    t('10k. RDV_OBTENU -> pipeline RDV, préparation la veille', r5.status === 200 && r5.body.consequence.pipelineStage === 'RDV' && r5.body.consequence.nextActionType === 'PREPARE_MEETING')
    const { deps: d6 } = fauxDeps({ profil: SDR })
    const r6 = await traiterActiviteSdr(d6, CO_A, { resultat: 'PAS_DE_REPONSE', idempotencyKey: CLE, notes: 'x'.repeat(4001) })
    t('10l. Notes > 4000 caractères -> 400', r6.status === 400)
  }

  // ═════ 11. IDEMPOTENCE ═════
  {
    const { deps, besoins } = fauxDeps({ profil: SDR, rpcData: { activite_id: 'act-1', deja_existant: true, opposition_id: null } })
    const r = await traiterActiviteSdr(deps, CO_A, { resultat: 'INTERESSE', idempotencyKey: CLE, besoinIdentifie: 'Besoin rejoué' })
    t('11. Rejeu (deja_existant=true) -> 200, besoin JAMAIS réécrit', r.status === 200 && besoins.length === 0 && r.body.besoinEnregistre === false)
    const { deps: d2, appelsRpc } = fauxDeps({ profil: SDR })
    const r2 = await traiterActiviteSdr(d2, CO_A, { resultat: 'PAS_DE_REPONSE', idempotencyKey: '  ' })
    t('11b. idempotencyKey absente/vide -> 400, RPC non appelée', r2.status === 400 && appelsRpc.length === 0)
    t('11c. La clé est transmise telle quelle à la RPC PR1', (await (async () => {
      const { deps: d3, appelsRpc: a3 } = fauxDeps({ profil: SDR })
      await traiterActiviteSdr(d3, CO_A, { resultat: 'PAS_DE_REPONSE', idempotencyKey: CLE })
      return a3[0]?.p_idempotency_key === CLE
    })()))
  }

  // ═════ 12. APPARTENANCE personneId / moyenContactId ═════
  {
    const { deps, appelsRpc } = fauxDeps({ profil: SDR })
    const r = await traiterActiviteSdr(deps, CO_A, { resultat: 'DEMANDE_NE_PLUS_CONTACTER', oppositionScope: 'PERSONNE', personneId: PERS_P, idempotencyKey: CLE })
    t('12. personneId d\'une autre entreprise -> 400, RPC non appelée', r.status === 400 && appelsRpc.length === 0)
    const r2 = await traiterActiviteSdr(deps, CO_A, { resultat: 'DEMANDE_NE_PLUS_CONTACTER', oppositionScope: 'MOYEN', moyenContactId: MOYEN_P, idempotencyKey: CLE })
    t('12b. moyenContactId d\'une autre entreprise -> 400, RPC non appelée', r2.status === 400 && appelsRpc.length === 0)
    const r3 = await traiterActiviteSdr(deps, CO_A, { resultat: 'PAS_DE_REPONSE', personneId: 'pas-un-uuid', idempotencyKey: CLE })
    t('12c. personneId non-UUID -> 400', r3.status === 400 && appelsRpc.length === 0)
    const r4 = await traiterActiviteSdr(deps, CO_A, { resultat: 'DEMANDE_NE_PLUS_CONTACTER', oppositionScope: 'MOYEN', moyenContactId: MOYEN_A, idempotencyKey: CLE })
    t('12d. moyenContactId du standard de l\'entreprise -> opposition MOYEN acceptée', r4.status === 200 && appelsRpc[0]?.p_opposition_scope === 'MOYEN')
    // Ordre : affectation vérifiée AVANT l'appartenance (un étranger ne sonde rien).
    const { deps: dX, appelsRpc: aX } = fauxDeps({ profil: SDR })
    const r5 = await traiterActiviteSdr(dX, CO_B, { resultat: 'PAS_DE_REPONSE', personneId: PERS_P, idempotencyKey: CLE })
    t('12e. Hors portefeuille : 404 avant tout contrôle d\'appartenance', r5.status === 404 && aX.length === 0)
  }

  // ═════ 13. MIGRATIONS (structure) — 66 pilotes préservés ═════
  {
    const m7 = lire('supabase/migrations/007_pr3_sdr_portefeuille_structure.sql')
    const m8 = lire('supabase/migrations/008_pr3_sdr_portefeuille_donnees.sql')
    const sansCommentaires = (s: string) => s.replace(/--.*$/gm, '')
    t('13. 007 : aucune écriture de données (pas d\'INSERT/UPDATE/DELETE)', !/\b(INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(sansCommentaires(m7).replace(/ON DELETE SET NULL/g, '')))
    t('13b. 007 : assigned_to -> profiles(user_id) ON DELETE SET NULL + index', /REFERENCES public\.profiles\(user_id\) ON DELETE SET NULL/.test(m7) && /idx_prospects_sales_assigned_to/.test(m7))
    t('13c. 007 : population figée, company_id PK (aucun doublon)', /company_id uuid PRIMARY KEY/.test(m7) && /telephone_normalise text NOT NULL UNIQUE/.test(m7))
    t('13d. 008 : prospects_sales ON CONFLICT (company_id) DO NOTHING (jamais d\'écrasement)', /INSERT INTO public\.prospects_sales[\s\S]*?ON CONFLICT \(company_id\) DO NOTHING/.test(m8))
    t('13e. 008 : affectation uniquement si assigned_to IS NULL', /SET assigned_to = c_sdr_user_id[\s\S]*?ps\.assigned_to IS NULL/.test(m8))
    t('13f. 008 : profil cible role=SDR AND actif vérifié', /role = 'SDR' AND actif = true/.test(m8))
    t('13g. 008 : ON CONFLICT ux_pmc_company avec prédicat partiel exact', /ON CONFLICT \(moyen_contact_id, company_id, source_id\) WHERE company_id IS NOT NULL DO NOTHING/.test(m8))
    t('13h. 008 : MATCH_FORT -> CONFIRME, sinon PROBABLE', /WHEN 'MATCH_FORT' THEN 'CONFIRME' ELSE 'PROBABLE'/.test(m8))
    t('13i. 008 : contrôles 100/100/100/100 et A_VERIFIER=19 bloquants', /v_n <> 100 OR v_n2 <> 100 OR v_n3 <> 100 OR v_n4 <> 100/.test(m8) && /v_n <> 19/.test(m8))
    t('13j. 008 : empreinte avant/après des lignes hors population (66 pilotes) comparée', /v_pilotes_apres_hash <> v_pilotes_avant_hash/.test(m8) && /next_action_due_at/.test(m8) && /temperature/.test(m8))
    t('13k. 008 : aucune personne créée (pas d\'INSERT INTO personnes)', !/INSERT INTO public\.personnes\s*\(/.test(m8))
    t('13l. 008 : aucun DELETE / TRUNCATE', !/\b(DELETE|TRUNCATE)\b/i.test(sansCommentaires(m8)))
    t('13m. 008 : seuls UPDATE autorisés = affectation', (sansCommentaires(m8).match(/\bUPDATE\b/g) ?? []).length === 1)
    t('13n. Aucune migration PR3 ne redéfinit la RPC PR1', !/p07_enregistrer_resultat_appel/i.test(sansCommentaires(m7 + m8)) && !/CREATE OR REPLACE FUNCTION/i.test(m7 + m8))
  }

  // ═════ 14. PR1 / PR2 figées ═════
  {
    const { execSync } = require('child_process')
    const figes = [
      'supabase/migrations/004_activites_idempotency_key_unique.sql', 'supabase/migrations/005_profiles.sql',
      'supabase/migrations/006_profiles_authenticated_select_grant.sql', 'src/lib/sales/auth-session.ts',
      'src/app/api/auth/login/route.ts', 'src/app/api/admin/login/route.ts',
      'src/app/api/admin/prospects/[companyId]/activite/route.ts', 'src/lib/priority/activite-consequence.ts',
    ]
    let inchanges = true
    for (const f of figes) {
      const diff = execSync(`git diff main -- "${f}"`, { cwd: racine, encoding: 'utf-8' })
      if (diff.trim()) { inchanges = false; console.log('  modifié:', f) }
    }
    t('14. Fichiers PR1/PR2 + route ADMIN + activite-consequence strictement inchangés', inchanges)
    const att = lire('src/app/sdr/attente/page.tsx')
    t('14b. /sdr/attente : fallback conservé, redirige vers /sdr/prospects si portefeuille', att.includes('estSdrActif') && att.includes("redirect('/sdr/prospects')"))
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
