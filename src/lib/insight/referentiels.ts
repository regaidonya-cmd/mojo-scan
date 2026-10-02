// ══════════════════════════════════════════════════════════════
// INSIGHT V1 — RÉFÉRENTIELS (source de vérité UNIQUE).
//
// Toutes les formulations et tables de décision d'INSIGHT V1 vivent ici,
// et uniquement ici : libellés NAF, tranches d'effectif, familles métier,
// questions de découverte, lexiques. Aucun composant ni aucune route ne
// doit dupliquer ces textes. Modifier une question = modifier ce fichier.
//
// Aucune donnée externe, aucun LLM : tables fermées, maintenues à la main.
// ══════════════════════════════════════════════════════════════

/** Libellés officiels NAF rév. 2 (INSEE) des codes présents dans la
 * population SDR. Code absent -> on affiche le code seul, jamais un
 * libellé deviné. */
export const LIBELLES_NAF: Record<string, string> = {
  '41.10A': 'Promotion immobilière de logements',
  '41.20A': 'Construction de maisons individuelles',
  '41.20B': "Construction d'autres bâtiments",
  '43.12B': 'Travaux de terrassement spécialisés ou de grande masse',
  '43.22A': "Travaux d'installation d'eau et de gaz en tous locaux",
  '43.22B': "Travaux d'installation d'équipements thermiques et de climatisation",
  '43.29B': "Autres travaux d'installation n.c.a.",
  '43.32A': 'Travaux de menuiserie bois et PVC',
  '43.33Z': 'Travaux de revêtement des sols et des murs',
  '43.34Z': 'Travaux de peinture et vitrerie',
  '43.91B': 'Travaux de couverture par éléments',
  '43.99A': "Travaux d'étanchéification",
  '43.99C': 'Travaux de maçonnerie générale et gros œuvre de bâtiment',
  '45.11Z': 'Commerce de voitures et de véhicules automobiles légers',
  '45.20A': 'Entretien et réparation de véhicules automobiles légers',
  '47.11B': "Commerce d'alimentation générale",
  '47.11C': 'Supérettes',
  '47.11D': 'Supermarchés',
  '47.19B': 'Autres commerces de détail en magasin non spécialisé',
  '47.23Z': 'Commerce de détail de poissons, crustacés et mollusques en magasin spécialisé',
  '47.30Z': 'Commerce de détail de carburants en magasin spécialisé',
  '47.42Z': 'Commerce de détail de matériels de télécommunication en magasin spécialisé',
  '47.52B': 'Commerce de détail de quincaillerie, peintures et verres en grandes surfaces (400 m² et plus)',
  '47.59A': 'Commerce de détail de meubles',
  '47.64Z': "Commerce de détail d'articles de sport en magasin spécialisé",
  '47.71Z': "Commerce de détail d'habillement en magasin spécialisé",
  '47.73Z': 'Commerce de détail de produits pharmaceutiques en magasin spécialisé',
  '47.76Z': 'Commerce de détail de fleurs, plantes, graines, engrais, animaux de compagnie et aliments pour ces animaux en magasin spécialisé',
  '47.78A': "Commerces de détail d'optique",
  '47.78C': 'Autres commerces de détail spécialisés divers',
  '47.82Z': "Commerce de détail de textiles, d'habillement et de chaussures sur éventaires et marchés",
  '47.89Z': 'Autres commerces de détail sur éventaires et marchés',
  '56.10A': 'Restauration traditionnelle',
  '56.10C': 'Restauration de type rapide',
  '56.21Z': 'Services des traiteurs',
  '56.29B': 'Autres services de restauration n.c.a.',
  '56.30Z': 'Débits de boissons',
  '68.31Z': 'Agences immobilières',
  '69.10Z': 'Activités juridiques',
  '69.20Z': 'Activités comptables',
  '70.22Z': 'Conseil pour les affaires et autres conseils de gestion',
  '71.11Z': "Activités d'architecture",
  '71.12B': 'Ingénierie, études techniques',
  '73.11Z': 'Activités des agences de publicité',
  '85.53Z': 'Enseignement de la conduite',
  '86.90E': "Activités des professionnels de la rééducation, de l'appareillage et des pédicures-podologues",
  '96.02A': 'Coiffure',
  '96.02B': 'Soins de beauté',
  '96.09Z': 'Autres services personnels n.c.a.',
}

