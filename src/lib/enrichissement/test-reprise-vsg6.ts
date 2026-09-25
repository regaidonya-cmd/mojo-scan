import { enrichirBatchAvecReprise } from './orchestrateur-reprise'
import { QuotaAtteinteError, ErreurNonRetryable } from './google-places-client'
import { determinerActionReprise } from './persistance'
import type { PersistanceClient, LigneEnrichissement } from './persistance'
import type { EtablissementReference } from './types'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

function ref(siren: string, overrides: Partial<EtablissementReference> = {}): EtablissementReference & { lotCode: string } {
  return { siren, siret: siren + '00010', raisonSociale: `TEST ${siren}`, enseigne: null, adresse: 'X', codePostal: '94190', commune: 'VSG', ape: '00.00Z', lotCode: 'TEST_LOT', ...overrides }
}
function refs(n: number, prefix = '9'): (EtablissementReference & { lotCode: string })[] {
  return Array.from({ length: n }, (_, i) => ref(`${prefix}${String(i).padStart(3, '0')}`))
}

function creerMockPersistance(initial: Map<string, LigneEnrichissement> = new Map()) {
  const store = new Map(initial)
  const client: PersistanceClient = {
    async lireLot() { return new Map(store) },
    async sauvegarderEtape(ligne) { store.set(ligne.siren, { ...ligne }) },
  }
  return { client, store }
}

