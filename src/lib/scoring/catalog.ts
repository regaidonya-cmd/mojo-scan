// ══════════════════════════════════════════════════════════════
// MOJO LEAD ENGINE — Catalogue officiel PROG-001..030
// Source : Catalogue_OPCO_MOJO_Complet_avec_Parcours_v2
// Prix : 7h=990€ / 14h=1490€ / 21h=2200€ / 35h=3200€
// ══════════════════════════════════════════════════════════════

export interface Programme {
  id: string          // PROG-001..030
  pilier: string
  titre: string
  duree_h: number
  tarif_ht: number
  niveau: 'Essentiel' | 'Opérationnel' | 'Mise en œuvre'
  objectif: string
  resultat: string
  actif: boolean
}

export interface Module {
  id: string          // MOD-XXX-00
  module: string
  famille: string
  mots_cles: string[]
  poids_defaut: number
  actif: boolean
}

export interface ProgrammeModule {
  id_programme: string
  id_module: string
  poids: number       // 1-5 (5=central)
}

export interface Parcours {
  id: string          // PARC-001..006
  metier: string
  nom: string
  duree_h: number
  tarif_ht: number
  promesse: string
  programmes_prioritaires: string[]
  actif: boolean
}

export interface APEMapping {
  version_naf: string
  code_ape: string
  libelle_ape: string
  id_parcours: string
  priorite: number
  confiance: 'Forte' | 'Moyenne' | 'Faible'
  regle_validation: string
  actif: boolean
}