/** Tranches d'effectif SIRENE (codes INSEE). 'NN' (non employeur /
 * inconnu) n'est JAMAIS affiché comme un fait. */
export const LIBELLES_TRANCHE: Record<string, string> = {
  '00': '0 salarié', '01': '1 ou 2 salariés', '02': '3 à 5 salariés', '03': '6 à 9 salariés',
  '11': '10 à 19 salariés', '12': '20 à 49 salariés', '21': '50 à 99 salariés', '22': '100 à 199 salariés',
  '31': '200 à 249 salariés', '32': '250 à 499 salariés', '41': '500 à 999 salariés', '42': '1 000 à 1 999 salariés',
  '51': '2 000 à 4 999 salariés', '52': '5 000 à 9 999 salariés', '53': '10 000 salariés et plus',
}
/** À partir de cette tranche (50 salariés et plus) : alerte « décisionnaire à identifier ». */
export const TRANCHES_STRUCTURE_IMPORTANTE = new Set(['21', '22', '31', '32', '41', '42', '51', '52', '53'])

// ── Familles métier ─────────────────────────────────────────────

export type CleFamille =
  | 'BATIMENT' | 'COMMERCE' | 'AUTOMOBILE' | 'AUTO_ECOLE' | 'RESTAURATION'
  | 'PROFESSIONS_LIBERALES' | 'BEAUTE' | 'IMMOBILIER' | 'SERVICES_PERSONNE' | 'SANTE' | 'AUTRE'

export interface Famille {
  libelle: string
  nature: string // nature d'activité par défaut, affichée dans « Pourquoi ce prospect ? »
  question: string // question de découverte métier par défaut (CONTEXTE_SEULEMENT)
}

export const FAMILLES: Record<CleFamille, Famille> = {
  BATIMENT: {
    libelle: 'Bâtiment & artisans', nature: 'Entreprise du bâtiment',
    question: "Aujourd'hui, vos nouveaux chantiers arrivent surtout par recommandation, par Google ou par d'autres canaux ?",
  },
  COMMERCE: {
    libelle: 'Commerces de proximité', nature: 'Commerce de proximité',
    question: "Aujourd'hui, votre priorité, c'est plutôt d'attirer de nouveaux clients ou de faire revenir plus souvent vos clients habituels ?",
  },
  AUTOMOBILE: {
    libelle: 'Automobile', nature: "Professionnel de l'automobile",
    question: "Aujourd'hui, vos nouveaux clients arrivent surtout par le bouche-à-oreille, par Google ou par d'autres canaux ?",
  },
  AUTO_ECOLE: {
    libelle: 'Auto-écoles', nature: 'Auto-école',
    question: "Aujourd'hui, vos nouveaux élèves arrivent surtout par Google, par recommandation ou par les réseaux sociaux ?",
  },
  RESTAURATION: {
    libelle: 'Restauration & métiers de bouche', nature: 'Établissement de restauration',
    question: "Aujourd'hui, vos clients vous découvrent surtout en passant devant, par le bouche-à-oreille ou en ligne ?",
  },
  PROFESSIONS_LIBERALES: {
    libelle: 'Professions libérales & conseil', nature: 'Cabinet',
    question: "Aujourd'hui, vos nouveaux clients viennent surtout de votre réseau, ou vous avez déjà mis en place une démarche pour en attirer ?",
  },
  BEAUTE: {
    libelle: 'Beauté, coiffure & bien-être', nature: 'Salon / institut',
    question: "Aujourd'hui, vos nouveaux clients arrivent surtout par recommandation, par Google ou par les réseaux sociaux ?",
  },
  IMMOBILIER: {
    libelle: 'Immobilier (agences)', nature: 'Agence immobilière',
    question: "Aujourd'hui, vos nouveaux mandats viennent surtout du bouche-à-oreille, de votre vitrine ou des portails en ligne ?",
  },
  SERVICES_PERSONNE: {
    libelle: 'Services à la personne', nature: 'Service à la personne',
    question: "Aujourd'hui, les nouvelles familles que vous accompagnez arrivent surtout par recommandation, par des partenaires ou par Internet ?",
  },
  SANTE: {
    libelle: 'Santé & paramédical', nature: 'Professionnel de santé',
    question: "Aujourd'hui, vos nouveaux patients arrivent surtout par les prescripteurs, le bouche-à-oreille ou en ligne ?",
  },
  AUTRE: {
    libelle: 'Autre activité', nature: 'Entreprise',
    question: "Aujourd'hui, comment se développe votre activité, et quels sont vos principaux enjeux pour les prochains mois ?",
  },
}

