import { calculerInsightV1, determinerFamille, verifierIdentiteGoogle, calculerQualiteContact, ficheGoogleRapprochee, questionMetier, type EntreeInsight, type InsightV1 } from './insight-v1'
import { FAMILLES, MOTS_INTERDITS, QUESTION_FROIDE_PLAYBOOK } from './referentiels'
import { fetchMaJourneeData } from '../priority/fetch-real'

// ══════════════════════════════════════════════════════════════
// INSIGHT V1 — Tests (aucun réseau, aucune base réelle).
// Lancer : npx tsx src/lib/insight/test-insight-v1.ts
// Les cas reprennent la FORME de cas réels du portefeuille (anonymisés
// quand ce n'est pas nécessaire au cas testé).
// ══════════════════════════════════════════════════════════════

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

function entree(o: Partial<EntreeInsight>): EntreeInsight {
  return {
    raisonSociale: 'ENTREPRISE TEST', enseigne: null, naf: '45.20A', trancheEffectif: '01',
    adresseSirene: '1 RUE TEST', codePostalSirene: '94190', communeSirene: 'VILLENEUVE-SAINT-GEORGES',
    familleLot: null, googleNom: null, googleAdresse: null, siteWeb: null, statutEmailV2: null, joignableParEmail: false,
    ...o,
  }
}
const ADR_VSG = '1 Rue Test, 94190 Villeneuve-Saint-Georges, France'
function textes(i: InsightV1): string {
  return [i.pourquoi, i.angle, i.mention, ...i.faits.map((f) => f.texte), ...i.alertes].join(' \n ').toLowerCase()
}
const tousLesInsights: InsightV1[] = []
function calc(e: EntreeInsight): InsightV1 { const i = calculerInsightV1(e); tousLesInsights.push(i); return i }

