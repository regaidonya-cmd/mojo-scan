// ══════════════════════════════════════════════════════════════
// SDR.VSG.4 — Les 50 candidats EXACTS décidés pour VSG_SDR_ENRICH_01,
// avant tout appel Google (source : SDR.VSG.3, validé). Source de
// vérité immuable — une fois persisté en base, ce fichier ne sert plus
// qu'à la persistance initiale, jamais relu pour l'exécution Google.
//
// Correction appliquée (SDR.VSG.4) : 3 entreprises avaient
// denominationUniteLegale vide dans le fichier SIRENE (personnes
// physiques, nom dans nomUniteLegale+prenom1UniteLegale) — corrigées
// avec le vrai nom plutôt que la chaîne "nan".
// ══════════════════════════════════════════════════════════════

export interface MembreLotSdr {
  rang: number
  siren: string
  siret: string
  name: string
  enseigne: string | null
  naf: string
  famille: string
  address: string
  postalCode: string
  city: string
  effectif: string
  siege: boolean
}

export const MEMBRES_VSG_SDR_ENRICH_01: MembreLotSdr[] = [
  { rang: 1, siren: '499023307', siret: '49902330700022', name: 'T C M', enseigne: null, naf: '43.22A', famille: 'Bâtiment & artisans', address: '2 RUE DE BRICQUEBEC', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '11', siege: true },
  { rang: 2, siren: '424172591', siret: '42417259100044', name: 'P.C.M.A.', enseigne: null, naf: '43.39Z', famille: 'Bâtiment & artisans', address: '2 RUE CHARLES DE FREYCINET', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: true },
  { rang: 3, siren: '420860694', siret: '42086069400025', name: 'EML LAMEIRAS', enseigne: null, naf: '43.32A', famille: 'Bâtiment & artisans', address: '49 RUE HENRI JANIN', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '11', siege: true },
  { rang: 4, siren: '331649376', siret: '33164937600026', name: 'LTB LOCAT TRANSPORTS BENNES', enseigne: null, naf: '43.12B', famille: 'Bâtiment & artisans', address: 'RTE CHENAL MUZEY', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '11', siege: false },
  { rang: 5, siren: '450650478', siret: '45065047800024', name: 'CONSTRUCTION BRACAL MICHEL 75', enseigne: null, naf: '41.20B', famille: 'Bâtiment & artisans', address: '117 RUE GAMBETTA', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '11', siege: true },
  { rang: 6, siren: '478247117', siret: '47824711700029', name: 'R.M.J.', enseigne: null, naf: '43.21A', famille: 'Bâtiment & artisans', address: '10 RUE LAVOISIER', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: true },
  { rang: 7, siren: '392749164', siret: '39274916400027', name: "SOCIETE DES FERMETURES ATTIA", enseigne: null, naf: '43.32B', famille: 'Bâtiment & artisans', address: "4 CHEMIN DU BAC D'ABLON", postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: true },
  { rang: 8, siren: '350749651', siret: '35074965100013', name: 'FRANCE PIERRE 2', enseigne: null, naf: '41.10A', famille: 'Bâtiment & artisans', address: "RUE DES PRES DE L'HOPITAL", postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '11', siege: true },
  { rang: 9, siren: '513081810', siret: '51308181000063', name: 'ECB', enseigne: null, naf: '43.99A', famille: 'Bâtiment & artisans', address: '4 RUE CHARLES DE FREYCINET', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '11', siege: true },
  { rang: 10, siren: '319369393', siret: '31936939300024', name: 'HIRSCH ET FACY SARL', enseigne: null, naf: '43.22B', famille: 'Bâtiment & artisans', address: '23 RUE DU CHEMIN DE FER', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '11', siege: true },
  { rang: 11, siren: '494844871', siret: '49484487100025', name: 'SARL CTDM', enseigne: null, naf: '43.99C', famille: 'Bâtiment & artisans', address: '26 RUE ALEXANDRE DUMAS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '11', siege: true },
  { rang: 12, siren: '379879851', siret: '37987985100010', name: 'CRESTIA', enseigne: null, naf: '43.22B', famille: 'Bâtiment & artisans', address: '12 RUE DU PRESBYTERE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: true },
  { rang: 13, siren: '532346137', siret: '53234613700021', name: 'GUSTO DEI', enseigne: null, naf: '56.21Z', famille: 'Restauration & métiers de bouche', address: '98 AVENUE DE CHOISY', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: false },
  { rang: 14, siren: '509921524', siret: '50992152400013', name: 'CHBIBI SASU', enseigne: null, naf: '47.81Z', famille: 'Commerces de proximité', address: '98 AVENUE DE CHOISY', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: true },
  { rang: 15, siren: '344402284', siret: '34440228400022', name: 'BIG BAZAR', enseigne: 'AKEAS HOME', naf: '47.78C', famille: 'Commerces de proximité', address: '2 RUE HENRI JANIN', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: true },
  { rang: 16, siren: '494636616', siret: '49463661600018', name: 'SENTHURAN', enseigne: 'LE MARCHE FRANPRIX', naf: '47.11C', famille: 'Commerces de proximité', address: '85 AV DU PDT J FITZGERALD KENNEDY', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: true },
  { rang: 17, siren: '498610849', siret: '49861084900016', name: 'ISTANBUL', enseigne: 'CALISICI', naf: '47.11B', famille: 'Commerces de proximité', address: '5 RUE HENRI JANIN', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: true },
  { rang: 18, siren: '385329800', siret: '38532980000010', name: 'EXO-IMPEX', enseigne: null, naf: '47.11D', famille: 'Commerces de proximité', address: '5 RUE HENRI SELLIER', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: true },
  { rang: 19, siren: '477672745', siret: '47767274500023', name: 'CMFVSG', enseigne: null, naf: '56.10C', famille: 'Restauration & métiers de bouche', address: '2 RUE BOILEAU', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '12', siege: true },
  { rang: 20, siren: '442917076', siret: '44291707600048', name: 'JAMEL TANICHE', enseigne: null, naf: '56.10B', famille: 'Restauration & métiers de bouche', address: '40 ALLEE DE LA SOURCE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '12', siege: false },
  { rang: 21, siren: '798150454', siret: '79815045400014', name: 'TESTI', enseigne: null, naf: '56.10C', famille: 'Restauration & métiers de bouche', address: '55 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE ST GEORGES', effectif: '03', siege: true },
  { rang: 22, siren: '384908299', siret: '38490829900017', name: "DIDIER PUZIO NOTAIRE ASSOCIE D'UNE SOCIETE CIVILE PROFESSIONNELLE TITULAIRE D'UN OFFICE NOTARIAL", enseigne: null, naf: '69.10Z', famille: 'Professions libérales & conseil', address: '16 PLACE PIERRE SEMARD', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: true },
  { rang: 23, siren: '400307278', siret: '40030727800012', name: 'GARAGE RABES', enseigne: null, naf: '45.20A', famille: 'Automobile & auto-écoles', address: '21 RUE DIDEROT', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '11', siege: true },
  { rang: 24, siren: '393922778', siret: '39392277800021', name: 'SOCIETE DE FORMATION ET DE PREVENTION ROUTIERE', enseigne: null, naf: '85.53Z', famille: 'Automobile & auto-écoles', address: '1 PLACE HECTOR BERLIOZ', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: false },
  { rang: 25, siren: '401113162', siret: '40111316200010', name: 'JMR', enseigne: null, naf: '45.40Z', famille: 'Automobile & auto-écoles', address: '224 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: true },
  { rang: 26, siren: '401112008', siret: '40111200800024', name: 'THIERRY JOUY', enseigne: null, naf: '45.40Z', famille: 'Automobile & auto-écoles', address: '222 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: true },
  { rang: 27, siren: '332292804', siret: '33229280400017', name: 'D.N.A VILLENEUVE SAINT GEORGES', enseigne: null, naf: '69.10Z', famille: 'Professions libérales & conseil', address: '10 PLACE PIERRE SEMARD', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: true },
  { rang: 28, siren: '422252049', siret: '42225204900024', name: 'FIDUCIAIRE UNION SUD', enseigne: null, naf: '69.20Z', famille: 'Professions libérales & conseil', address: '4 RUE DU FOYER', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: true },
  { rang: 29, siren: '518624580', siret: '51862458000040', name: 'GEORGES SOARES', enseigne: null, naf: '56.10C', famille: 'Restauration & métiers de bouche', address: '40 ALLEE DE LA SOURCE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '02', siege: true },
  { rang: 30, siren: '478661747', siret: '47866174700020', name: 'LE FOURNIL DE JOLI MAI', enseigne: 'ROYAL PIZZAS', naf: '56.10C', famille: 'Restauration & métiers de bouche', address: '59 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '02', siege: true },
  { rang: 31, siren: '409557295', siret: '40955729500014', name: 'GEORCOIFF', enseigne: null, naf: '96.02A', famille: 'Beauté, coiffure & bien-être', address: '59 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '02', siege: true },
  { rang: 32, siren: '403830250', siret: '40383025000011', name: 'M.I.D.', enseigne: null, naf: '56.10C', famille: 'Restauration & métiers de bouche', address: '26 RUE HENRI JANIN', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '02', siege: true },
  { rang: 33, siren: '504008269', siret: '50400826900012', name: 'COIFFURE 72', enseigne: null, naf: '96.02A', famille: 'Beauté, coiffure & bien-être', address: '72 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '02', siege: true },
  { rang: 34, siren: '537392532', siret: '53739253200017', name: "L'ESCALE DU SUD", enseigne: null, naf: '56.10C', famille: 'Restauration & métiers de bouche', address: '35 RUE EMILE ZOLA', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '02', siege: true },
  { rang: 35, siren: '514932607', siret: '51493260700013', name: 'PHARMACIE EMILE ZOLA', enseigne: null, naf: '47.73Z', famille: 'Commerces de proximité', address: '31 RUE EMILE ZOLA', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '02', siege: true },
  { rang: 36, siren: '514178136', siret: '51417813600016', name: 'SELARL PHARMACIE ROLAND GARROS', enseigne: null, naf: '47.73Z', famille: 'Commerces de proximité', address: 'RUE ROLAND GARROS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '02', siege: true },
  { rang: 37, siren: '350952255', siret: '35095225500023', name: 'AZZOUZ JERIDI', enseigne: null, naf: '47.73Z', famille: 'Commerces de proximité', address: '40 RUE BRANLY', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '02', siege: true },
  { rang: 38, siren: '384048393', siret: '38404839300019', name: 'GARAGE DU COTEAU', enseigne: null, naf: '45.20A', famille: 'Automobile & auto-écoles', address: '3 RUE EDOUARD VAILLANT', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '02', siege: true },
  { rang: 39, siren: '502722473', siret: '50272247300019', name: 'GARAGE B.B. AUTOS', enseigne: null, naf: '45.20A', famille: 'Automobile & auto-écoles', address: '44 RUE VOLTAIRE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '02', siege: true },
  { rang: 40, siren: '498555994', siret: '49855599400017', name: 'JLP', enseigne: null, naf: '70.22Z', famille: 'Professions libérales & conseil', address: "18 RUE DE L'EGLISE", postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '02', siege: true },
  { rang: 41, siren: '524042645', siret: '52404264500019', name: 'LUX COIFFURE', enseigne: null, naf: '96.02A', famille: 'Beauté, coiffure & bien-être', address: '55 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE ST GEORGES', effectif: '01', siege: true },
  { rang: 42, siren: '830744710', siret: '83074471000013', name: 'AMEDEE COIFFURE', enseigne: null, naf: '96.02A', famille: 'Beauté, coiffure & bien-être', address: '7 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: true },
  { rang: 43, siren: '532777810', siret: '53277781000013', name: 'STYLE ECO', enseigne: null, naf: '96.02A', famille: 'Beauté, coiffure & bien-être', address: '10 RUE HENRI LEDUC', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: 'NN', siege: true },
  { rang: 44, siren: '532574985', siret: '53257498500018', name: 'SARL YASMINAS', enseigne: null, naf: '96.02A', famille: 'Beauté, coiffure & bien-être', address: '85 AV DU PDT J FITZGERALD KENNEDY', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: 'NN', siege: true },
  { rang: 45, siren: '970200218', siret: '97020021800059', name: 'AGENCE IMMOBILIERE CROUSSE ET COMPAGNIE', enseigne: null, naf: '68.31Z', famille: 'Immobilier (agences)', address: '1 AVENUE DES FUSILLES', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '03', siege: false },
  { rang: 46, siren: '532145588', siret: '53214558800028', name: "MULTI'SERVICES A DOMICILE", enseigne: null, naf: '96.09Z', famille: 'Autres services à la personne', address: '11 RUE VINCENT VAN GOGH', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '11', siege: true },
  { rang: 47, siren: '503912487', siret: '50391248700025', name: 'HOLDING NM', enseigne: null, naf: '81.22Z', famille: 'Nettoyage & services aux entreprises', address: '10 RUE JULES GUESDE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '12', siege: true },
  { rang: 48, siren: '316649862', siret: '31664986200018', name: 'ALEXANDRE MOLMY', enseigne: null, naf: '69.10Z', famille: 'Professions libérales & conseil', address: '34 AVENUE CARNOT', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: 'NN', siege: true },
  { rang: 49, siren: '492313028', siret: '49231302800010', name: 'ALEXANDRE MOLMY, HUISSIER DE JUSTICE ASSOCIE', enseigne: null, naf: '69.10Z', famille: 'Professions libérales & conseil', address: '35 RUE HENRI JANIN', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: 'NN', siege: true },
  { rang: 50, siren: '401911326', siret: '40191132600015', name: 'CARNOT IMMOBILIER', enseigne: null, naf: '68.31Z', famille: 'Immobilier (agences)', address: '4 AVENUE CARNOT', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', effectif: '02', siege: true },
]
