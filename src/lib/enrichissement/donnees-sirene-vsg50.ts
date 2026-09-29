// ══════════════════════════════════════════════════════════════
// VSG.DATA.2 — Données SIRENE des 50 entreprises du BAT VSG, extraites
// du fichier source (MOJO_VSG_BAT_100_strategique.xlsx), aucun
// enrichissement externe. `siege` = colonne "Siège à VSG" du fichier
// (true si le SIRET connu correspond au siège réel de l'entreprise).
//
// ANOMALIE CORRIGÉE (VSG.DATA.2) : la valeur source brute pour CEVA
// LOGISTICS EUROPE était la CHAÎNE LITTÉRALE '1900-01-01' (confirmé,
// pas un artefact de conversion pandas — cohérente avec "Ancienneté
// (ans)=126.7" dans le fichier). Néanmoins jugée non fiable comme vraie
// date d'immatriculation (pattern classique de valeur sentinelle) —
// traitée comme date inconnue (null), jamais comme une donnée réelle.
// Sans impact fonctionnel : `companies` n'a de toute façon aucune
// colonne date de création (confirmé lors de l'audit VSG.DATA.1).
// ══════════════════════════════════════════════════════════════

export interface EntrepriseSirene {
  siren: string
  siret: string
  name: string
  enseigne: string | null
  naf: string
  naf2025: string
  address: string
  postalCode: string
  city: string
  dateCreation: string | null
  effectif: string // 'NN' = non renseigné (convention SIRENE), jamais remplacé par une valeur inventée
  siege: boolean // établissement VSG = siège réel de l'entreprise
}

