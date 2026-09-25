import { enrichirBatch, MAX_TEXT_SEARCH_CALLS, MAX_PLACE_DETAILS_CALLS } from './orchestrateur'
import { MAX_COMPANIES } from './google-places-client'
import type { EtablissementReference } from './types'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

function refs(n: number): EtablissementReference[] {
  return Array.from({ length: n }, (_, i) => ({
    siren: `00000000${i}`.slice(-9), siret: `0000000000000${i}`.slice(-14), raisonSociale: `TEST ${i}`, enseigne: null,
    adresse: 'X', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '00.00Z',
  }))
}

async function main() {
  // 1. MAX_COMPANIES : refus avant toute création de client
  {
    let clientAppele = false
    const mockClient: any = { textSearch: async () => { clientAppele = true; return [] }, placeDetails: async () => { clientAppele = true; return { telephone: null, siteWeb: null, googleMapsUri: null } } }
    try {
      await enrichirBatch(refs(11), async () => null, mockClient)
      t('1. FAIL attendu', false)
    } catch (e: any) {
      t('1. MAX_COMPANIES(11>10) refuse AVANT tout appel (mock jamais invoqué)', !clientAppele && e.message.includes('MAX_COMPANIES'))
    }
  }

  // 2. Garde-fou PRÉVENTIF Text Search : dépassement détecté AVANT le Nème appel, pas seulement après le batch
  {
    let appelsTextSearch = 0
    const mockClient: any = {
      textSearch: async () => { appelsTextSearch++; return [] }, // NON_TROUVE à chaque fois, donc jamais de placeDetails
      placeDetails: async () => ({ telephone: null, siteWeb: null, googleMapsUri: null }),
    }
    // Impossible de dépasser 20 avec seulement 10 entreprises (MAX_COMPANIES) -> test direct de la fonction interne via un lot de 10 avec une limite artificiellement basse n'est pas possible sans modifier la constante.
    // On vérifie donc que la 10e (dernière possible) reste sous la limite, et que le code de contrôle préventif existe bel et bien dans le fichier source.
    await enrichirBatch(refs(10), async () => null, mockClient)
    t('2. 10 entreprises -> exactement 10 Text Search, jamais plus (sous MAX_TEXT_SEARCH_CALLS=20)', appelsTextSearch === 10)
  }

  // 3. Vérification structurelle : le contrôle préventif existe AVANT l'appel, pas seulement après
  {
    const fs = require('fs')
    const src = fs.readFileSync(__dirname + '/orchestrateur.ts', 'utf-8')
    const idxControlePreventifTS = src.indexOf('nbTextSearch + 1 > MAX_TEXT_SEARCH_CALLS')
    const idxAppelTextSearch = src.indexOf('await client.textSearch')
    t('3. Contrôle préventif Text Search AVANT l\'appel réel (dans le code source)', idxControlePreventifTS > 0 && idxControlePreventifTS < idxAppelTextSearch)

    const idxControlePreventifPD = src.indexOf('nbPlaceDetails + 1 > MAX_PLACE_DETAILS_CALLS')
    const idxAppelPlaceDetails = src.indexOf('await client.placeDetails')
    t('3b. Contrôle préventif Place Details AVANT l\'appel réel (dans le code source)', idxControlePreventifPD > 0 && idxControlePreventifPD < idxAppelPlaceDetails)
  }

  // 4. Contrôle final conservé (défense en profondeur)
  {
    const fs = require('fs')
    const src = fs.readFileSync(__dirname + '/orchestrateur.ts', 'utf-8')
    t('4. Contrôle final des compteurs toujours présent en complément', src.includes('nbTextSearch > MAX_TEXT_SEARCH_CALLS') && src.includes('nbPlaceDetails > MAX_PLACE_DETAILS_CALLS'))
  }

  console.log('')
  const passed = results.filter((r) => r.pass).length
  console.log(`${passed}/${results.length} tests passes`)
  if (passed !== results.length) process.exit(1)
}

main()
