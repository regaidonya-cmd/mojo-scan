import { calculerMatching } from './matching'
import type { EtablissementReference, CandidatGooglePlace } from './types'

const results: { name: string; pass: boolean }[] = []
function t(name: string, pass: boolean) { results.push({ name, pass }); console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name) }

function ref(overrides: Partial<EtablissementReference>): EtablissementReference {
  return { siren: '123456789', siret: '12345678900010', raisonSociale: 'ALLO POULET', enseigne: null, adresse: '284 RUE DE PARIS', codePostal: '94190', commune: 'VILLENEUVE-SAINT-GEORGES', ape: '56.10C', ...overrides }
}

// 1. Aucun candidat plausible => NON_TROUVE
{
  const candidats: CandidatGooglePlace[] = [{ placeId: 'p1', displayName: 'Boulangerie XYZ', formattedAddress: '5 Rue Inconnue, 75015 Paris' }]
  const r = calculerMatching(ref({ raisonSociale: 'CCPJJ' }), candidats)
  t('1. Aucun candidat plausible (nom et adresse sans rapport) -> NON_TROUVE', r.statut === 'NON_TROUVE')
}

// 2. 1 candidat dominant mais preuve incomplète => MATCH_PROBABLE
{
  // Nom fort, mais adresse faible (mauvais code postal) -> corroboration incomplète
  const candidats: CandidatGooglePlace[] = [{ placeId: 'p1', displayName: 'Allo Poulet', formattedAddress: '10 Rue Voltaire, 75011 Paris' }]
  const r = calculerMatching(ref({}), candidats)
  t('2a. Nom fort seul (adresse différente) -> MATCH_PROBABLE, jamais MATCH_FORT', r.statut === 'MATCH_PROBABLE')

  // Adresse forte, nom partiellement différent
  const candidats2: CandidatGooglePlace[] = [{ placeId: 'p2', displayName: 'Poulet Express VSG', formattedAddress: '284 Rue de Paris, 94190 Villeneuve-Saint-Georges' }]
  const r2 = calculerMatching(ref({}), candidats2)
  t('2b. Adresse forte, nom partiellement différent -> MATCH_PROBABLE possible (pas forcément AMBIGU/NON_TROUVE)', r2.statut === 'MATCH_PROBABLE' || r2.statut === 'MATCH_FORT')
}

// 3. 1 candidat fortement corroboré => MATCH_FORT
{
  const candidats: CandidatGooglePlace[] = [{ placeId: 'p1', displayName: 'Allo Poulet', formattedAddress: '284 Rue de Paris, 94190 Villeneuve-Saint-Georges' }]
  const r = calculerMatching(ref({}), candidats)
  t('3. Nom fort ET adresse forte -> MATCH_FORT', r.statut === 'MATCH_FORT')
}

// 4. 2 candidats plausibles proches => AMBIGU
{
  const candidats: CandidatGooglePlace[] = [
    { placeId: 'p1', displayName: 'Integrale Chauffage', formattedAddress: '21 Avenue Carnot, 94190 Villeneuve-Saint-Georges' },
    { placeId: 'p2', displayName: 'Integrale Plomberie', formattedAddress: '21 Avenue Carnot, 94190 Villeneuve-Saint-Georges' },
  ]
  const r = calculerMatching(ref({ raisonSociale: 'INTEGRALE DE CHAUFFAGE ET PLOMBERIE' }), candidats)
  t('4. 2 candidats plausibles proches (même adresse, noms partiels proches) -> AMBIGU', r.statut === 'AMBIGU')
}

// 5. Nom proche + mauvaise adresse != MATCH_FORT
{
  const candidats: CandidatGooglePlace[] = [{ placeId: 'p1', displayName: 'Allo Poulet Villeneuve', formattedAddress: '1 Rue de la Paix, 75002 Paris' }]
  const r = calculerMatching(ref({}), candidats)
  t('5. Nom très proche mais adresse totalement incompatible -> jamais MATCH_FORT', r.statut !== 'MATCH_FORT')
}

// 6. Activité seule != MATCH_FORT (primaryType transporté mais jamais utilisé pour trancher)
{
  const candidats: CandidatGooglePlace[] = [{ placeId: 'p1', displayName: 'Autre Nom Sans Rapport', formattedAddress: '99 Rue Inconnue, 10000 Troyes', primaryType: 'restaurant', types: ['restaurant', 'food'] }]
  const r = calculerMatching(ref({}), candidats)
  t('6. primaryType cohérent seul (restaurant vs restaurant) ne suffit jamais à produire un match', r.statut === 'NON_TROUVE')
}

// Non-régression : les 4 MATCH_FORT réels du BAT 1 (candidats simulés fidèles au nom/adresse SIRENE, cohérents avec l'algorithme V1)
{
  const cas = [
    { raisonSociale: 'ALLO POULET', adresse: '284 RUE DE PARIS', displayName: 'Allo Poulet', formattedAddress: '284 Rue de Paris, 94190 Villeneuve-Saint-Georges' },
    { raisonSociale: "UNIV'HAIR", adresse: '4 AVENUE DES FUSILLES', displayName: "Univ'Hair", formattedAddress: '4 Avenue des Fusillés, 94190 Villeneuve-Saint-Georges' },
    { raisonSociale: 'SARL EMERAUDE CONDUITE', adresse: '3 RUE ROBERT SCHUMANN', displayName: 'Emeraude Conduite', formattedAddress: '3 Rue Robert Schumann, 94190 Villeneuve-Saint-Georges' },
    { raisonSociale: 'CEVA LOGISTICS EUROPE', adresse: 'ZI LES GRAVIERS ZONE INDUSTRIELLE', displayName: 'Ceva Logistics', formattedAddress: 'ZI Les Graviers, 94190 Villeneuve-Saint-Georges' },
  ]
  let toutesFortes = true
  for (const c of cas) {
    const r = calculerMatching(ref({ raisonSociale: c.raisonSociale, adresse: c.adresse }), [{ placeId: 'p', displayName: c.displayName, formattedAddress: c.formattedAddress }])
    if (r.statut !== 'MATCH_FORT') { toutesFortes = false; console.log(`  -> régression potentielle sur ${c.raisonSociale}: ${r.statut}`) }
  }
  t('7. Non-régression : les 4 cas MATCH_FORT du BAT 1 restent MATCH_FORT en V2 (pas plus permissif ni plus strict)', toutesFortes)
}

// Vérification structurelle : seuils documentés présents et cohérents
{
  const fs = require('fs')
  const src = fs.readFileSync(__dirname + '/matching.ts', 'utf-8')
  t('8. Seuils documentés en constantes nommées (SEUIL_PLAUSIBLE, SEUIL_ECART_AMBIGU, SEUIL_NOM_FORT, SEUIL_ADRESSE_FORT)',
    src.includes('SEUIL_PLAUSIBLE') && src.includes('SEUIL_ECART_AMBIGU') && src.includes('SEUIL_NOM_FORT') && src.includes('SEUIL_ADRESSE_FORT'))
  t('8b. candidatsExamines limité à 3 (slice(0, 3))', src.includes('slice(0, 3)'))
}

console.log('')
const passed = results.filter((r) => r.pass).length
console.log(`${passed}/${results.length} tests passes`)
if (passed !== results.length) process.exit(1)