/** Libellés famille_metier de l'enrichissement -> clé famille. */
export const FAMILLE_DEPUIS_LIBELLE_LOT: Record<string, CleFamille> = {
  'Bâtiment & artisans': 'BATIMENT',
  'Commerces de proximité': 'COMMERCE',
  'Automobile & auto-écoles': 'AUTOMOBILE', // auto-écoles affinées par le NAF 85.53Z
  'Restauration & métiers de bouche': 'RESTAURATION',
  'Professions libérales & conseil': 'PROFESSIONS_LIBERALES',
  'Beauté, coiffure & bien-être': 'BEAUTE',
  'Immobilier (agences)': 'IMMOBILIER',
  'Autres services à la personne': 'SERVICES_PERSONNE',
}

/** Famille déduite du NAF (préfixes ordonnés du plus précis au plus large). */
export const FAMILLE_DEPUIS_NAF: [string, CleFamille][] = [
  ['85.53', 'AUTO_ECOLE'],
  ['96.02', 'BEAUTE'],
  ['96.09', 'SERVICES_PERSONNE'],
  ['41.', 'BATIMENT'], ['42.', 'BATIMENT'], ['43.', 'BATIMENT'],
  ['45.', 'AUTOMOBILE'],
  ['47.', 'COMMERCE'],
  ['56.', 'RESTAURATION'],
  ['68.', 'IMMOBILIER'],
  ['69.', 'PROFESSIONS_LIBERALES'], ['70.', 'PROFESSIONS_LIBERALES'], ['71.', 'PROFESSIONS_LIBERALES'],
  ['73.', 'PROFESSIONS_LIBERALES'], ['74.', 'PROFESSIONS_LIBERALES'],
  ['86.', 'SANTE'],
]

/** Nature d'activité précise par NAF (sinon : nature de la famille). */
export const NATURE_DEPUIS_NAF: Record<string, string> = {
  '45.20A': 'Garage automobile', '45.11Z': 'Commerce automobile', '85.53Z': 'Auto-école',
  '56.10A': 'Restaurant', '56.10C': 'Restauration rapide', '56.21Z': 'Traiteur', '56.30Z': 'Débit de boissons',
  '47.73Z': 'Pharmacie', '47.76Z': 'Fleuriste', '47.78A': 'Opticien', '47.11B': 'Commerce d\'alimentation générale',
  '96.02A': 'Salon de coiffure', '96.02B': 'Institut de beauté',
  '68.31Z': 'Agence immobilière', '69.20Z': 'Cabinet comptable', '69.10Z': "Cabinet d'activités juridiques",
  '71.11Z': "Cabinet d'architecture", '86.90E': 'Professionnel de la rééducation et de la podologie',
  '43.22A': 'Entreprise de plomberie et installation sanitaire', '43.22B': 'Entreprise de chauffage et climatisation',
  '43.32A': 'Entreprise de menuiserie', '43.91B': 'Entreprise de couverture', '43.99A': "Entreprise d'étanchéité",
  '43.34Z': 'Entreprise de peinture et vitrerie',
}

// ── Lexiques (identité et faits propres) ────────────────────────

/** Mots jamais significatifs pour comparer des noms : formes juridiques,
 * articles, commune cible, mots génériques de catégorie. */
export const MOTS_EXCLUS_IDENTITE = new Set([
  'sarl', 'sas', 'sasu', 'eurl', 'ei', 'sa', 'sci', 'scp', 'snc', 'ste', 'societe', 'soc', 'ets', 'etablissements', 'eirl',
  'le', 'la', 'les', 'l', 'du', 'de', 'des', 'd', 'et', 'a', 'au', 'aux', 'en', 'chez',
  'villeneuve', 'saint', 'st', 'georges', 'vsg', 'france',
  'garage', 'garages', 'auto', 'autos', 'batiment', 'batiments', 'construction', 'constructions',
  'service', 'services', 'multiservices', 'immobilier', 'pharmacie', 'pharmacy', 'optique',
  'restaurant', 'beaute', 'beauty', 'nails', 'coiffure', 'entreprise',
])