async function main() {
  const fs = require('fs')
  const path = require('path')
  const racine = path.join(__dirname, '..', '..', '..')
  const lire = (f: string) => fs.readFileSync(path.join(racine, f), 'utf-8')

  // ── 1. INSIGHT_EXPLOITABLE (intitulé Google descriptif + marque) ──
  const rabes = calc(entree({
    raisonSociale: 'GARAGE RABES', naf: '45.20A', trancheEffectif: '11', familleLot: 'Automobile & auto-écoles',
    googleNom: 'Réparateur agréé Volkswagen & VW Véhicules Utilitaires - Garage Rabès - Villeneuve-St-Georges',
    googleAdresse: '21 Rue Diderot, 94190 Villeneuve-Saint-Georges, France', siteWeb: 'http://www.garage-rabes.com/?utm=1', joignableParEmail: true,
  }))
  t('1. Intitulé Google descriptif + identité vérifiée -> INSIGHT_EXPLOITABLE', rabes.niveau === 'INSIGHT_EXPLOITABLE' && rabes.identiteGoogle === 'VERIFIEE')
  t('1b. Fait Google cité tel quel, source GOOGLE_PLACES', rabes.faits.some((f) => f.source === 'GOOGLE_PLACES' && f.texte.includes('« Réparateur agréé Volkswagen')))
  t('1c. Réseau Volkswagen relevé comme fait', rabes.faits.some((f) => f.texte === 'Réseau / marque mentionné : Volkswagen'))
  t('1d. Pourquoi : nature + effectif + commune + joignable email, accroche citée', rabes.pourquoi === 'Garage automobile (10 à 19 salariés déclarés) à Villeneuve-Saint-Georges, dans le périmètre local de MOJO Académie. Joignable par téléphone et par email. Se présente publiquement comme « Réparateur agréé Volkswagen & VW Véhicules Utilitaires ».')
  t('1e. Angle personnalisé = accroche + question métier', rabes.angle === `J'ai vu que vous vous présentez comme « Réparateur agréé Volkswagen & VW Véhicules Utilitaires » : aujourd'hui, vos nouveaux clients arrivent surtout par le bouche-à-oreille, par Google ou par d'autres canaux ?`)
  t('1f. Site propre affiché (domaine)', rabes.faits.some((f) => f.texte === 'Site web : garage-rabes.com'))

  // ── 1bis. INSIGHT_EXPLOITABLE par enseigne distincte ──
  const fleurs = calc(entree({
    raisonSociale: 'FABIENNE JOIGNANT', enseigne: 'BERNAUD FLEURS A FLEURS', naf: '47.76Z', trancheEffectif: 'NN', familleLot: 'Commerces de proximité',
    googleNom: 'Bernaud Fleurs à Fleurs', googleAdresse: '4 Av. des Fusillés, 94190 Villeneuve-Saint-Georges, France',
  }))
  // V1.1 — une enseigne seule est un fait affiché, jamais un insight différenciant.
  t('1g. V1.1 : enseigne seule -> CONTEXTE_SEULEMENT + question métier, enseigne toujours affichée',
    fleurs.niveau === 'CONTEXTE_SEULEMENT' && fleurs.angle === FAMILLES.COMMERCE.question && fleurs.faits.some((f) => f.texte === 'Enseigne déclarée : BERNAUD FLEURS A FLEURS'))
  t('1h. Tranche NN jamais affichée', !textes(fleurs).includes('nn') && !fleurs.pourquoi.includes('salarié'))

  // ── 2. CONTEXTE_SEULEMENT ──
  const mister = calc(entree({
    raisonSociale: 'GARAGE MISTER S', enseigne: 'GARAGE MISTER S', naf: '45.20A', trancheEffectif: '01', familleLot: 'Automobile & auto-écoles',
    googleNom: 'Garage Mister S', googleAdresse: '20 Rue Curie, 94190 Villeneuve-Saint-Georges, France',
  }))
  t('2. Identité vérifiée sans fait propre -> CONTEXTE_SEULEMENT', mister.niveau === 'CONTEXTE_SEULEMENT' && mister.aucunFaitDifferenciant)
  t('2b. CONTEXTE : question = question métier par défaut, sans accroche', mister.angle === FAMILLES.AUTOMOBILE.question)
  t('2c. Enseigne identique à la raison sociale : pas un fait propre', !mister.faits.some((f) => f.texte.startsWith('Enseigne')))
  const crestia = calc(entree({
    raisonSociale: 'CRESTIA', naf: '43.22B', trancheEffectif: '03', familleLot: 'Bâtiment & artisans',
    googleNom: 'CRESTIA Sarl', googleAdresse: '12 Rue du Presbytère, 94190 Villeneuve-Saint-Georges, France', siteWeb: 'https://www.crestia-confort.fr/', joignableParEmail: true,
  }))
  t('2d. Un site seul ne suffit pas : CONTEXTE_SEULEMENT (site affiché comme fait)', crestia.niveau === 'CONTEXTE_SEULEMENT' && crestia.faits.some((f) => f.texte === 'Site web : crestia-confort.fr'))

  // ── 3/4. AUCUN_INSIGHT_FIABLE / identité ambiguë ──
  const bts = calc(entree({
    raisonSociale: 'BTS CONSTRUCTIONS', naf: '43.33Z', familleLot: 'Bâtiment & artisans',
    googleNom: 'BTS Construction', googleAdresse: '226 Rue Jacques Monod, 78370 Plaisir, France',
  }))
  t('3. Fiche Google hors code postal -> AUCUN_INSIGHT_FIABLE', bts.niveau === 'AUCUN_INSIGHT_FIABLE' && bts.identiteGoogle === 'DOUTEUSE')
  t('3b. AUCUN : aucune donnée Google affichée comme fait', bts.faits.every((f) => f.source === 'SIRENE'))
  t('3c. AUCUN : vérification d\'identité + question froide du Playbook', bts.angle.startsWith('Je cherche à joindre BTS CONSTRUCTIONS à Villeneuve-Saint-Georges : est-ce bien vous ?') && bts.angle.includes(QUESTION_FROIDE_PLAYBOOK))
  t('3d. AUCUN : alerte explicite (contexte interne)', bts.alertes.some((a) => a.includes('hors de 94190')) && bts.pourquoi.includes('Identité du numéro à confirmer'))
  const bazar = calc(entree({
    raisonSociale: 'BIG BAZAR', enseigne: 'AKEAS HOME', naf: '47.78C', familleLot: 'Commerces de proximité',
    googleNom: 'Franprix', googleAdresse: '2 Rue Henri Janin, 94190 Villeneuve-Saint-Georges, France', siteWeb: 'https://www.franprix.fr/magasins/4327',
  }))
  t('4. Même adresse mais autre nom (Franprix) -> AUCUN_INSIGHT_FIABLE', bazar.niveau === 'AUCUN_INSIGHT_FIABLE' && bazar.alertes.some((a) => a.includes('autre nom')))
  const homonyme = verifierIdentiteGoogle({ raisonSociale: 'JEAN RENAULT', enseigne: null, codePostalSirene: '94190', googleNom: 'FERREYRA SAS RENAULT', googleAdresse: '190 Rue de Paris, 94190 Villeneuve' })
  t('4b. Homonyme d\'une marque (personne « Renault ») -> DOUTEUSE', homonyme === 'DOUTEUSE')
  const foncia = calc(entree({
    raisonSociale: 'FONCIA TRANSACTION FRANCE', naf: '68.31Z', trancheEffectif: '42',
    googleNom: 'FONCIA | Agence Immobilière | Achat-Vente | Villeneuve-Saint-Georges | Place Pierre Semard',
    googleAdresse: '12 Pl. Pierre Semard, 94190 Villeneuve-Saint-Georges, France', siteWeb: 'https://fr.foncia.com/agence/1150', joignableParEmail: true,
  }))
  t('4c. Raison sociale commençant par la marque -> VERIFIEE ; « Agence Immobilière » = catégorie -> CONTEXTE (V1.1)', foncia.identiteGoogle === 'VERIFIEE' && foncia.niveau === 'CONTEXTE_SEULEMENT' && foncia.angle === FAMILLES.IMMOBILIER.question)
  t('4d. Structure importante (tranche 42) -> alerte décisionnaire, sans jugement', foncia.alertes.includes('Structure importante : décisionnaire à identifier.') && foncia.pourquoi.includes('décisionnaire à identifier'))
  t('4e. Page d\'enseigne (foncia.com) jamais présentée comme site de l\'entreprise', !foncia.faits.some((f) => f.texte.startsWith('Site web')))
  const domiciliation = verifierIdentiteGoogle({ raisonSociale: 'A.R.D.A.S', enseigne: null, codePostalSirene: '94190', googleNom: "La Table d'Abraham - Traiteur", googleAdresse: '98 Av. de Choisy, 94190 Villeneuve' })
  t('4f. Adresse de domiciliation partagée : même code postal mais autre nom -> DOUTEUSE', domiciliation === 'DOUTEUSE')
  const absente = calc(entree({ raisonSociale: 'SANS FICHE' }))
  t('4g. Aucune fiche Google -> AUCUN_INSIGHT_FIABLE (identité ABSENTE)', absente.niveau === 'AUCUN_INSIGHT_FIABLE' && absente.identiteGoogle === 'ABSENTE')

  // Recoupements de noms légitimes (pas de faux AUCUN)
  const ok = (rs: string, g: string, ens: string | null = null) => verifierIdentiteGoogle({ raisonSociale: rs, enseigne: ens, codePostalSirene: '94190', googleNom: g, googleAdresse: ADR_VSG }) === 'VERIFIEE'
  t('4h. Acronyme (CONSTRUCTION BRACAL MICHEL 75 / Cbm75) -> VERIFIEE', ok('CONSTRUCTION BRACAL MICHEL 75', 'Cbm75'))
  t('4i. Nom court (M & K / M & K Échafaudage) -> VERIFIEE', ok('M & K', 'M & K Échafaudage'))
  t('4j. Lettres espacées (TRDA / T R D A) -> VERIFIEE', ok('TRDA', 'T R D A'))
  t('4k. Marque via enseigne (LE MARCHE FRANPRIX / Franprix) -> VERIFIEE', ok('SENTHURAN', 'Franprix', 'LE MARCHE FRANPRIX'))
  t('4l. Mot générique seul (SPR BATIMENT / SAS BATIMENT RENOVATION PRO) -> DOUTEUSE', !ok('SPR BATIMENT', 'SAS BATIMENT RENOVATION PRO'))
  t('4m. Prénom ajouté (EMMANUEL MENDY / Mendy Emmanuel Filomene) -> VERIFIEE mais pas descriptif',
    calc(entree({ raisonSociale: 'EMMANUEL MENDY', naf: '70.22Z', googleNom: 'Mendy Emmanuel Filomene', googleAdresse: ADR_VSG })).niveau === 'CONTEXTE_SEULEMENT')

  // ── 5. Absence de site ──
  t('5. Absence de site : aucun fait « site », aucune mention négative', !mister.faits.some((f) => f.texte.startsWith('Site')) && !textes(mister).includes('site'))
  const siteMort = calc(entree({ raisonSociale: 'BRICOURAGE', naf: '41.20B', googleNom: 'Bricourage', googleAdresse: ADR_VSG, siteWeb: 'http://www.bricourage.fr/', statutEmailV2: 'PAS_DE_SITE_EXPLOITABLE' }))
  t('5b. Site injoignable (PAS_DE_SITE_EXPLOITABLE) : jamais présenté comme site', !siteMort.faits.some((f) => f.texte.startsWith('Site')))
  const plateforme = calc(entree({ raisonSociale: 'DAVID OLIVEIRA', naf: '86.90E', googleNom: 'Oliveira David Posturologue Pédicure Podologue', googleAdresse: ADR_VSG, siteWeb: 'https://www.doctolib.fr/x' }))
  t('5c. Plateforme (doctolib) jamais présentée comme site ; intitulé descriptif -> EXPLOITABLE', plateforme.niveau === 'INSIGHT_EXPLOITABLE' && !plateforme.faits.some((f) => f.texte.startsWith('Site')))

  // ── 6. Absence d'email ──
  t('6. Sans email : « Joignable par téléphone. » sans mention négative', mister.pourquoi.endsWith('Joignable par téléphone.') && !textes(mister).includes('email'))

  // ── 7. Site mutualisé / enseigne / réseau ──
  t('7. Réseau de distribution via enseigne (Franprix) : fait réseau affiché, niveau CONTEXTE (V1.1)', (() => {
    const s = calc(entree({ raisonSociale: 'SENTHURAN', enseigne: 'LE MARCHE FRANPRIX', naf: '47.11C', googleNom: 'Franprix', googleAdresse: ADR_VSG, siteWeb: 'https://www.franprix.fr/magasins/5179' }))
    // V1.1 — enseigne de distribution : fait affiché, mais CONTEXTE_SEULEMENT
    return s.niveau === 'CONTEXTE_SEULEMENT' && s.faits.some((f) => f.texte === 'Réseau / marque mentionné : Franprix') && !s.faits.some((f) => f.texte.startsWith('Site'))
  })())
  t('7b. Marque = raison sociale (LAPEYRE) : pas un fait propre -> CONTEXTE', calc(entree({ raisonSociale: 'LAPEYRE', naf: '47.52B', googleNom: 'Lapeyre', googleAdresse: ADR_VSG, siteWeb: 'https://magasins.lapeyre.fr/x' })).niveau === 'CONTEXTE_SEULEMENT')

  // ── V1.1. Fiable ≠ commercialement différenciant ──
  const v11 = (o: Partial<EntreeInsight>) => calc(entree({ googleAdresse: ADR_VSG, ...o }))
  const ffc = v11({ raisonSociale: 'FAST FRIED CHICKEN (F.F.C)', naf: '56.10C', trancheEffectif: '02', familleLot: 'Restauration & métiers de bouche',
    googleNom: 'Fast Fried chicken(Indian)', siteWeb: 'https://fastfriedchickenindian.com/' })
  t('V11-1. FAST FRIED CHICKEN : plus INSIGHT, CONTEXTE + question Restauration', ffc.niveau === 'CONTEXTE_SEULEMENT' && ffc.angle === FAMILLES.RESTAURATION.question)
  t('V11-1b. FAST FRIED CHICKEN : faits conservés (activité, fiche Google, site), aucune accroche « Se présente »',
    ffc.faits.some((f) => f.texte === 'Fiche Google : « Fast Fried chicken(Indian) »') && ffc.faits.some((f) => f.texte === 'Site web : fastfriedchickenindian.com') && !ffc.pourquoi.includes('Se présente'))

  const nonDifferenciants: [string, string, string, string | null, string, keyof typeof FAMILLES][] = [
    ['enseigne seule (La Villa Nova)', 'LVN', 'La Villa Nova', 'LA VILLA NOVA', '56.10C', 'RESTAURATION'],
    ['enseigne seule (Ma Couverture)', 'VASILI COJOCARU', 'MA COUVERTURE', 'MA COUVERTURE', '43.91B', 'BATIMENT'],
    ['catégorie « Épicerie »', 'ANNE', "L' Epicerie D' Anne", null, '47.11B', 'COMMERCE'],
    ['catégorie « Supermarché »', "FOOD'S CITY", "Food's City Supermarché", null, '47.11B', 'COMMERCE'],
    ['catégorie + origine « Épicerie congolaise »', 'KELBIEXO', 'Épicerie congolaise "Kelbi Exo"', null, '47.78C', 'COMMERCE'],
    ['enseigne de distribution (Intermarché)', 'VALORME', 'Intermarché SUPER Villeneuve-Saint-Georges', 'INTERMARCHE', '47.11D', 'COMMERCE'],
    ['enseigne de distribution (Esso)', 'CERTAS ENERGY FRANCE', 'Esso Express', 'ESSO VALENTON CHURCHILL', '47.30Z', 'COMMERCE'],
  ]
  for (const [nom, rs, gNom, ens, naf, famille] of nonDifferenciants) {
    const i = v11({ raisonSociale: rs, enseigne: ens, naf, googleNom: gNom })
    t(`V11-2. ${nom} -> CONTEXTE_SEULEMENT + question ${famille}`, i.identiteGoogle === 'VERIFIEE' && i.niveau === 'CONTEXTE_SEULEMENT' && i.angle === FAMILLES[famille].question)
  }

  const differenciants: [string, string, string, string][] = [
    ['agrément constructeur (Volkswagen)', 'GARAGE RABES', 'Réparateur agréé Volkswagen & VW Véhicules Utilitaires - Garage Rabès', '45.20A'],
    ['réseau de service (Bosch Car Service)', 'CARROSSERIE PRESTIGE', 'Carrosserie Prestige - Bosch Car Service', '45.20A'],
    ['certification (Kacher)', "LA TABLE D'ABRAHAM", "La Table d'Abraham - Traiteur KACHER BETH DIN", '56.21Z'],
    ['prestation (Serrurerie Cordonnerie)', 'TUNA', 'Serrurerie Cordonnerie Tuna', '47.19B'],
    ['spécialisation (Échafaudage)', 'M & K', 'M & K Échafaudage', '43.34Z'],
    ["offre (tous corps d'état)", 'GCM', "GCM, entreprise tous corps d'état", '41.20A'],
    ['spécialisation (Posturologue)', 'DAVID OLIVEIRA', 'Oliveira David Posturologue Pédicure Podologue', '86.90E'],
    ['service (Gardes à domicile)', "MULTI'SERVICES A DOMICILE", 'Association de Gardes A Domicile VILLENEUVE - BIEN VIEILLIR IDF', '96.09Z'],
    ['spécialisation (Carrosserie)', 'GARAGE DU COTEAU', 'Carrosserie Garage du Coteau', '45.20A'],
    ['service (Hôtel)', 'AU 52', 'Hotel Au 52', '56.10A'],
  ]
  for (const [nom, rs, gNom, naf] of differenciants) {
    const i = v11({ raisonSociale: rs, naf, googleNom: gNom })
    t(`V11-3. ${nom} -> reste INSIGHT_EXPLOITABLE (accroche + question famille)`,
      i.niveau === 'INSIGHT_EXPLOITABLE' && i.angle.startsWith("J'ai vu que vous vous présentez comme « ") && i.pourquoi.includes('Se présente publiquement comme'))
  }
  t('V11-4. Rabès : accroche inchangée par V1.1 (non-régression)',
    rabes.niveau === 'INSIGHT_EXPLOITABLE' && rabes.angle.startsWith("J'ai vu que vous vous présentez comme « Réparateur agréé Volkswagen & VW Véhicules Utilitaires »"))
  t("V11-5. Comité d'établissement : caractéristique de structure, pas une accroche -> CONTEXTE",
    v11({ raisonSociale: 'CASI PARIS SUD-EST', naf: '56.29B', trancheEffectif: '21', googleNom: 'Comité Établissement Région SNCF Paris Sud-Est' }).niveau === 'CONTEXTE_SEULEMENT')
  t('V11-6. AUCUN_INSIGHT_FIABLE inchangé (identité douteuse prioritaire, même avec un mot différenciant)',
    calc(entree({ raisonSociale: 'ACME', naf: '45.20A', googleNom: 'Carrosserie Autre Nom', googleAdresse: '1 rue X, 78370 Plaisir' })).niveau === 'AUCUN_INSIGHT_FIABLE'
    && bts.niveau === 'AUCUN_INSIGHT_FIABLE' && bazar.niveau === 'AUCUN_INSIGHT_FIABLE')
  t('V11-7. Alertes conservées en CONTEXTE (structure importante Foncia)', foncia.alertes.includes('Structure importante : décisionnaire à identifier.'))
  t('V11-8. CONTEXTE : aucune accroche personnalisée, aucun « Se présente publiquement »',
    tousLesInsights.filter((i) => i.niveau === 'CONTEXTE_SEULEMENT').every((i) => !i.angle.startsWith("J'ai vu") && !i.pourquoi.includes('Se présente publiquement')))

  // ── 8. Famille métier ──
  t('8. Famille depuis le lot', determinerFamille('43.22B', 'Bâtiment & artisans') === 'BATIMENT')
  t('8b. Auto-école (85.53Z) prioritaire sur le lot « Automobile & auto-écoles »', determinerFamille('85.53Z', 'Automobile & auto-écoles') === 'AUTO_ECOLE')
  t('8c. Famille absente du lot -> déduite du NAF (96.02A -> BEAUTE, 68.31Z -> IMMOBILIER, 86.90E -> SANTE)',
    determinerFamille('96.02A', null) === 'BEAUTE' && determinerFamille('68.31Z', null) === 'IMMOBILIER' && determinerFamille('86.90E', null) === 'SANTE')
  t('8d. NAF inconnu sans lot -> AUTRE (jamais deviné)', determinerFamille('99.99Z', null) === 'AUTRE' && determinerFamille(null, null) === 'AUTRE')

  // ── 9. Question métier ──
  t('9. Question par famille = référentiel', questionMetier('BATIMENT') === FAMILLES.BATIMENT.question && questionMetier('AUTO_ECOLE').includes('élèves'))
  t('9b. Chaque question est une question (se termine par « ? »)', Object.values(FAMILLES).every((f) => f.question.trim().endsWith('?')))
  t('9c. Questions centralisées : aucune duplication hors referentiels.ts', (() => {
    const fichiers = ['src/components/sales/FicheProspectView.tsx', 'src/components/sales/SdrProspectsTable.tsx', 'src/lib/priority/fetch-real.ts', 'src/lib/insight/insight-v1.ts']
    return fichiers.every((f) => Object.values(FAMILLES).every((fam) => !lire(f).includes(fam.question)))
  })())

  // ── 10. Aucune absence transformée en problème / aucun jugement ──
  const interdits = tousLesInsights.flatMap((i) => MOTS_INTERDITS.filter((m) => textes(i).includes(m)))
  t(`10. Aucun mot interdit dans ${tousLesInsights.length} insights produits (${interdits.join(', ') || 'aucun'})`, interdits.length === 0)
  t('10b. Toute question d\'angle se termine par « ? »', tousLesInsights.every((i) => i.angle.trim().endsWith('?')))
  t('10c. Tout fait affiché porte une source et un champ', tousLesInsights.every((i) => i.faits.every((f) => !!f.source && !!f.champ)))
  t('10d. Déterministe : même entrée -> même sortie', JSON.stringify(calculerInsightV1(entree({ raisonSociale: 'GARAGE RABES', googleNom: 'Garage Rabès', googleAdresse: ADR_VSG })))
    === JSON.stringify(calculerInsightV1(entree({ raisonSociale: 'GARAGE RABES', googleNom: 'Garage Rabès', googleAdresse: ADR_VSG }))))

  // ── 11. Aucune modification des données sources (structure) ──
  {
    const module = lire('src/lib/insight/insight-v1.ts') + lire('src/lib/insight/referentiels.ts')
    t('11. Module INSIGHT pur : aucun import Supabase / réseau', !/supabase|fetch\(|https?:\/\/(?!www\.)|axios|openai|anthropic/i.test(module.replace(/\/\/.*$/gm, '')))
    const fr = lire('src/lib/priority/fetch-real.ts')
    t('11b. fetch-real : lecture seule (aucun insert/update/upsert/delete/rpc)', !/\.(insert|update|upsert|delete|rpc)\(/.test(fr))
    const migrations = fs.readdirSync(path.join(racine, 'supabase/migrations'))
    t('11c. Aucune nouvelle migration (008 reste la dernière)', migrations.sort().slice(-1)[0] === '008_pr3_sdr_portefeuille_donnees.sql')
  }

  // ── 12. Aucun impact téléphone / EMAIL V2 / affectation / pipeline (intégration) ──
  {
    const SACHA = '0beb391e-6524-4ecb-8abd-b2139b98db4e'
    const CO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', TEL = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', MAIL = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    const tables: Record<string, any[]> = {
      prospects_sales: [{ company_id: CO, pipeline_stage: 'A_CONTACTER', temperature: null, next_action_type: 'CALL', next_action_due_at: null, next_action_reason: 'Portefeuille SDR PR3 — premier appel à réaliser', assigned_to: SACHA, besoin_identifie: 'Besoin X' }],
      companies: [{ id: CO, name: 'GARAGE RABES', siren: '400307278', naf: '45.20A', city: null, trade_name: null, employee_band: '11' }],
      etablissements: [{ company_id: CO, ville: 'VILLENEUVE-SAINT-GEORGES', latitude: null, longitude: null, siege: true, adresse: '21 RUE DIDEROT', code_postal: '94190' }],
      personnes: [],
      personnes_moyens_contact: [
        { company_id: CO, personne_id: null, moyen_contact_id: MAIL, niveau_confiance: 'PROBABLE', moyens_contact: { type: 'email', valeur_normalisee: 'contact@garage-rabes.com' } },
        { company_id: CO, personne_id: null, moyen_contact_id: TEL, niveau_confiance: 'PROBABLE', moyens_contact: { type: 'telephone', valeur_normalisee: '0143821702' } },
      ],
      enrichissement_resultats: [{ company_id: CO, site_web: 'http://www.garage-rabes.com/', email: 'contact@garage-rabes.com', place_id: 'P1', famille_metier: 'Automobile & auto-écoles',
        candidats_examines: [{ placeId: 'P0', displayName: 'Autre garage', formattedAddress: 'x 75001 Paris' }, { placeId: 'P1', displayName: 'Réparateur agréé Volkswagen - Garage Rabès', formattedAddress: '21 Rue Diderot, 94190 Villeneuve-Saint-Georges, France' }] }],
      observations_entreprise: [{ company_id: CO, attribut: 'email_recherche_statut', valeur: 'EMAIL_TROUVE' }],
      oppositions: [], qualifications_courantes: [],
    }
    const journal: string[] = []
    const client = {
      from(table: string) {
        const f: [string, (x: any) => boolean][] = []
        const b: any = {
          select() { return b }, order() { return b },
          eq(c: string, v: any) { f.push([c, (x) => x === v]); return b }, in(c: string, v: any[]) { f.push([c, (x) => v.includes(x)]); return b },
          insert() { journal.push('insert ' + table); return b }, update() { journal.push('update ' + table); return b }, upsert() { journal.push('upsert ' + table); return b }, delete() { journal.push('delete ' + table); return b },
          then(res: any, rej: any) { return Promise.resolve({ data: (tables[table] ?? []).filter((r) => f.every(([c, p]) => p(r[c]))), error: null }).then(res, rej) },
        }
        return b
      },
    }
    const avant = JSON.stringify(tables)
    const [vm] = await fetchMaJourneeData({ assignedTo: SACHA }, client)
    t('12. Insight calculé à la lecture (fiche Google rapprochée par placeId)', vm.insight?.niveau === 'INSIGHT_EXPLOITABLE' && vm.insight.faits.some((f) => f.texte.includes('Réparateur agréé Volkswagen')))
    t('12b. Téléphone inchangé et toujours contact d\'appel', vm.telephoneAffichable === '0143821702' && vm.engine.selectedContact?.type === 'telephone')
    t('12c. Pipeline / prochaine action / affectation / besoin inchangés', vm.pipelineStage === 'A_CONTACTER' && vm.business.displayNba.type === 'CALL' && vm.assignedTo === SACHA && vm.besoinIdentifie === 'Besoin X')
    t('12d. Qualité contact calculée : A_COMPLET (email PROBABLE), statut EMAIL V2 lu tel quel', vm.qualiteContact === 'A_COMPLET' && vm.statutEmailV2 === 'EMAIL_TROUVE')
    t('12e. Aucune écriture déclenchée, données sources identiques', journal.length === 0 && JSON.stringify(tables) === avant)
    tables.personnes_moyens_contact.shift() // plus d'email
    const [vmB] = await fetchMaJourneeData({ assignedTo: SACHA }, client)
    t('12f. Sans email exploitable -> B_APPELABLE (l\'insight ne change pas l\'éligibilité)', vmB.qualiteContact === 'B_APPELABLE' && vmB.insight?.niveau === 'INSIGHT_EXPLOITABLE')
    t('12g. Qualité contact : téléphone non autorisé -> hors grille (null)', calculerQualiteContact(false, true) === null && calculerQualiteContact(true, false) === 'B_APPELABLE')
    t('12h. ficheGoogleRapprochee : seul le candidat du placeId retenu', ficheGoogleRapprochee('P1', tables.enrichissement_resultats[0].candidats_examines).nom === 'Réparateur agréé Volkswagen - Garage Rabès' && ficheGoogleRapprochee(null, []).nom === null)
  }

  // ── 13. ADMIN inchangé ──
  {
    const fiche = lire('src/components/sales/FicheProspectView.tsx')
    t('13. Insight affiché uniquement en mode SDR (modeSdr)', /const insight = modeSdr \? vm\.insight \?\? null : null/.test(fiche))
    t('13b. Bloc « Diagnostic commercial » conservé hors SDR', /\{!insight && \(\s*<Section title="Diagnostic commercial">/.test(fiche))
    const adminFiche = lire('src/app/admin/prospects/[companyId]/page.tsx')
    t('13c. Page ADMIN : FicheProspectView sans modeSdr', adminFiche.includes('<FicheProspectView vm={vm} historique={historique} />'))
  }

  // ── 14. SDR limité à son portefeuille (garde-fous PR3 intacts) ──
  {
    const pageSdr = lire('src/app/sdr/prospects/[companyId]/page.tsx')
    t('14. Fiche SDR : contrôle d\'affectation avant toute lecture (inchangé)', pageSdr.indexOf('autoriserAccesProspect(') < pageSdr.indexOf('fetchSingleProspect(params'))
    t('14b. Liste SDR : filtre assigned_to dans la requête (inchangé)', lire('src/app/sdr/prospects/page.tsx').includes('fetchMaJourneeData({ assignedTo: filtreAffectation(acces) })'))
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