// ── 30 PROGRAMMES ──────────────────────────────────────────────
export const PROGRAMMES: Programme[] = [
  { id:'PROG-001', pilier:'Générer plus de clients',      titre:'Développer sa visibilité locale grâce au référencement Google', duree_h:14, tarif_ht:1490, niveau:'Opérationnel',  objectif:'Être mieux trouvé sur Google par les clients de sa zone',                          resultat:'Diagnostic SEO local + plan d\'action 90 jours',                     actif:true },
  { id:'PROG-002', pilier:'Générer plus de clients',      titre:'Optimiser sa fiche Google Business Profile',                    duree_h:7,  tarif_ht:990,  niveau:'Essentiel',     objectif:'Améliorer sa visibilité et son attractivité sur Google et Maps',                   resultat:'Fiche Google optimisée + plan de collecte d\'avis',                  actif:true },
  { id:'PROG-003', pilier:'Générer plus de clients',      titre:'Développer sa communication digitale sur les réseaux sociaux',  duree_h:14, tarif_ht:1490, niveau:'Opérationnel',  objectif:'Développer une présence sociale régulière au service de son activité',             resultat:'Stratégie social media + calendrier éditorial 30 jours',             actif:true },
  { id:'PROG-004', pilier:'Générer plus de clients',      titre:'Construire une stratégie d\'acquisition digitale',             duree_h:14, tarif_ht:1490, niveau:'Opérationnel',  objectif:'Structurer les leviers permettant de générer davantage de prospects',              resultat:'Plan d\'acquisition digitale 90 jours',                              actif:true },
  { id:'PROG-005', pilier:'Générer plus de clients',      titre:'Mettre en place des campagnes publicitaires digitales',        duree_h:14, tarif_ht:1490, niveau:'Opérationnel',  objectif:'Créer et piloter des campagnes publicitaires orientées résultats',                 resultat:'Structure de campagne + ciblages + budget + tableau de pilotage',    actif:true },
  { id:'PROG-006', pilier:'Gagner du temps avec l\'IA',   titre:'Utiliser ChatGPT dans un contexte professionnel',              duree_h:7,  tarif_ht:990,  niveau:'Essentiel',     objectif:'Utiliser ChatGPT efficacement et de façon responsable dans son activité',          resultat:'Bibliothèque de prompts métier personnalisés',                       actif:true },
  { id:'PROG-007', pilier:'Gagner du temps avec l\'IA',   titre:'Intégrer l\'intelligence artificielle dans son activité',     duree_h:14, tarif_ht:1490, niveau:'Opérationnel',  objectif:'Identifier et déployer les usages IA pertinents pour son activité',               resultat:'Cartographie des cas d\'usage + plan d\'intégration IA',            actif:true },
  { id:'PROG-008', pilier:'Gagner du temps avec l\'IA',   titre:'Automatiser ses tâches grâce aux outils no-code et à l\'IA', duree_h:14, tarif_ht:1490, niveau:'Opérationnel',  objectif:'Réduire le temps consacré aux tâches répétitives',                                resultat:'Workflow automatisé + cartographie des automatisations possibles',    actif:true },
  { id:'PROG-009', pilier:'Gagner du temps avec l\'IA',   titre:'Créer des assistants IA métier',                              duree_h:14, tarif_ht:1490, niveau:'Opérationnel',  objectif:'Créer des assistants IA adaptés à ses situations professionnelles',               resultat:'Assistant IA métier configuré + documentation d\'utilisation',       actif:true },
  { id:'PROG-010', pilier:'Gagner du temps avec l\'IA',   titre:'Créer des contenus professionnels avec l\'IA',               duree_h:7,  tarif_ht:990,  niveau:'Essentiel',     objectif:'Produire plus rapidement des contenus adaptés à son activité',                    resultat:'Kit de contenus + bibliothèque de prompts',                          actif:true },
  { id:'PROG-011', pilier:'Mieux convertir & fidéliser',  titre:'Structurer sa relation client grâce à un CRM',               duree_h:14, tarif_ht:1490, niveau:'Opérationnel',  objectif:'Améliorer le suivi des prospects et des clients',                                 resultat:'Pipeline CRM + segmentation + processus de suivi',                   actif:true },
  { id:'PROG-012', pilier:'Mieux convertir & fidéliser',  titre:'Utiliser WhatsApp Business dans un cadre professionnel',      duree_h:7,  tarif_ht:990,  niveau:'Essentiel',     objectif:'Professionnaliser la relation client via WhatsApp',                               resultat:'Profil + catalogue + messages types + organisation des contacts',    actif:true },
  { id:'PROG-013', pilier:'Mieux convertir & fidéliser',  titre:'Mettre en place une stratégie de fidélisation client',        duree_h:7,  tarif_ht:990,  niveau:'Essentiel',     objectif:'Faire revenir davantage ses clients et développer la recommandation',             resultat:'Plan de fidélisation et de réactivation',                            actif:true },
  { id:'PROG-014', pilier:'Mieux convertir & fidéliser',  titre:'Optimiser son parcours client',                               duree_h:7,  tarif_ht:990,  niveau:'Essentiel',     objectif:'Réduire les frictions et améliorer l\'expérience client',                        resultat:'Cartographie du parcours client + plan d\'amélioration',            actif:true },
  { id:'PROG-015', pilier:'Mieux convertir & fidéliser',  titre:'Automatiser ses relances commerciales',                       duree_h:7,  tarif_ht:990,  niveau:'Essentiel',     objectif:'Relancer systématiquement les prospects et opportunités',                         resultat:'Scénarios de relance prêts à déployer',                              actif:true },
  { id:'PROG-016', pilier:'Structurer & digitaliser',     titre:'Digitaliser l\'organisation de son activité',                duree_h:14, tarif_ht:1490, niveau:'Opérationnel',  objectif:'Structurer une organisation numérique plus efficace',                             resultat:'Diagnostic organisationnel + plan de digitalisation',                actif:true },
  { id:'PROG-017', pilier:'Structurer & digitaliser',     titre:'Utiliser des outils collaboratifs dans un cadre professionnel', duree_h:7, tarif_ht:990, niveau:'Essentiel',    objectif:'Mieux partager l\'information et collaborer',                                    resultat:'Organisation collaborative + bonnes pratiques',                      actif:true },
  { id:'PROG-018', pilier:'Structurer & digitaliser',     titre:'Structurer ses workflows et processus digitaux',              duree_h:14, tarif_ht:1490, niveau:'Opérationnel',  objectif:'Formaliser et optimiser les processus récurrents',                                resultat:'Cartographie des workflows + processus cible',                       actif:true },
  { id:'PROG-019', pilier:'Structurer & digitaliser',     titre:'Utiliser Notion pour organiser son activité',                 duree_h:7,  tarif_ht:990,  niveau:'Essentiel',     objectif:'Centraliser informations, tâches et projets',                                     resultat:'Espace Notion structuré',                                            actif:true },
  { id:'PROG-020', pilier:'Structurer & digitaliser',     titre:'Déployer des outils numériques dans son entreprise',          duree_h:14, tarif_ht:1490, niveau:'Opérationnel',  objectif:'Choisir et intégrer les outils adaptés aux besoins de l\'entreprise',            resultat:'Cartographie des outils + feuille de route de déploiement',         actif:true },
  { id:'PROG-021', pilier:'Piloter son activité',         titre:'Maîtriser Google Analytics 4 et piloter sa data',            duree_h:14, tarif_ht:1490, niveau:'Opérationnel',  objectif:'Comprendre et mesurer les performances de son écosystème digital',               resultat:'Plan de mesure GA4 + configuration/contrôle des indicateurs clés',   actif:true },
  { id:'PROG-022', pilier:'Piloter son activité',         titre:'Construire des tableaux de bord et KPI',                     duree_h:7,  tarif_ht:990,  niveau:'Essentiel',     objectif:'Piloter son activité avec des indicateurs réellement utiles',                    resultat:'Tableau de bord KPI',                                                actif:true },
  { id:'PROG-023', pilier:'Piloter son activité',         titre:'Analyser les performances de sa stratégie digitale',         duree_h:7,  tarif_ht:990,  niveau:'Essentiel',     objectif:'Transformer ses données digitales en décisions',                                  resultat:'Diagnostic de performance + recommandations',                        actif:true },
  { id:'PROG-024', pilier:'Piloter son activité',         titre:'Mettre en place un reporting digital',                       duree_h:7,  tarif_ht:990,  niveau:'Essentiel',     objectif:'Produire un reporting clair, régulier et exploitable',                            resultat:'Modèle de reporting réutilisable',                                   actif:true },
  { id:'PROG-025', pilier:'Piloter son activité',         titre:'Piloter son activité grâce aux données',                     duree_h:14, tarif_ht:1490, niveau:'Opérationnel',  objectif:'Utiliser les données pour orienter ses décisions',                                resultat:'Tableau de pilotage + méthode d\'analyse',                          actif:true },
  { id:'PROG-026', pilier:'Créer un site performant',     titre:'Créer un site WordPress professionnel',                      duree_h:21, tarif_ht:2200, niveau:'Mise en œuvre', objectif:'Créer et administrer un site WordPress professionnel',                             resultat:'Site ou prototype fonctionnel et administrable',                     actif:true },
  { id:'PROG-027', pilier:'Créer un site performant',     titre:'Concevoir des pages web orientées conversion',               duree_h:7,  tarif_ht:990,  niveau:'Essentiel',     objectif:'Transformer davantage de visiteurs en contacts',                                  resultat:'Page ou maquette optimisée pour la conversion',                      actif:true },
  { id:'PROG-028', pilier:'Créer un site performant',     titre:'Optimiser le référencement SEO d\'un site WordPress',       duree_h:7,  tarif_ht:990,  niveau:'Essentiel',     objectif:'Améliorer la visibilité organique de son site WordPress',                        resultat:'Pages optimisées + plan d\'action SEO',                             actif:true },
  { id:'PROG-029', pilier:'Créer un site performant',     titre:'Optimiser l\'expérience utilisateur d\'un site web',        duree_h:7,  tarif_ht:990,  niveau:'Essentiel',     objectif:'Améliorer l\'ergonomie et le parcours des visiteurs',                            resultat:'Audit UX simplifié + recommandations prioritaires',                  actif:true },
  { id:'PROG-030', pilier:'Créer un site performant',     titre:'Améliorer les performances d\'un site internet',            duree_h:7,  tarif_ht:990,  niveau:'Essentiel',     objectif:'Améliorer rapidité, fiabilité et qualité technique du site',                     resultat:'Diagnostic technique + plan d\'optimisation',                        actif:true },
]

