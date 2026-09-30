import type { EntrepriseSirene } from './donnees-sirene-vsg50'

// ══════════════════════════════════════════════════════════════
// VSG.DATA.3 — Complément. Les 18 entreprises du VRAI lot VSG_BAT50
// (enrichissement_resultats, source de vérité) absentes de
// donnees-sirene-vsg50.ts. Ré-extraites RIGOUREUSEMENT depuis le fichier
// Excel source (jamais de mémoire, jamais de recherche externe).
// Toutes ont "Siège à VSG" = Oui dans le fichier source.
// ══════════════════════════════════════════════════════════════

export const ENTREPRISES_SIRENE_VSG_COMPLEMENT_18: EntrepriseSirene[] = [
  { siren: '853076719', siret: '85307671900022', name: 'VLADIMIR CALEGA', enseigne: null, naf: '43.39Z', naf2025: '43.39Y', address: 'CHEZ ARE N DOM 13104 9 B RUE DE LA JUSTICE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: 'NN', siege: true },
  { siren: '907652242', siret: '90765224200021', name: 'ETC SERVICES', enseigne: null, naf: '41.20A', naf2025: '41.20Y', address: '1 RUE JEAN LOUIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: '01', siege: true },
  { siren: '827678012', siret: '82767801200028', name: 'EL MOSTAFA AMINE', enseigne: null, naf: '86.22C', naf2025: '86.23Y', address: '47 RUE DE CROSNE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: 'NN', siege: true },
  { siren: '987484441', siret: '98748444100025', name: 'BARBERSHOP RY94', enseigne: null, naf: '96.02A', naf2025: '96.21G', address: '284 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: 'NN', siege: true },
  { siren: '895105369', siret: '89510536900014', name: 'RASHID KHAN', enseigne: null, naf: '56.21Z', naf2025: '56.21Y', address: 'CHEZ HUDA COALLIA 5 RUE RENE CASSIN', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: 'NN', siege: true },
  { siren: '933418220', siret: '93341822000010', name: 'WENDY JOCOLAS', enseigne: 'TOOTACT', naf: '47.91B', naf2025: '47.91Y', address: '17 RUE GUSTAVE FLAUBERT', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: 'NN', siege: true },
  { siren: '929131407', siret: '92913140700017', name: 'DIAFUANA LUBAKI WASAULWA', enseigne: null, naf: '81.21Z', naf2025: '81.21Y', address: 'CHEZ NDUALU 7 RUE AUGUSTE ET LOUIS LUMIERE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: 'NN', siege: true },
  { siren: '932369598', siret: '93236959800010', name: 'ALPHA DIALLO', enseigne: 'LIVRAISON', naf: '53.20Z', naf2025: '53.20G', address: 'BAT A 144 7 AVENUE LEO LAGRANGE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: 'NN', siege: true },
  { siren: '848989034', siret: '84898903400014', name: 'NICOLETA TOC', enseigne: null, naf: '10.71C', naf2025: '10.71H', address: '37 RUE VILLEBOIS MAREUIL', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: 'NN', siege: true },
  { siren: '929562924', siret: '92956292400019', name: 'MANOUCHECA PETIT', enseigne: 'MANOU CREATION', naf: '47.91A', naf2025: '47.91Y', address: '16 RUE DES PEUPLIERS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: 'NN', siege: true },
  { siren: '922714613', siret: '92271461300010', name: 'FBDA ET FILS', enseigne: null, naf: '68.31Z', naf2025: '68.31Y', address: '17 RUE MICHEL', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: 'NN', siege: true },
  { siren: '922198106', siret: '92219810600010', name: 'AMO SERVICE 94', enseigne: null, naf: '45.32Z', naf2025: '45.32Y', address: '284 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: 'NN', siege: true },
  { siren: '930919063', siret: '93091906300014', name: 'MARIA OCONSCHI', enseigne: null, naf: '96.02B', naf2025: '96.22Y', address: '9 RUE LAVOISIER', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: 'NN', siege: true },
  { siren: '889128013', siret: '88912801300014', name: 'ACTIF BATIMENT', enseigne: null, naf: '43.99C', naf2025: '43.99Y', address: '19 RUE FRANCIS MARTIN', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: '01', siege: true },
  { siren: '932452261', siret: '93245226100013', name: 'VASILI COJOCARU', enseigne: 'MA COUVERTURE', naf: '43.91B', naf2025: '43.91Y', address: 'CHEZ ARE N DOM 11485 9 B RUE DE LA JUSTICE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: 'NN', siege: true },
  { siren: '842979239', siret: '84297923900014', name: 'LUDOVIC ALPHONSE', enseigne: 'L.A FOOD', naf: '56.10C', naf2025: '56.11J', address: '6 AVENUE PAUL VERLAINE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: 'NN', siege: true },
  { siren: '850718438', siret: '85071843800029', name: 'FIODOR CALCAURA', enseigne: 'CALCAUR FIODOR', naf: '41.20A', naf2025: '41.20Y', address: '2 RUE DU PETIT PRE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: 'NN', siege: true },
  { siren: '912141892', siret: '91214189200014', name: 'PARIS UNIQUE BEAUTY', enseigne: null, naf: '96.02B', naf2025: '96.22Y', address: '57 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null, effectif: 'NN', siege: true },
]