async function main() {
  // 1. Reprise : SIREN déjà MATCH_FORT -> jamais réinterrogé
  {
    const ligneExistante: LigneEnrichissement = {
      siren: '111', companyId: null, lotCode: 'TEST_LOT', source: 'GOOGLE_PLACES',
      textSearchTermine: true, placeDetailsTermine: true, statut: 'MATCH_FORT', verdictMatching: 'MATCH_FORT',
      scoreMatching: 0.95, placeId: 'p1', telephone: '0123456789', siteWeb: 'https://x.fr', email: null,
      candidatsExamines: [], erreur: null,
    }
    const { client: persistance } = creerMockPersistance(new Map([['111', ligneExistante]]))
    let nbTextSearch = 0
    const google = { async textSearch() { nbTextSearch++; return [] }, async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } } }
    const resultat = await enrichirBatchAvecReprise([ref('111')], 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google as any)
    t('1. SIREN déjà MATCH_FORT -> 0 Text Search (jamais réinterrogé)', nbTextSearch === 0)
    t('1b. Comptabilisé comme traité', resultat.traites === 1)
  }

  // 2. SIREN en ERREUR retryable (Text Search jamais réussi) -> réintégré au lot à traiter
  {
    const ligneErreur: LigneEnrichissement = {
      siren: '222', companyId: null, lotCode: 'TEST_LOT', source: 'GOOGLE_PLACES',
      textSearchTermine: false, placeDetailsTermine: false, statut: 'ERREUR', verdictMatching: null,
      scoreMatching: null, placeId: null, telephone: null, siteWeb: null, email: null,
      candidatsExamines: null, erreur: 'Timeout réseau', // pas de préfixe NON_RETRYABLE -> retryable
    }
    const { client: persistance } = creerMockPersistance(new Map([['222', ligneErreur]]))
    let nbTextSearch = 0
    const google = { async textSearch() { nbTextSearch++; return [{ placeId: 'p2', displayName: 'TEST 222', formattedAddress: 'X 94190 VSG' }] }, async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } } }
    await enrichirBatchAvecReprise([ref('222')], 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google as any)
    t('2. SIREN en erreur retryable (Text Search jamais fait) -> réinterrogé (1 Text Search)', nbTextSearch === 1)
  }

  // 3. Sauvegarde immédiate : après 2 succès puis un échec, les 2 succès restent en base
  {
    const { client: persistance, store } = creerMockPersistance()
    let appel = 0
    const google = {
      async textSearch() {
        appel++
        if (appel === 3) throw new Error('Erreur réseau simulée')
        return [{ placeId: `p${appel}`, displayName: `TEST`, formattedAddress: 'X 94190 VSG' }]
      },
      async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } },
    }
    await enrichirBatchAvecReprise([ref('301'), ref('302'), ref('303')], 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google as any)
    t('3. Après échec sur la 3e, les 2 premières restent sauvegardées', store.has('301') && store.has('302'))
  }

  // 4. 429 Google -> PARTIEL_QUOTA_ATTEINT avec traites/restants/sirenRestants corrects
  {
    const { client: persistance } = creerMockPersistance()
    let appel = 0
    const google = {
      async textSearch() {
        appel++
        if (appel === 3) throw new QuotaAtteinteError('textSearch')
        return [{ placeId: `p${appel}`, displayName: 'X', formattedAddress: 'AUCUN RAPPORT' }]
      },
      async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } },
    }
    const resultat = await enrichirBatchAvecReprise([ref('401'), ref('402'), ref('403'), ref('404')], 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google as any)
    t('4. 429 Google -> statutGlobal PARTIEL_QUOTA_ATTEINT', resultat.statutGlobal === 'PARTIEL_QUOTA_ATTEINT')
    t('4b. traites=2, restants=2', resultat.traites === 2 && resultat.restants === 2)
    t('4c. sirenRestants = les 2 non traités', JSON.stringify(resultat.sirenRestants) === JSON.stringify(['403', '404']))
  }

  // 5. Erreur 5xx/réseau (retryable) sur une entreprise -> le batch continue sur les suivantes
  {
    const { client: persistance, store } = creerMockPersistance()
    let appel = 0
    const google = {
      async textSearch() {
        appel++
        if (appel === 2) throw new Error('Erreur 500 simulée')
        return []
      },
      async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } },
    }
    const resultat = await enrichirBatchAvecReprise([ref('501'), ref('502'), ref('503')], 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google as any)
    t('5. Erreur 5xx/réseau -> batch continue, TERMINE (pas PARTIEL)', resultat.statutGlobal === 'TERMINE')
    t('5b. Les 3 sont comptées traitées (dont 1 en erreur)', resultat.traites === 3)
    t('5c. Erreur enregistrée SANS préfixe NON_RETRYABLE (retryable)', !store.get('502')?.erreur?.startsWith('[NON_RETRYABLE]'))
  }

  // 6. Reprise Place Details uniquement (Text Search déjà fait, jamais refait)
  {
    const ligneAttente: LigneEnrichissement = {
      siren: '601', companyId: null, lotCode: 'TEST_LOT', source: 'GOOGLE_PLACES',
      textSearchTermine: true, placeDetailsTermine: false, statut: 'ERREUR', verdictMatching: 'MATCH_FORT',
      scoreMatching: 0.9, placeId: 'place601', telephone: null, siteWeb: null, email: null,
      candidatsExamines: [{ placeId: 'place601' }], erreur: 'Text Search réussi, Place Details en attente',
    }
    const { client: persistance, store } = creerMockPersistance(new Map([['601', ligneAttente]]))
    let nbTextSearch = 0, nbPlaceDetails = 0
    const google = {
      async textSearch() { nbTextSearch++; return [] },
      async placeDetails() { nbPlaceDetails++; return { telephone: '099', siteWeb: null, googleMapsUri: null } },
    }
    await enrichirBatchAvecReprise([ref('601')], 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google as any)
    t('6. Reprise ciblée -> 0 nouveau Text Search', nbTextSearch === 0)
    t('6b. Reprise ciblée -> 1 Place Details (sur place_id déjà connu)', nbPlaceDetails === 1)
    t('6c. Statut final = verdict conservé (MATCH_FORT)', store.get('601')?.statut === 'MATCH_FORT')
  }

  // 7. NON_TROUVE et AMBIGU sont terminaux — jamais retentés
  {
    t('7. determinerActionReprise(NON_TROUVE) = AUCUNE', determinerActionReprise({ siren: 'x', companyId: null, lotCode: 'L', source: 'S', textSearchTermine: true, placeDetailsTermine: true, statut: 'NON_TROUVE', verdictMatching: 'NON_TROUVE', scoreMatching: 0, placeId: null, telephone: null, siteWeb: null, email: null, candidatsExamines: null, erreur: null }) === 'AUCUNE')
    t('7b. determinerActionReprise(AMBIGU) = AUCUNE', determinerActionReprise({ siren: 'x', companyId: null, lotCode: 'L', source: 'S', textSearchTermine: true, placeDetailsTermine: true, statut: 'AMBIGU', verdictMatching: 'AMBIGU', scoreMatching: 0.3, placeId: null, telephone: null, siteWeb: null, email: null, candidatsExamines: null, erreur: null }) === 'AUCUNE')
  }

  // 8. Idempotence : reprise deux fois sur un lot déjà complet -> 0 nouvel appel (non régressée)
  {
    const complet: LigneEnrichissement = {
      siren: '801', companyId: null, lotCode: 'TEST_LOT', source: 'GOOGLE_PLACES',
      textSearchTermine: true, placeDetailsTermine: true, statut: 'NON_TROUVE', verdictMatching: 'NON_TROUVE',
      scoreMatching: 0, placeId: null, telephone: null, siteWeb: null, email: null, candidatsExamines: [], erreur: null,
    }
    const { client: persistance } = creerMockPersistance(new Map([['801', complet]]))
    let t1 = 0, t2 = 0
    const google1 = { async textSearch() { t1++; return [] }, async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } } }
    await enrichirBatchAvecReprise([ref('801')], 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google1 as any)
    const google2 = { async textSearch() { t2++; return [] }, async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } } }
    await enrichirBatchAvecReprise([ref('801')], 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google2 as any)
    t('8. Deux reprises successives -> 0 appel à chaque fois', t1 === 0 && t2 === 0)
  }

  // ══════════════════════════════════════════════════════════════
  // ENRICH.VSG.6B — Tests réels des hard-stops applicatifs
  // ══════════════════════════════════════════════════════════════

  // 9. 41 entreprises nécessitant Text Search -> exactement 40 appels maximum, jamais 41
  {
    const { client: persistance } = creerMockPersistance()
    let nbTextSearch = 0
    const google = { async textSearch() { nbTextSearch++; return [] }, async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } } }
    const resultat = await enrichirBatchAvecReprise(refs(41, 'a'), 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google as any)
    t('9. 41 références -> exactement 40 Text Search maximum (jamais 41)', nbTextSearch === 40)
    t('9b. statutGlobal PARTIEL_QUOTA_ATTEINT (hard-stop applicatif, pas Google)', resultat.statutGlobal === 'PARTIEL_QUOTA_ATTEINT')
    t('9c. traites=40, restants=1', resultat.traites === 40 && resultat.restants === 1)
  }

  // 10. Contrôle effectué AVANT le 41e appel — le mock ne doit JAMAIS être invoqué une 41e fois
  {
    const { client: persistance } = creerMockPersistance()
    let nbAppelsReels = 0
    const google = {
      async textSearch() {
        nbAppelsReels++
        if (nbAppelsReels > 40) throw new Error('APPEL 41 NE DEVRAIT JAMAIS SE PRODUIRE')
        return []
      },
      async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } },
    }
    await enrichirBatchAvecReprise(refs(50, 'b'), 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google as any)
    t('10. Le 41e appel réel n\'est jamais tenté (contrôle avant, pas après)', nbAppelsReels === 40)
  }

  // 11. 41 reprises Place Details -> exactement 40 appels maximum
  {
    // 41 lignes déjà en Text Search réussi (MATCH_FORT), Place Details manquant
    const store = new Map<string, LigneEnrichissement>()
    for (let i = 0; i < 41; i++) {
      const siren = `c${String(i).padStart(3, '0')}`
      store.set(siren, {
        siren, companyId: null, lotCode: 'TEST_LOT', source: 'GOOGLE_PLACES',
        textSearchTermine: true, placeDetailsTermine: false, statut: 'ERREUR', verdictMatching: 'MATCH_FORT',
        scoreMatching: 0.9, placeId: `place_${siren}`, telephone: null, siteWeb: null, email: null,
        candidatsExamines: [], erreur: 'Text Search réussi, Place Details en attente',
      })
    }
    const { client: persistance } = creerMockPersistance(store)
    let nbPlaceDetails = 0
    const google = { async textSearch() { return [] }, async placeDetails() { nbPlaceDetails++; return { telephone: null, siteWeb: null, googleMapsUri: null } } }
    const references41 = Array.from({ length: 41 }, (_, i) => ref(`c${String(i).padStart(3, '0')}`))
    const resultat = await enrichirBatchAvecReprise(references41, 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google as any)
    t('11. 41 reprises Place Details -> exactement 40 appels maximum', nbPlaceDetails === 40)
    t('11b. statutGlobal PARTIEL_QUOTA_ATTEINT', resultat.statutGlobal === 'PARTIEL_QUOTA_ATTEINT')
  }

  // 12. Reprise ultérieure possible sur les restantes (après hard-stop applicatif)
  {
    const { client: persistance, store } = creerMockPersistance()
    let nbTextSearch1 = 0
    const google1 = { async textSearch() { nbTextSearch1++; return [] }, async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } } }
    const r1 = await enrichirBatchAvecReprise(refs(45, 'd'), 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google1 as any)
    t('12. 1ère exécution (45 refs, limite 40) -> 5 restants', r1.restants === 5)

    // Reprise avec le MÊME lot complet (45) — les 40 déjà NON_TROUVE ne redéclenchent aucun appel, seuls les 5 restants le font
    let nbTextSearch2 = 0
    const google2 = { async textSearch() { nbTextSearch2++; return [] }, async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } } }
    const r2 = await enrichirBatchAvecReprise(refs(45, 'd'), 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google2 as any)
    t('12b. Reprise ultérieure -> exactement 5 nouveaux Text Search (les restants uniquement)', nbTextSearch2 === 5)
    t('12c. Reprise ultérieure -> TERMINE cette fois (tout traité)', r2.statutGlobal === 'TERMINE')
  }

  // 13. Impossible de dépasser la limite même avec 100 références fournies accidentellement
  {
    const { client: persistance } = creerMockPersistance()
    let nbTextSearch = 0
    const google = { async textSearch() { nbTextSearch++; return [] }, async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } } }
    await enrichirBatchAvecReprise(refs(100, 'e'), 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google as any)
    t('13. 100 références fournies, limite=40 -> jamais plus de 40 appels réels', nbTextSearch === 40)
  }

  // 14. Une entreprise déjà terminale ne consomme aucun quota (même avec hard-stop bas)
  {
    const complet: LigneEnrichissement = {
      siren: 'f001', companyId: null, lotCode: 'TEST_LOT', source: 'GOOGLE_PLACES',
      textSearchTermine: true, placeDetailsTermine: true, statut: 'NON_TROUVE', verdictMatching: 'NON_TROUVE',
      scoreMatching: 0, placeId: null, telephone: null, siteWeb: null, email: null, candidatsExamines: [], erreur: null,
    }
    const { client: persistance } = creerMockPersistance(new Map([['f001', complet]]))
    let nbTextSearch = 0
    const google = { async textSearch() { nbTextSearch++; return [] }, async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } } }
    // Hard-stop volontairement à 0 — si l'entreprise terminale consommait un slot, cela échouerait.
    const resultat = await enrichirBatchAvecReprise([ref('f001')], 'GOOGLE_PLACES', persistance, async () => null, 0, 0, google as any)
    t('14. Entreprise déjà terminale traitée même avec hard-stop=0 (0 quota consommé)', resultat.statutGlobal === 'TERMINE' && nbTextSearch === 0)
  }

  // ══════════════════════════════════════════════════════════════
  // ENRICH.VSG.6B — Erreurs non-retryables (4xx) vs retryables (5xx/réseau)
  // ══════════════════════════════════════════════════════════════

  // 15. Erreur 404 (non-retryable) -> enregistrée avec préfixe, jamais retentée
  {
    const { client: persistance, store } = creerMockPersistance()
    let nbTextSearch = 0
    const google = { async textSearch() { nbTextSearch++; throw new ErreurNonRetryable('textSearch', 404) }, async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } } }
    await enrichirBatchAvecReprise([ref('g001')], 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google as any)
    t('15. Erreur 404 -> statut ERREUR avec préfixe NON_RETRYABLE', store.get('g001')?.erreur?.startsWith('[NON_RETRYABLE]') ?? false)

    // Reprise : ne doit JAMAIS refaire l'appel
    let nbTextSearch2 = 0
    const google2 = { async textSearch() { nbTextSearch2++; return [] }, async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } } }
    await enrichirBatchAvecReprise([ref('g001')], 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google2 as any)
    t('15b. Reprise ultérieure -> 0 nouvel appel (404 jamais retenté)', nbTextSearch2 === 0)
  }

  // 16. Erreur 400/401/403 -> même comportement non-retryable
  {
    for (const code of [400, 401, 403]) {
      const { client: persistance, store } = creerMockPersistance()
      const google = { async textSearch() { throw new ErreurNonRetryable('textSearch', code) }, async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } } }
      await enrichirBatchAvecReprise([ref(`h${code}`)], 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google as any)
      t(`16. Erreur ${code} -> NON_RETRYABLE correctement marquée`, store.get(`h${code}`)?.erreur?.startsWith('[NON_RETRYABLE]') ?? false)
    }
  }

  // 17. Erreur 5xx -> retryable (pas de préfixe), redéclenchée à la reprise
  {
    const { client: persistance } = creerMockPersistance()
    const google1 = { async textSearch() { throw new Error('Google Places textSearch: 503') }, async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } } }
    await enrichirBatchAvecReprise([ref('i001')], 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google1 as any)

    let nbTextSearch2 = 0
    const google2 = { async textSearch() { nbTextSearch2++; return [] }, async placeDetails() { return { telephone: null, siteWeb: null, googleMapsUri: null } } }
    await enrichirBatchAvecReprise([ref('i001')], 'GOOGLE_PLACES', persistance, async () => null, 40, 40, google2 as any)
    t('17. Erreur 5xx -> retryable, redéclenchée à la reprise ultérieure (1 nouvel appel)', nbTextSearch2 === 1)
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