// ── MAPPING PROGRAMMES → MODULES (extrait du Sheets) ───────────
export const MAPPING_PROG_MOD: ProgrammeModule[] = [
  {id_programme:'PROG-001',id_module:'MOD-SEO-02',poids:5},{id_programme:'PROG-001',id_module:'MOD-SEO-01',poids:4},{id_programme:'PROG-001',id_module:'MOD-GBP-01',poids:4},{id_programme:'PROG-001',id_module:'MOD-GBP-02',poids:4},{id_programme:'PROG-001',id_module:'MOD-SEO-03',poids:3},{id_programme:'PROG-001',id_module:'MOD-REP-01',poids:2},
  {id_programme:'PROG-002',id_module:'MOD-GBP-01',poids:5},{id_programme:'PROG-002',id_module:'MOD-GBP-02',poids:4},{id_programme:'PROG-002',id_module:'MOD-REP-01',poids:4},{id_programme:'PROG-002',id_module:'MOD-SEO-02',poids:3},{id_programme:'PROG-002',id_module:'MOD-REP-02',poids:2},
  {id_programme:'PROG-003',id_module:'MOD-SOC-01',poids:5},{id_programme:'PROG-003',id_module:'MOD-CONT-01',poids:4},{id_programme:'PROG-003',id_module:'MOD-CONT-03',poids:4},{id_programme:'PROG-003',id_module:'MOD-SOC-02',poids:3},{id_programme:'PROG-003',id_module:'MOD-SOC-03',poids:2},{id_programme:'PROG-003',id_module:'MOD-SOC-04',poids:2},{id_programme:'PROG-003',id_module:'MOD-CONT-02',poids:2},
  {id_programme:'PROG-004',id_module:'MOD-ACQ-01',poids:5},{id_programme:'PROG-004',id_module:'MOD-ACQ-02',poids:4},{id_programme:'PROG-004',id_module:'MOD-CONV-03',poids:4},{id_programme:'PROG-004',id_module:'MOD-SEO-01',poids:3},{id_programme:'PROG-004',id_module:'MOD-ADS-01',poids:2},{id_programme:'PROG-004',id_module:'MOD-ADS-02',poids:2},{id_programme:'PROG-004',id_module:'MOD-CONV-01',poids:3},
  {id_programme:'PROG-005',id_module:'MOD-ADS-01',poids:5},{id_programme:'PROG-005',id_module:'MOD-ADS-02',poids:5},{id_programme:'PROG-005',id_module:'MOD-ADS-03',poids:4},{id_programme:'PROG-005',id_module:'MOD-CONV-01',poids:4},{id_programme:'PROG-005',id_module:'MOD-DATA-08',poids:3},
  {id_programme:'PROG-006',id_module:'MOD-IA-01',poids:5},{id_programme:'PROG-006',id_module:'MOD-IA-03',poids:5},{id_programme:'PROG-006',id_module:'MOD-IA-04',poids:3},{id_programme:'PROG-006',id_module:'MOD-IA-05',poids:3},{id_programme:'PROG-006',id_module:'MOD-IA-07',poids:2},
  {id_programme:'PROG-007',id_module:'MOD-IA-02',poids:5},{id_programme:'PROG-007',id_module:'MOD-IA-04',poids:5},{id_programme:'PROG-007',id_module:'MOD-IA-05',poids:4},{id_programme:'PROG-007',id_module:'MOD-IA-01',poids:3},{id_programme:'PROG-007',id_module:'MOD-IA-07',poids:3},
  {id_programme:'PROG-008',id_module:'MOD-AUTO-01',poids:5},{id_programme:'PROG-008',id_module:'MOD-AUTO-05',poids:5},{id_programme:'PROG-008',id_module:'MOD-AUTO-02',poids:4},{id_programme:'PROG-008',id_module:'MOD-AUTO-03',poids:3},{id_programme:'PROG-008',id_module:'MOD-AUTO-04',poids:2},{id_programme:'PROG-008',id_module:'MOD-IA-02',poids:3},
  {id_programme:'PROG-009',id_module:'MOD-IA-08',poids:5},{id_programme:'PROG-009',id_module:'MOD-IA-09',poids:5},{id_programme:'PROG-009',id_module:'MOD-IA-03',poids:4},{id_programme:'PROG-009',id_module:'MOD-IA-04',poids:4},
  {id_programme:'PROG-010',id_module:'MOD-IA-06',poids:5},{id_programme:'PROG-010',id_module:'MOD-IA-01',poids:4},{id_programme:'PROG-010',id_module:'MOD-IA-03',poids:4},{id_programme:'PROG-010',id_module:'MOD-CONT-01',poids:4},{id_programme:'PROG-010',id_module:'MOD-CONT-03',poids:2},
  {id_programme:'PROG-011',id_module:'MOD-CRM-01',poids:5},{id_programme:'PROG-011',id_module:'MOD-CRM-02',poids:5},{id_programme:'PROG-011',id_module:'MOD-CRM-03',poids:4},{id_programme:'PROG-011',id_module:'MOD-CRM-04',poids:3},{id_programme:'PROG-011',id_module:'MOD-CRM-05',poids:3},
  {id_programme:'PROG-012',id_module:'MOD-WA-01',poids:5},{id_programme:'PROG-012',id_module:'MOD-CRM-04',poids:2},{id_programme:'PROG-012',id_module:'MOD-FID-01',poids:3},{id_programme:'PROG-012',id_module:'MOD-CONV-01',poids:3},
  {id_programme:'PROG-013',id_module:'MOD-FID-01',poids:5},{id_programme:'PROG-013',id_module:'MOD-FID-02',poids:4},{id_programme:'PROG-013',id_module:'MOD-CRM-04',poids:3},{id_programme:'PROG-013',id_module:'MOD-EMAIL-01',poids:3},{id_programme:'PROG-013',id_module:'MOD-WA-01',poids:3},{id_programme:'PROG-013',id_module:'MOD-REP-01',poids:2},
  {id_programme:'PROG-014',id_module:'MOD-UX-01',poids:5},{id_programme:'PROG-014',id_module:'MOD-UX-02',poids:5},{id_programme:'PROG-014',id_module:'MOD-CONV-01',poids:4},{id_programme:'PROG-014',id_module:'MOD-UX-03',poids:3},{id_programme:'PROG-014',id_module:'MOD-FID-01',poids:3},
  {id_programme:'PROG-015',id_module:'MOD-CRM-05',poids:5},{id_programme:'PROG-015',id_module:'MOD-AUTO-01',poids:4},{id_programme:'PROG-015',id_module:'MOD-CRM-01',poids:4},{id_programme:'PROG-015',id_module:'MOD-EMAIL-01',poids:3},{id_programme:'PROG-015',id_module:'MOD-CRM-04',poids:3},
  {id_programme:'PROG-016',id_module:'MOD-ORG-01',poids:5},{id_programme:'PROG-016',id_module:'MOD-ORG-02',poids:5},{id_programme:'PROG-016',id_module:'MOD-ORG-03',poids:3},{id_programme:'PROG-016',id_module:'MOD-AUTO-01',poids:3},
  {id_programme:'PROG-017',id_module:'MOD-ORG-03',poids:5},{id_programme:'PROG-017',id_module:'MOD-ORG-04',poids:4},{id_programme:'PROG-017',id_module:'MOD-ORG-05',poids:4},{id_programme:'PROG-017',id_module:'MOD-ORG-02',poids:3},
  {id_programme:'PROG-018',id_module:'MOD-PROC-01',poids:5},{id_programme:'PROG-018',id_module:'MOD-PROC-02',poids:5},{id_programme:'PROG-018',id_module:'MOD-AUTO-01',poids:4},{id_programme:'PROG-018',id_module:'MOD-AUTO-05',poids:4},{id_programme:'PROG-018',id_module:'MOD-ORG-02',poids:3},
  {id_programme:'PROG-019',id_module:'MOD-ORG-06',poids:5},{id_programme:'PROG-019',id_module:'MOD-ORG-02',poids:4},{id_programme:'PROG-019',id_module:'MOD-PROC-01',poids:3},
  {id_programme:'PROG-020',id_module:'MOD-ORG-01',poids:5},{id_programme:'PROG-020',id_module:'MOD-ORG-02',poids:4},{id_programme:'PROG-020',id_module:'MOD-ORG-03',poids:3},{id_programme:'PROG-020',id_module:'MOD-PROC-02',poids:3},
  {id_programme:'PROG-021',id_module:'MOD-DATA-01',poids:5},{id_programme:'PROG-021',id_module:'MOD-DATA-02',poids:5},{id_programme:'PROG-021',id_module:'MOD-DATA-03',poids:4},{id_programme:'PROG-021',id_module:'MOD-DATA-07',poids:4},
  {id_programme:'PROG-022',id_module:'MOD-DATA-04',poids:5},{id_programme:'PROG-022',id_module:'MOD-DATA-03',poids:5},{id_programme:'PROG-022',id_module:'MOD-DATA-05',poids:3},
  {id_programme:'PROG-023',id_module:'MOD-DATA-07',poids:5},{id_programme:'PROG-023',id_module:'MOD-DATA-03',poids:4},{id_programme:'PROG-023',id_module:'MOD-DATA-08',poids:4},{id_programme:'PROG-023',id_module:'MOD-CONV-01',poids:3},
  {id_programme:'PROG-024',id_module:'MOD-DATA-06',poids:5},{id_programme:'PROG-024',id_module:'MOD-DATA-04',poids:4},{id_programme:'PROG-024',id_module:'MOD-DATA-03',poids:4},{id_programme:'PROG-024',id_module:'MOD-DATA-05',poids:3},
  {id_programme:'PROG-025',id_module:'MOD-DATA-03',poids:5},{id_programme:'PROG-025',id_module:'MOD-DATA-04',poids:4},{id_programme:'PROG-025',id_module:'MOD-DATA-08',poids:4},{id_programme:'PROG-025',id_module:'MOD-DATA-06',poids:3},
  {id_programme:'PROG-026',id_module:'MOD-WEB-01',poids:5},{id_programme:'PROG-026',id_module:'MOD-WEB-02',poids:4},{id_programme:'PROG-026',id_module:'MOD-WEB-03',poids:4},{id_programme:'PROG-026',id_module:'MOD-WEB-08',poids:2},
  {id_programme:'PROG-027',id_module:'MOD-CONV-02',poids:5},{id_programme:'PROG-027',id_module:'MOD-CONV-01',poids:5},{id_programme:'PROG-027',id_module:'MOD-UX-03',poids:4},{id_programme:'PROG-027',id_module:'MOD-CONV-03',poids:4},
  {id_programme:'PROG-028',id_module:'MOD-WEB-04',poids:5},{id_programme:'PROG-028',id_module:'MOD-SEO-03',poids:4},{id_programme:'PROG-028',id_module:'MOD-SEO-01',poids:4},{id_programme:'PROG-028',id_module:'MOD-WEB-05',poids:3},
  {id_programme:'PROG-029',id_module:'MOD-UX-03',poids:5},{id_programme:'PROG-029',id_module:'MOD-UX-01',poids:4},{id_programme:'PROG-029',id_module:'MOD-UX-02',poids:4},{id_programme:'PROG-029',id_module:'MOD-CONV-01',poids:3},
  {id_programme:'PROG-030',id_module:'MOD-WEB-06',poids:5},{id_programme:'PROG-030',id_module:'MOD-WEB-07',poids:5},{id_programme:'PROG-030',id_module:'MOD-WEB-05',poids:3},{id_programme:'PROG-030',id_module:'MOD-WEB-08',poids:3},
]