/** INSIGHT V1.1 — fiable ≠ commercialement différenciant.
 * Seuls ces mots rendent un intitulé Google DIFFÉRENCIANT : spécialisation,
 * prestation spécifique, agrément / certification, offre distinctive.
 * Une catégorie métier (épicerie, supermarché, agence immobilière,
 * traiteur…), une origine culinaire ou un simple nom n'en font jamais
 * partie : ces faits restent affichés, mais en CONTEXTE_SEULEMENT.
 * Liste fermée, à enrichir ici uniquement. */
export const LEXIQUE_DIFFERENCIANT = new Set([
  'reparateur', 'agree', 'carrosserie', 'depannage',
  'kacher', 'casher', 'halal',
  'serrurerie', 'cordonnerie', 'echafaudage', 'echafaudages', 'corps',
  'posturologue', 'osteopathe', 'gardes', 'hotel',
])

/** INSIGHT V1.1 — réseaux d'agrément / de service (différenciants), par
 * opposition aux enseignes de distribution (Franprix, Intermarché, Esso,
 * Foncia…) qui restent un simple fait de contexte. */
export const RESEAUX_SERVICE = new Set(['volkswagen', 'bosch car service', 'ad garage'])

/** Réseaux / marques reconnus (liste fermée). Un réseau n'est un fait
 * propre que s'il n'est pas déjà la raison sociale elle-même. */
export const RESEAUX: { cle: string; libelle: string }[] = [
  { cle: 'volkswagen', libelle: 'Volkswagen' }, { cle: 'bosch car service', libelle: 'Bosch Car Service' },
  { cle: 'ad garage', libelle: 'AD' }, { cle: 'foncia', libelle: 'Foncia' }, { cle: 'franprix', libelle: 'Franprix' },
  { cle: 'intermarche', libelle: 'Intermarché' }, { cle: 'esso', libelle: 'Esso' }, { cle: 'lapeyre', libelle: 'Lapeyre' },
  { cle: 'krys', libelle: 'Krys' }, { cle: 'hyundai', libelle: 'Hyundai' }, { cle: 'renault', libelle: 'Renault' },
]

/** Domaines de plateformes / pages d'enseigne : jamais présentés comme
 * « site web » de l'entreprise. */
export const DOMAINES_NON_PROPRES = [
  'doctolib.fr', 'notaires.fr', 'annonces-marine.com', 'franprix.fr', 'intermarche.com', 'lapeyre.fr', 'northatlantic.fr',
  'hyundai.com', 'krys.com', 'ad.fr', 'boschcarservice.fr', 'foncia.com', 'whatsapp.com', 'pharmacorp.fr', 'facebook.com', 'instagram.com',
]

// ── Textes fixes ────────────────────────────────────────────────

export const QUESTION_FROIDE_PLAYBOOK =
  "Aujourd'hui, comment se développe votre activité, et quels sont vos principaux enjeux pour les prochains mois ?"

export const MENTION_SUGGESTION = 'Suggestion à valider pendant l\'appel — jamais un diagnostic.'

/** Mots interdits dans TOUT texte produit (vérifiés par les tests). */
export const MOTS_INTERDITS = [
  'visibilité', 'seo', 'référencement', 'manque', 'faible', 'mauvais', 'mauvaise', 'problème', 'besoin de',
  'inexistant', 'obsolète', 'insuffisant', 'peu visible', 'pas de site', "pas d'email", 'perd', 'perte',
]

// ── Libellés d'affichage (fiche SDR) ────────────────────────────

export const LIBELLES_NIVEAU: Record<'INSIGHT_EXPLOITABLE' | 'CONTEXTE_SEULEMENT' | 'AUCUN_INSIGHT_FIABLE', string> = {
  INSIGHT_EXPLOITABLE: 'Insight vérifié',
  CONTEXTE_SEULEMENT: 'Contexte métier',
  AUCUN_INSIGHT_FIABLE: 'Aucun insight fiable',
}
export const LIBELLES_SOURCE: Record<'SIRENE' | 'GOOGLE_PLACES' | 'EMAIL_V2', string> = {
  SIRENE: 'SIRENE', GOOGLE_PLACES: 'fiche Google rapprochée', EMAIL_V2: 'EMAIL V2',
}
export const TEXTE_CONTEXTE_SEULEMENT = 'Aucun fait différenciant identifié : préparation par la question métier.'
export const TEXTE_AUCUN_INSIGHT = 'Les données disponibles ne permettent pas une personnalisation fiable. Revenir au script froid du Playbook.'