export const ENTREPRISES_SIRENE_VSG_50: EntrepriseSirene[] = [
  { siren: '923178099', siret: '92317809900019', name: 'CHOUCHOU CHOUCHOU LUMANTU', enseigne: null, naf: '81.21Z', naf2025: '81.21Y', address: 'BATIMENT D3 87 AV DU PDT J FITZGERALD KENNEDY', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2022-04-01', effectif: 'NN', siege: true },
  { siren: '889352886', siret: '88935288600028', name: 'ALLO POULET', enseigne: 'ALLO POULET', naf: '56.10C', naf2025: '56.11J', address: '284 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2020-09-28', effectif: '12', siege: false },
  { siren: '444928923', siret: '44492892300028', name: 'AMINATA SY', enseigne: null, naf: '70.21Z', naf2025: '73.30Y', address: '3 RUE ROLAND GARROS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2003-01-22', effectif: 'NN', siege: true },
  { siren: '510971658', siret: '51097165800016', name: 'ELIZABETH CARDOSO', enseigne: null, naf: '47.99A', naf2025: '47.12H', address: '31 RUE FRANCIS MARTIN', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2009-02-11', effectif: 'NN', siege: true },
  { siren: '491403283', siret: '49140328300022', name: 'THAMI NAVEL', enseigne: null, naf: '49.32Z', naf2025: '49.33G', address: '176 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2006-06-01', effectif: 'NN', siege: true },
  { siren: '930150156', siret: '93015015600014', name: 'SAKIRA ISPILANTE', enseigne: 'SRL SAKIRA', naf: '47.89Z', naf2025: '47.12H', address: '9 B RUE DE LA JUSTICE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2024-06-05', effectif: 'NN', siege: true },
  { siren: '542050315', siret: '54205031500200', name: 'CEVA LOGISTICS EUROPE', enseigne: null, naf: '52.29B', naf2025: '52.25Y', address: 'ZI LES GRAVIERS ZONE INDUSTRIELLE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: null /* VSG.DATA.2 correction : valeur source '1900-01-01' jugée non fiable (sentinelle probable), jamais utilisée comme vraie date */, effectif: '32', siege: false },
  { siren: '823882006', siret: '82388200600013', name: 'FABIEN LEJEUNE', enseigne: 'LEJEUNE NETTOYAGE', naf: '81.21Z', naf2025: '81.21Y', address: '70 AVENUE DE VALENTON', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2016-11-21', effectif: 'NN', siege: true },
  { siren: '752648584', siret: '75264858400015', name: 'PLANETA LATINO', enseigne: "L'ESPERANCE", naf: '56.30Z', naf2025: '56.30Y', address: '144 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2012-07-15', effectif: 'NN', siege: true },
  { siren: '851968966', siret: '85196896600016', name: 'MAGALI CATHERINE', enseigne: null, naf: '82.19Z', naf2025: '82.10Y', address: '7 RUE THIMONNIER', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2019-05-01', effectif: 'NN', siege: true },
  { siren: '931188304', siret: '93118830400014', name: "UNIV'HAIR", enseigne: null, naf: '96.02A', naf2025: '96.21G', address: '4 AVENUE DES FUSILLES', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2024-07-06', effectif: 'NN', siege: true },
  { siren: '509503777', siret: '50950377700013', name: 'SARL EMERAUDE CONDUITE', enseigne: null, naf: '85.53Z', naf2025: '85.53Y', address: '3 RUE ROBERT SCHUMANN', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2008-12-16', effectif: 'NN', siege: true },
  { siren: '382711919', siret: '38271191900037', name: 'WILLIOME RIGUEUR', enseigne: 'ENTREPRISE RIGUEUR', naf: '43.34Z', naf2025: '43.34G', address: '2 ALLEE ROGER CALVIER', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '1991-09-01', effectif: 'NN', siege: true },
  { siren: '453757973', siret: '45375797300012', name: 'CCPJJ', enseigne: null, naf: '71.20A', naf2025: '71.20G', address: '181 AVENUE DE LA DIVISION LECLERC', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2004-04-01', effectif: '02', siege: true },
  { siren: '850269044', siret: '85026904400010', name: 'RACHID DJEBLI', enseigne: null, naf: '47.81Z', naf2025: '47.21Y', address: '48 B RUE EMILE ZOLA', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2019-04-23', effectif: 'NN', siege: true },
  { siren: '823091707', siret: '82309170701912', name: 'LIPPI', enseigne: 'MERCIER PERE ET FILS', naf: '43.22A', naf2025: '43.22G', address: '47 RUE HENRI JANIN', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2016-10-04', effectif: 'NN', siege: false },
  { siren: '931267561', siret: '93126756100013', name: 'HERALDY JEAN-SIMON', enseigne: null, naf: '53.20Z', naf2025: '53.20G', address: '32 AVENUE DE CHOISY', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2024-07-21', effectif: 'NN', siege: true },
  { siren: '847638814', siret: '84763881400016', name: 'JKM VILLENEUVE', enseigne: 'ECV-ECOLE DE CONDUITE VILLENEUVOISE', naf: '85.53Z', naf2025: '85.53Y', address: '24 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2019-01-23', effectif: '02', siege: true },
  { siren: '801207788', siret: '80120778800028', name: 'AUTO RG EXPRESS', enseigne: null, naf: '45.20A', naf2025: '95.31G', address: '12 RUE BRANLY', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2014-03-03', effectif: '01', siege: true },
  { siren: '966201717', siret: '96620171700024', name: 'INTEGRALE DE CHAUFFAGE ET PLOMBERIE', enseigne: null, naf: '43.22B', naf2025: '43.22H', address: '21 B AVENUE CARNOT', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '1966-01-01', effectif: 'NN', siege: true },
  { siren: '822818191', siret: '82281819100014', name: 'RACHID ABBOUTI', enseigne: 'R - A SPRINK', naf: '43.21A', naf2025: '43.21G', address: '3 RUE AUGUSTE ET LOUIS LUMIERE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2016-09-26', effectif: 'NN', siege: true },
  { siren: '503698664', siret: '50369866400672', name: 'FONCIA TRANSACTION FRANCE', enseigne: null, naf: '68.31Z', naf2025: '68.31Y', address: '12 PLACE PIERRE SEMARD', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2008-04-01', effectif: '42', siege: false },
  { siren: '848030912', siret: '84803091200028', name: 'HADAMA FOFANA', enseigne: null, naf: '53.20Z', naf2025: '53.20H', address: '7 B AVENUE DE VALENTON', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2019-02-25', effectif: 'NN', siege: true },
  { siren: '883261752', siret: '88326175200017', name: 'BKS EXOTIQUE', enseigne: null, naf: '47.11B', naf2025: '47.11G', address: '26 RUE EMILE ZOLA', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2020-04-01', effectif: '02', siege: true },
  { siren: '502722473', siret: '50272247300019', name: 'GARAGE B.B. AUTOS', enseigne: null, naf: '45.20A', naf2025: '95.31G', address: '44 RUE VOLTAIRE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2008-01-02', effectif: '02', siege: true },
  { siren: '902579937', siret: '90257993700019', name: 'EMILIE JACQUES', enseigne: 'EMERIZ NAILS', naf: '96.02B', naf2025: '96.22Y', address: '19 RUE GUSTAVE FLAUBERT', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2021-08-25', effectif: 'NN', siege: true },
  { siren: '819267196', siret: '81926719600015', name: 'CAROLINE BA', enseigne: null, naf: '68.31Z', naf2025: '68.31Y', address: '2 RUE HENRI JANIN', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2016-03-01', effectif: 'NN', siege: true },
  { siren: '444576920', siret: '44457692000011', name: 'ALLO AUTO CONTROLE TECH VILLENEUVE ST GE', enseigne: null, naf: '71.20A', naf2025: '71.20G', address: '172 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2002-12-18', effectif: '02', siege: true },
  { siren: '818388209', siret: '81838820900012', name: 'YOUCEF MOUKAH', enseigne: null, naf: '70.22Z', naf2025: '70.20Y', address: '49 RUE HENRI JANIN', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2016-02-01', effectif: 'NN', siege: true },
  { siren: '833055155', siret: '83305515500034', name: 'ASSANE DIOP', enseigne: null, naf: '70.22Z', naf2025: '70.20Y', address: '5 RUE THIMONNIER', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2017-10-12', effectif: 'NN', siege: true },
  { siren: '803534940', siret: '80353494000017', name: 'JORDAN JINGUENAUD', enseigne: null, naf: '43.91B', naf2025: '43.41H', address: '101 AV DU PDT J FITZGERALD KENNEDY', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2014-05-01', effectif: 'NN', siege: true },
  { siren: '892483843', siret: '89248384300017', name: 'BG SEA FOOD', enseigne: 'BG SEA FOOD', naf: '47.23Z', naf2025: '47.23Y', address: '18 AVENUE CARNOT', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2020-12-24', effectif: '02', siege: true },
  { siren: '481607893', siret: '48160789300015', name: 'CHOCOPAIN', enseigne: null, naf: '10.71C', naf2025: '10.71H', address: '10 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2005-03-01', effectif: '02', siege: true },
  { siren: '810919258', siret: '81091925800014', name: 'KAER VSG PNEUS', enseigne: null, naf: '45.20A', naf2025: '95.31G', address: '192 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2015-04-20', effectif: '02', siege: true },
  { siren: '984064600', siret: '98406460000021', name: 'OLLSON PAUL', enseigne: 'OLLSON INVEST GROUP', naf: '82.99Z', naf2025: '82.40Y', address: '83 AV DU PDT J FITZGERALD KENNEDY', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2024-01-25', effectif: 'NN', siege: true },
  { siren: '338375868', siret: '33837586800019', name: 'SOFIANE', enseigne: null, naf: '41.10D', naf2025: '68.32G', address: "15 RUE DE L'EGLISE", postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '1986-07-25', effectif: 'NN', siege: true },
  { siren: '533106431', siret: '53310643100018', name: "ELSA'S BEAUTY", enseigne: "ELSA'S BEAUTY", naf: '96.02B', naf2025: '96.22Y', address: '18 RUE MICHELET', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2011-06-08', effectif: 'NN', siege: true },
  { siren: '802072801', siret: '80207280100029', name: 'CHRISTELLE MALAC', enseigne: null, naf: '70.22Z', naf2025: '70.20Y', address: '5 CHEMIN NIKI DE SAINT-PHALLE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2014-05-02', effectif: 'NN', siege: true },
  { siren: '904898863', siret: '90489886300025', name: 'SAYED BEN FRADJ', enseigne: null, naf: '86.90D', naf2025: '86.94G', address: '1 RUE HENRI SELLIER', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2021-07-04', effectif: 'NN', siege: true },
  { siren: '510027626', siret: '51002762600017', name: 'LVN', enseigne: 'LA VILLA NOVA', naf: '56.10C', naf2025: '56.11J', address: '41 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2009-02-01', effectif: 'NN', siege: true },
  { siren: '823297619', siret: '82329761900012', name: "LA TABLE D'ABRAHAM", enseigne: null, naf: '56.21Z', naf2025: '56.21Y', address: '98 AVENUE DE CHOISY', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2016-09-15', effectif: 'NN', siege: true },
  { siren: '343885042', siret: '34388504200022', name: 'GENEVIEVE DELORME', enseigne: null, naf: '86.90E', naf2025: '86.99Y', address: '27 AVENUE CARNOT', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '1988-02-01', effectif: 'NN', siege: true },
  { siren: '880481163', siret: '88048116300017', name: 'KIONA ART GROUP', enseigne: null, naf: '47.78C', naf2025: '47.78H', address: '14 RUE DES CHENES', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2020-01-02', effectif: 'NN', siege: true },
  { siren: '884252479', siret: '88425247900024', name: 'MK BARBER', enseigne: null, naf: '96.02A', naf2025: '96.21G', address: '158 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2020-06-10', effectif: '01', siege: false },
  { siren: '442805016', siret: '44280501600015', name: 'DAVID OLIVEIRA', enseigne: null, naf: '86.90E', naf2025: '86.95Y', address: '27 AVENUE ANATOLE FRANCE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2002-07-16', effectif: 'NN', siege: true },
  { siren: '508146586', siret: '50814658600013', name: 'SRI SARASWATHI', enseigne: null, naf: '96.02A', naf2025: '96.21G', address: '11 RUE DE PARIS', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2008-03-01', effectif: 'NN', siege: true },
  { siren: '531825974', siret: '53182597400011', name: 'NOURREDINE BELHAJ', enseigne: null, naf: '49.32Z', naf2025: '49.33G', address: '2 RUE JEAN-JACQUES ROUSSEAU', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2011-05-10', effectif: 'NN', siege: true },
  { siren: '529096422', siret: '52909642200017', name: 'MICHAEL ESTEVES', enseigne: null, naf: '43.99C', naf2025: '43.91Y', address: '76 B RUE GAMBETTA', postalCode: '94190', city: 'VILLENEUVE ST GEORGES', dateCreation: '2011-01-01', effectif: 'NN', siege: true },
  { siren: '490025749', siret: '49002574900022', name: 'C.J.P.', enseigne: null, naf: '56.10C', naf2025: '56.11J', address: '5 RUE NOBLEMAIRE', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2006-03-31', effectif: 'NN', siege: true },
  { siren: '928762400', siret: '92876240000010', name: 'ABDERRAZAK KHALIFA', enseigne: null, naf: '82.99Z', naf2025: '82.99Y', address: '97 AVENUE DE VALENTON', postalCode: '94190', city: 'VILLENEUVE-SAINT-GEORGES', dateCreation: '2023-01-01', effectif: 'NN', siege: true },
]