// ── 6 PARCOURS MÉTIERS ──────────────────────────────────────────
export const PARCOURS: Parcours[] = [
  { id:'PARC-001', metier:'Diagnostiqueur immobilier',       nom:'Développer son activité de diagnostic immobilier grâce au digital et à l\'IA', duree_h:35, tarif_ht:3200, promesse:'Gagner en visibilité locale, générer davantage de demandes et gagner du temps',     programmes_prioritaires:['PROG-001','PROG-002','PROG-006','PROG-011','PROG-015'], actif:true },
  { id:'PARC-002', metier:'Auto-école',                      nom:'Développer les inscriptions et digitaliser la relation élève',                 duree_h:35, tarif_ht:3200, promesse:'Attirer davantage d\'élèves et mieux gérer leur parcours',                           programmes_prioritaires:['PROG-001','PROG-003','PROG-011','PROG-012','PROG-015'], actif:true },
  { id:'PARC-003', metier:'Restaurant',                      nom:'Développer la fréquentation et fidéliser sa clientèle grâce au digital',      duree_h:35, tarif_ht:3200, promesse:'Être trouvé localement, attirer de nouveaux clients et augmenter la récurrence',   programmes_prioritaires:['PROG-002','PROG-003','PROG-010','PROG-012','PROG-013'], actif:true },
  { id:'PARC-004', metier:'Beauté - Coiffure - Esthétique',  nom:'Remplir son agenda et fidéliser sa clientèle grâce au digital et à l\'IA',   duree_h:35, tarif_ht:3200, promesse:'Générer davantage de rendez-vous et augmenter la fréquence de visite',             programmes_prioritaires:['PROG-002','PROG-003','PROG-010','PROG-012','PROG-013'], actif:true },
  { id:'PARC-005', metier:'Artisan & commerçant',            nom:'Générer plus de demandes locales grâce au digital',                           duree_h:35, tarif_ht:3200, promesse:'Être visible localement, générer des demandes et mieux suivre les prospects',       programmes_prioritaires:['PROG-001','PROG-002','PROG-006','PROG-011','PROG-015'], actif:true },
  { id:'PARC-006', metier:'Profession libérale',             nom:'Développer et digitaliser son activité professionnelle',                      duree_h:35, tarif_ht:3200, promesse:'Développer sa visibilité, structurer sa relation client et gagner du temps',        programmes_prioritaires:['PROG-001','PROG-006','PROG-007','PROG-011','PROG-016'], actif:true },
]

// ── MAPPING APE → PARCOURS ──────────────────────────────────────
export const APE_MAPPING: APEMapping[] = [
  { version_naf:'NAF_REV2', code_ape:'71.20B', libelle_ape:'Analyses, essais et inspections techniques', id_parcours:'PARC-001', priorite:5, confiance:'Moyenne', regle_validation:'Confirmer que l\'activité correspond au diagnostic immobilier', actif:true },
  { version_naf:'NAF_REV2', code_ape:'85.53Z', libelle_ape:'Enseignement de la conduite',               id_parcours:'PARC-002', priorite:5, confiance:'Forte',   regle_validation:'Confirmer auto-école ou enseignement de la conduite automobile', actif:true },
  { version_naf:'NAF_REV2', code_ape:'56.10A', libelle_ape:'Restauration traditionnelle',               id_parcours:'PARC-003', priorite:5, confiance:'Forte',   regle_validation:'Aucune validation complémentaire sauf activité atypique', actif:true },
  { version_naf:'NAF_REV2', code_ape:'56.10B', libelle_ape:'Cafétérias et autres libres-services',      id_parcours:'PARC-003', priorite:4, confiance:'Forte',   regle_validation:'Confirmer activité de restauration', actif:true },
  { version_naf:'NAF_REV2', code_ape:'56.10C', libelle_ape:'Restauration de type rapide',               id_parcours:'PARC-003', priorite:5, confiance:'Forte',   regle_validation:'Aucune validation complémentaire sauf activité atypique', actif:true },
  { version_naf:'NAF_REV2', code_ape:'96.02A', libelle_ape:'Coiffure',                                  id_parcours:'PARC-004', priorite:5, confiance:'Forte',   regle_validation:'Aucune validation complémentaire', actif:true },
  { version_naf:'NAF_REV2', code_ape:'96.02B', libelle_ape:'Soins de beauté',                           id_parcours:'PARC-004', priorite:5, confiance:'Forte',   regle_validation:'Aucune validation complémentaire', actif:true },
  // Extensions logiques non encore dans le Sheets
  { version_naf:'NAF_REV2', code_ape:'41.20A', libelle_ape:'Construction de maisons individuelles',     id_parcours:'PARC-005', priorite:4, confiance:'Forte',   regle_validation:'Confirmer activité artisan BTP', actif:true },
  { version_naf:'NAF_REV2', code_ape:'43.21A', libelle_ape:'Travaux d\'installation électrique',       id_parcours:'PARC-005', priorite:4, confiance:'Forte',   regle_validation:'Confirmer activité artisan', actif:true },
  { version_naf:'NAF_REV2', code_ape:'43.22A', libelle_ape:'Travaux de plomberie',                     id_parcours:'PARC-005', priorite:4, confiance:'Forte',   regle_validation:'Confirmer activité artisan', actif:true },
  { version_naf:'NAF_REV2', code_ape:'47.19B', libelle_ape:'Autres commerces de détail',               id_parcours:'PARC-005', priorite:3, confiance:'Moyenne', regle_validation:'Confirmer commerce de proximité', actif:true },
  { version_naf:'NAF_REV2', code_ape:'86.21Z', libelle_ape:'Médecine générale',                        id_parcours:'PARC-006', priorite:5, confiance:'Forte',   regle_validation:'Confirmer profession libérale médicale', actif:true },
  { version_naf:'NAF_REV2', code_ape:'86.90A', libelle_ape:'Ambulances',                               id_parcours:'PARC-006', priorite:3, confiance:'Moyenne', regle_validation:'Confirmer profession libérale de santé', actif:true },
  { version_naf:'NAF_REV2', code_ape:'69.10Z', libelle_ape:'Activités juridiques',                     id_parcours:'PARC-006', priorite:5, confiance:'Forte',   regle_validation:'Confirmer profession libérale juridique', actif:true },
  { version_naf:'NAF_REV2', code_ape:'69.20Z', libelle_ape:'Activités comptables',                     id_parcours:'PARC-006', priorite:5, confiance:'Forte',   regle_validation:'Confirmer profession libérale comptable', actif:true },
]
