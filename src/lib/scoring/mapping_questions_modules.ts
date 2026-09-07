// ══════════════════════════════════════════════════════════════
// MOJO LEAD ENGINE — Mapping_Questions_Modules
// Source de vérité : ce fichier remplace tout hardcoding
// Modifiable sans changer l'algorithme de scoring
// ══════════════════════════════════════════════════════════════

export interface QuestionModuleMapping {
  id_question: string
  valeur_reponse: string    // valeur interne (ex: "memory")
  label_reponse: string     // libellé affiché (ex: "De tête ou post-it")
  id_module: string
  poids: number             // 1-5
  actif: boolean
  justification: string     // logique métier explicite
}

export const MAPPING_QUESTIONS_MODULES: QuestionModuleMapping[] = [

  // ══════════════════════════════════════════════════════
  // P3 — Objectif principal (branche commune)
  // ══════════════════════════════════════════════════════

  // P3 = clients
  { id_question:'P3', valeur_reponse:'clients', label_reponse:'Attirer plus de clients', id_module:'MOD-ACQ-01', poids:5, actif:true,
    justification:"L'objectif déclaré est d'attirer plus de clients : l'acquisition digitale est le besoin central." },
  { id_question:'P3', valeur_reponse:'clients', label_reponse:'Attirer plus de clients', id_module:'MOD-GBP-01', poids:4, actif:true,
    justification:"La fiche Google Business Profile est le premier levier d'acquisition locale pour les TPE/PME." },
  { id_question:'P3', valeur_reponse:'clients', label_reponse:'Attirer plus de clients', id_module:'MOD-SEO-02', poids:4, actif:true,
    justification:"Le référencement local permet d'être trouvé par des prospects dans sa zone géographique." },
  { id_question:'P3', valeur_reponse:'clients', label_reponse:'Attirer plus de clients', id_module:'MOD-SOC-01', poids:3, actif:true,
    justification:"Les réseaux sociaux contribuent à l'acquisition de prospects qualifiés en complément du SEO." },

  // P3 = google
  { id_question:'P3', valeur_reponse:'google', label_reponse:'Être visible sur Google', id_module:'MOD-SEO-02', poids:5, actif:true,
    justification:"L'objectif est explicitement d'améliorer la visibilité Google : le SEO local est la réponse directe." },
  { id_question:'P3', valeur_reponse:'google', label_reponse:'Être visible sur Google', id_module:'MOD-GBP-01', poids:5, actif:true,
    justification:"Google Business Profile est le levier #1 de visibilité sur Google Maps et la recherche locale." },
  { id_question:'P3', valeur_reponse:'google', label_reponse:'Être visible sur Google', id_module:'MOD-SEO-01', poids:4, actif:true,
    justification:"Le SEO général (technique, contenu, backlinks) complète le référencement local." },
  { id_question:'P3', valeur_reponse:'google', label_reponse:'Être visible sur Google', id_module:'MOD-REP-01', poids:3, actif:true,
    justification:"Les avis clients améliorent le score de pertinence Google et le taux de clic sur la fiche." },

  // P3 = reseaux
  { id_question:'P3', valeur_reponse:'reseaux', label_reponse:'Développer mes réseaux sociaux', id_module:'MOD-SOC-01', poids:5, actif:true,
    justification:"Développer les réseaux sociaux nécessite d'abord une stratégie social media cohérente." },
  { id_question:'P3', valeur_reponse:'reseaux', label_reponse:'Développer mes réseaux sociaux', id_module:'MOD-CONT-01', poids:4, actif:true,
    justification:"La production régulière de contenus est la condition sine qua non d'une présence sociale efficace." },
  { id_question:'P3', valeur_reponse:'reseaux', label_reponse:'Développer mes réseaux sociaux', id_module:'MOD-SOC-02', poids:4, actif:true,
    justification:"Instagram est la plateforme dominante pour les activités locales B2C (beauté, restauration, commerce)." },
  { id_question:'P3', valeur_reponse:'reseaux', label_reponse:'Développer mes réseaux sociaux', id_module:'MOD-CONT-03', poids:3, actif:true,
    justification:"Un calendrier éditorial est indispensable pour maintenir une publication régulière." },

  // P3 = fidelisation
  { id_question:'P3', valeur_reponse:'fidelisation', label_reponse:'Fidéliser mes clients existants', id_module:'MOD-FID-01', poids:5, actif:true,
    justification:"L'objectif déclaré est de fidéliser : la formation fidélisation est le besoin central et direct." },
  { id_question:'P3', valeur_reponse:'fidelisation', label_reponse:'Fidéliser mes clients existants', id_module:'MOD-CRM-01', poids:4, actif:true,
    justification:"La fidélisation nécessite une base client structurée pour segmenter et cibler les actions de rétention." },
  { id_question:'P3', valeur_reponse:'fidelisation', label_reponse:'Fidéliser mes clients existants', id_module:'MOD-EMAIL-01', poids:3, actif:true,
    justification:"L'emailing est le canal le plus rentable pour réactiver et fidéliser une clientèle existante." },
  { id_question:'P3', valeur_reponse:'fidelisation', label_reponse:'Fidéliser mes clients existants', id_module:'MOD-WA-01', poids:3, actif:true,
    justification:"WhatsApp Business permet une communication directe et personnalisée avec les clients fidèles." },

  // P3 = site
  { id_question:'P3', valeur_reponse:'site', label_reponse:'Créer ou améliorer mon site web', id_module:'MOD-WEB-01', poids:5, actif:true,
    justification:"L'objectif est de créer ou améliorer un site : WordPress est le CMS le plus adapté aux TPE/PME." },
  { id_question:'P3', valeur_reponse:'site', label_reponse:'Créer ou améliorer mon site web', id_module:'MOD-WEB-04', poids:4, actif:true,
    justification:"Un site WordPress sans optimisation SEO ne génère pas de trafic organique." },
  { id_question:'P3', valeur_reponse:'site', label_reponse:'Créer ou améliorer mon site web', id_module:'MOD-WEB-03', poids:3, actif:true,
    justification:"L'architecture et la navigation du site conditionnent l'expérience utilisateur et la conversion." },
  { id_question:'P3', valeur_reponse:'site', label_reponse:'Créer ou améliorer mon site web', id_module:'MOD-UX-03', poids:2, actif:true,
    justification:"L'UX est un complément naturel à la création de site pour maximiser les conversions." },

  // P3 = temps
  { id_question:'P3', valeur_reponse:'temps', label_reponse:'Gagner du temps au quotidien', id_module:'MOD-IA-05', poids:5, actif:true,
    justification:"Gagner du temps au quotidien passe en priorité par la productivité IA (rédaction, synthèse, réponses)." },
  { id_question:'P3', valeur_reponse:'temps', label_reponse:'Gagner du temps au quotidien', id_module:'MOD-AUTO-01', poids:5, actif:true,
    justification:"L'automatisation des tâches répétitives est le levier le plus direct pour libérer du temps." },
  { id_question:'P3', valeur_reponse:'temps', label_reponse:'Gagner du temps au quotidien', id_module:'MOD-ORG-02', poids:4, actif:true,
    justification:"Une organisation digitale structurée évite les pertes de temps liées aux outils mal utilisés." },
  { id_question:'P3', valeur_reponse:'temps', label_reponse:'Gagner du temps au quotidien', id_module:'MOD-PROC-02', poids:3, actif:true,
    justification:"L'optimisation des processus récurrents réduit le temps consacré aux tâches à faible valeur ajoutée." },

  // P3 = automatisation
  { id_question:'P3', valeur_reponse:'automatisation', label_reponse:'Automatiser des tâches répétitives', id_module:'MOD-AUTO-01', poids:5, actif:true,
    justification:"L'objectif est d'automatiser : la formation automatisation est le besoin central et direct." },
  { id_question:'P3', valeur_reponse:'automatisation', label_reponse:'Automatiser des tâches répétitives', id_module:'MOD-AUTO-05', poids:5, actif:true,
    justification:"Les workflows automatisés (Make, Zapier) sont l'outil opérationnel de l'automatisation." },
  { id_question:'P3', valeur_reponse:'automatisation', label_reponse:'Automatiser des tâches répétitives', id_module:'MOD-IA-02', poids:4, actif:true,
    justification:"L'IA générative complète les outils no-code pour automatiser les tâches cognitives (rédaction, tri)." },
  { id_question:'P3', valeur_reponse:'automatisation', label_reponse:'Automatiser des tâches répétitives', id_module:'MOD-PROC-01', poids:3, actif:true,
    justification:"Automatiser efficacement nécessite d'abord de cartographier et formaliser ses processus." },

  // P3 = ia
  { id_question:'P3', valeur_reponse:'ia', label_reponse:"Utiliser l'IA dans mon activité", id_module:'MOD-IA-01', poids:5, actif:true,
    justification:"L'objectif est d'utiliser l'IA : ChatGPT est l'outil d'entrée en matière le plus accessible et impactant." },
  { id_question:'P3', valeur_reponse:'ia', label_reponse:"Utiliser l'IA dans mon activité", id_module:'MOD-IA-02', poids:5, actif:true,
    justification:"Comprendre l'IA générative dans son ensemble permet de choisir les bons outils selon les usages." },
  { id_question:'P3', valeur_reponse:'ia', label_reponse:"Utiliser l'IA dans mon activité", id_module:'MOD-IA-03', poids:4, actif:true,
    justification:"Le prompting est la compétence fondamentale pour obtenir des résultats exploitables avec l'IA." },
  { id_question:'P3', valeur_reponse:'ia', label_reponse:"Utiliser l'IA dans mon activité", id_module:'MOD-IA-04', poids:4, actif:true,
    justification:"Identifier les cas d'usage IA pertinents pour son métier est la première étape d'une intégration réussie." },

  // P3 = organisation
  { id_question:'P3', valeur_reponse:'organisation', label_reponse:'Mieux organiser mon activité', id_module:'MOD-ORG-02', poids:5, actif:true,
    justification:"Mieux organiser son activité passe par la mise en place d'une organisation digitale structurée." },
  { id_question:'P3', valeur_reponse:'organisation', label_reponse:'Mieux organiser mon activité', id_module:'MOD-PROC-01', poids:4, actif:true,
    justification:"La formalisation des workflows est la base d'une organisation efficace et reproductible." },
  { id_question:'P3', valeur_reponse:'organisation', label_reponse:'Mieux organiser mon activité', id_module:'MOD-ORG-01', poids:4, actif:true,
    justification:"La digitalisation de l'organisation permet de structurer, partager et automatiser les processus internes." },
  { id_question:'P3', valeur_reponse:'organisation', label_reponse:'Mieux organiser mon activité', id_module:'MOD-ORG-06', poids:3, actif:true,
    justification:"Notion est l'outil le plus adapté pour centraliser informations, tâches et projets en TPE/PME." },

  // P3 = competences
  { id_question:'P3', valeur_reponse:'competences', label_reponse:'Monter en compétences digitales', id_module:'MOD-IA-01', poids:4, actif:true,
    justification:"L'IA est la compétence digitale la plus demandée et impactante en 2025 pour les professionnels." },
  { id_question:'P3', valeur_reponse:'competences', label_reponse:'Monter en compétences digitales', id_module:'MOD-SEO-02', poids:3, actif:true,
    justification:"Le SEO local est une compétence digitale fondamentale pour tout professionnel cherchant à se développer." },
  { id_question:'P3', valeur_reponse:'competences', label_reponse:'Monter en compétences digitales', id_module:'MOD-SOC-01', poids:3, actif:true,
    justification:"La stratégie social media est une compétence clé pour développer sa visibilité en ligne." },
  { id_question:'P3', valeur_reponse:'competences', label_reponse:'Monter en compétences digitales', id_module:'MOD-CRM-01', poids:3, actif:true,
    justification:"Maîtriser un CRM est une compétence digitale essentielle pour structurer sa relation client." },

  // ══════════════════════════════════════════════════════
  // A1 — Origine des clients (branche acquisition)
  // ══════════════════════════════════════════════════════

  { id_question:'A1', valeur_reponse:'bouche', label_reponse:'Bouche à oreille uniquement', id_module:'MOD-GBP-01', poids:5, actif:true,
    justification:"Dépendre exclusivement du bouche à oreille signifie une absence totale de présence digitale. La fiche Google est le premier pas indispensable." },
  { id_question:'A1', valeur_reponse:'bouche', label_reponse:'Bouche à oreille uniquement', id_module:'MOD-SEO-02', poids:5, actif:true,
    justification:"Sans présence locale digitale, le prospect qui cherche sur Google ne trouve pas ce professionnel." },
  { id_question:'A1', valeur_reponse:'bouche', label_reponse:'Bouche à oreille uniquement', id_module:'MOD-REP-01', poids:4, actif:true,
    justification:"Les avis Google transforment le bouche à oreille informel en recommandation digitale visible et durable." },
  { id_question:'A1', valeur_reponse:'bouche', label_reponse:'Bouche à oreille uniquement', id_module:'MOD-SOC-01', poids:3, actif:true,
    justification:"Les réseaux sociaux permettent de diffuser la réputation au-delà du réseau de proximité." },

  { id_question:'A1', valeur_reponse:'google', label_reponse:'Google / recherche en ligne', id_module:'MOD-SEO-01', poids:4, actif:true,
    justification:"Google est déjà le canal principal : l'optimisation SEO permet d'améliorer et sécuriser ce levier." },
  { id_question:'A1', valeur_reponse:'google', label_reponse:'Google / recherche en ligne', id_module:'MOD-SEO-02', poids:4, actif:true,
    justification:"Perfectionner le référencement local renforce la position sur les recherches géolocalisées." },
  { id_question:'A1', valeur_reponse:'google', label_reponse:'Google / recherche en ligne', id_module:'MOD-GBP-01', poids:3, actif:true,
    justification:"Une fiche GBP optimisée amplifie les résultats déjà obtenus via Google." },

  { id_question:'A1', valeur_reponse:'reseaux', label_reponse:'Réseaux sociaux', id_module:'MOD-SOC-01', poids:4, actif:true,
    justification:"Les réseaux sont le canal principal : améliorer la stratégie social media renforce ce levier." },
  { id_question:'A1', valeur_reponse:'reseaux', label_reponse:'Réseaux sociaux', id_module:'MOD-CONT-01', poids:3, actif:true,
    justification:"La qualité et la régularité des contenus sont les facteurs clés de performance sur les réseaux." },

  { id_question:'A1', valeur_reponse:'mixed', label_reponse:'Plusieurs canaux digitaux', id_module:'MOD-ACQ-01', poids:3, actif:true,
    justification:"La diversification des canaux indique une maturité : structurer une stratégie d'acquisition globale est la prochaine étape." },
  { id_question:'A1', valeur_reponse:'mixed', label_reponse:'Plusieurs canaux digitaux', id_module:'MOD-DATA-07', poids:3, actif:true,
    justification:"Plusieurs canaux impliquent un besoin de mesure et d'analyse pour identifier les plus performants." },

  { id_question:'A1', valeur_reponse:'physique', label_reponse:'Terrain / salon / prescription physique', id_module:'MOD-GBP-01', poids:4, actif:true,
    justification:"Une activité de terrain sans présence digitale rate les prospects qui recherchent en ligne." },
  { id_question:'A1', valeur_reponse:'physique', label_reponse:'Terrain / salon / prescription physique', id_module:'MOD-SEO-02', poids:4, actif:true,
    justification:"Le référencement local complète naturellement une activité physique pour capter les prospects numériques." },
  { id_question:'A1', valeur_reponse:'physique', label_reponse:'Terrain / salon / prescription physique', id_module:'MOD-ACQ-01', poids:3, actif:true,
    justification:"Structurer une stratégie d'acquisition digitale permet de ne plus dépendre uniquement du terrain." },

  // ══════════════════════════════════════════════════════
  // A2 — Google Business Profile
  // ══════════════════════════════════════════════════════

  { id_question:'A2', valeur_reponse:'optimized', label_reponse:'Oui, optimisée et à jour', id_module:'MOD-REP-01', poids:3, actif:true,
    justification:"Fiche optimisée : le principal levier restant est la collecte et gestion des avis clients." },
  { id_question:'A2', valeur_reponse:'optimized', label_reponse:'Oui, optimisée et à jour', id_module:'MOD-GBP-02', poids:2, actif:true,
    justification:"Google Maps peut encore être optimisé (épingles, zones de chalandise) même avec une fiche à jour." },

  { id_question:'A2', valeur_reponse:'basic', label_reponse:'Oui, mais basique / pas à jour', id_module:'MOD-GBP-01', poids:5, actif:true,
    justification:"Une fiche basique ou obsolète est pire qu'une fiche absente : elle nuit à la crédibilité et au référencement." },
  { id_question:'A2', valeur_reponse:'basic', label_reponse:'Oui, mais basique / pas à jour', id_module:'MOD-REP-01', poids:4, actif:true,
    justification:"Une fiche peu optimisée a généralement peu d'avis : les deux problèmes sont souvent liés." },
  { id_question:'A2', valeur_reponse:'basic', label_reponse:'Oui, mais basique / pas à jour', id_module:'MOD-GBP-02', poids:3, actif:true,
    justification:"La visibilité sur Google Maps est directement liée à la complétude et la fraîcheur de la fiche." },

  { id_question:'A2', valeur_reponse:'no', label_reponse:"Non, je n'en ai pas", id_module:'MOD-GBP-01', poids:5, actif:true,
    justification:"Absence totale de fiche Google : priorité absolue, c'est la base de la visibilité locale." },
  { id_question:'A2', valeur_reponse:'no', label_reponse:"Non, je n'en ai pas", id_module:'MOD-SEO-02', poids:5, actif:true,
    justification:"Sans fiche GBP, il est impossible d'apparaître dans les résultats de recherche locale." },
  { id_question:'A2', valeur_reponse:'no', label_reponse:"Non, je n'en ai pas", id_module:'MOD-GBP-02', poids:4, actif:true,
    justification:"L'absence de fiche signifie une absence totale sur Google Maps." },

  { id_question:'A2', valeur_reponse:'dontknow', label_reponse:'Je ne sais pas', id_module:'MOD-GBP-01', poids:5, actif:true,
    justification:"Ne pas savoir si on a une fiche Google révèle un manque total de maîtrise de sa présence en ligne." },
  { id_question:'A2', valeur_reponse:'dontknow', label_reponse:'Je ne sais pas', id_module:'MOD-SEO-02', poids:4, actif:true,
    justification:"L'ignorance de sa présence locale digitale justifie une formation globale au référencement local." },

  // ══════════════════════════════════════════════════════
  // A3 — Avis Google
  // ══════════════════════════════════════════════════════

  { id_question:'A3', valeur_reponse:'more50', label_reponse:'Plus de 50 avis (bonne note)', id_module:'MOD-REP-01', poids:1, actif:true,
    justification:"50+ avis avec bonne note : la réputation est établie. Un léger travail d'entretien peut rester utile." },

  { id_question:'A3', valeur_reponse:'20to50', label_reponse:'20 à 50 avis', id_module:'MOD-REP-01', poids:3, actif:true,
    justification:"Entre 20 et 50 avis : le volume est insuffisant pour atteindre les seuils de confiance maximaux sur Google." },
  { id_question:'A3', valeur_reponse:'20to50', label_reponse:'20 à 50 avis', id_module:'MOD-GBP-01', poids:2, actif:true,
    justification:"La collecte d'avis s'optimise souvent via des fonctionnalités spécifiques de la fiche GBP." },

  { id_question:'A3', valeur_reponse:'lt20', label_reponse:'Moins de 20 avis', id_module:'MOD-REP-01', poids:5, actif:true,
    justification:"Moins de 20 avis : la réputation digitale est faible et nuit à la crédibilité sur Google. Priorité élevée." },
  { id_question:'A3', valeur_reponse:'lt20', label_reponse:'Moins de 20 avis', id_module:'MOD-GBP-01', poids:3, actif:true,
    justification:"La stratégie de collecte d'avis s'intègre dans l'optimisation globale de la fiche GBP." },

  { id_question:'A3', valeur_reponse:'none', label_reponse:'Aucun avis ou presque', id_module:'MOD-REP-01', poids:5, actif:true,
    justification:"Aucun avis = absence de preuve sociale digitale. C'est un frein majeur à la conversion des prospects." },
  { id_question:'A3', valeur_reponse:'none', label_reponse:'Aucun avis ou presque', id_module:'MOD-GBP-01', poids:4, actif:true,
    justification:"La fiche GBP est le canal principal de collecte d'avis Google : son optimisation est indispensable." },
  { id_question:'A3', valeur_reponse:'none', label_reponse:'Aucun avis ou presque', id_module:'MOD-SEO-02', poids:3, actif:true,
    justification:"Les avis sont un signal de classement local : leur absence pénalise le positionnement SEO local." },

  // ══════════════════════════════════════════════════════
  // A4 — Activité sur les réseaux sociaux
  // ══════════════════════════════════════════════════════

  { id_question:'A4', valeur_reponse:'active', label_reponse:'Oui, régulièrement (1+ posts/semaine)', id_module:'MOD-CONT-03', poids:3, actif:true,
    justification:"Actif sur les réseaux : la prochaine étape est de structurer le calendrier éditorial pour gagner en efficacité." },
  { id_question:'A4', valeur_reponse:'active', label_reponse:'Oui, régulièrement (1+ posts/semaine)', id_module:'MOD-SOC-01', poids:2, actif:true,
    justification:"Une présence active peut encore être améliorée avec une stratégie social media plus ciblée." },

  { id_question:'A4', valeur_reponse:'sometimes', label_reponse:'Parfois, mais pas régulièrement', id_module:'MOD-SOC-01', poids:4, actif:true,
    justification:"Une présence irrégulière sur les réseaux nuit à l'algorithme et à la perception de la marque." },
  { id_question:'A4', valeur_reponse:'sometimes', label_reponse:'Parfois, mais pas régulièrement', id_module:'MOD-CONT-01', poids:4, actif:true,
    justification:"L'irrégularité est souvent due à un manque de méthode de création de contenus." },
  { id_question:'A4', valeur_reponse:'sometimes', label_reponse:'Parfois, mais pas régulièrement', id_module:'MOD-CONT-03', poids:3, actif:true,
    justification:"Un calendrier éditorial est la solution directe au problème d'irrégularité des publications." },

  { id_question:'A4', valeur_reponse:'rarely', label_reponse:'Rarement ou jamais', id_module:'MOD-SOC-01', poids:5, actif:true,
    justification:"Absence de présence sociale : besoin fort d'une stratégie social media pour exister sur ces canaux." },
  { id_question:'A4', valeur_reponse:'rarely', label_reponse:'Rarement ou jamais', id_module:'MOD-CONT-01', poids:5, actif:true,
    justification:"Sans compétences en création de contenus, la présence sociale reste sporadique et inefficace." },
  { id_question:'A4', valeur_reponse:'rarely', label_reponse:'Rarement ou jamais', id_module:'MOD-CONT-03', poids:4, actif:true,
    justification:"Le planning éditorial est l'outil structurant pour transformer une intention en action régulière." },
  { id_question:'A4', valeur_reponse:'rarely', label_reponse:'Rarement ou jamais', id_module:'MOD-SOC-02', poids:3, actif:true,
    justification:"Instagram est souvent le réseau le plus impactant pour démarrer une présence sociale en B2C local." },

  // ══════════════════════════════════════════════════════
  // A5 — Site web professionnel
  // ══════════════════════════════════════════════════════

  { id_question:'A5', valeur_reponse:'optimized', label_reponse:'Oui, moderne et bien référencé', id_module:'MOD-WEB-04', poids:3, actif:true,
    justification:"Site optimisé : l'amélioration continue du SEO WordPress permet de maintenir et progresser dans les résultats." },
  { id_question:'A5', valeur_reponse:'optimized', label_reponse:'Oui, moderne et bien référencé', id_module:'MOD-DATA-07', poids:2, actif:true,
    justification:"Un site performant nécessite une analyse de ses statistiques pour mesurer et optimiser les résultats." },

  { id_question:'A5', valeur_reponse:'basic', label_reponse:'Oui, mais ancien ou peu visible', id_module:'MOD-WEB-01', poids:4, actif:true,
    justification:"Un site ancien nécessite souvent une refonte ou une mise à jour technique importante." },
  { id_question:'A5', valeur_reponse:'basic', label_reponse:'Oui, mais ancien ou peu visible', id_module:'MOD-WEB-04', poids:4, actif:true,
    justification:"Un site peu visible souffre d'un manque d'optimisation SEO : c'est le premier chantier à traiter." },
  { id_question:'A5', valeur_reponse:'basic', label_reponse:'Oui, mais ancien ou peu visible', id_module:'MOD-WEB-06', poids:3, actif:true,
    justification:"Les sites anciens sont souvent lents : la performance technique impacte le référencement et l'expérience." },
  { id_question:'A5', valeur_reponse:'basic', label_reponse:'Oui, mais ancien ou peu visible', id_module:'MOD-UX-03', poids:3, actif:true,
    justification:"Un site ancien a souvent une UX dépassée qui freine la conversion des visiteurs en contacts." },

  { id_question:'A5', valeur_reponse:'no', label_reponse:'Non, pas de site', id_module:'MOD-WEB-01', poids:5, actif:true,
    justification:"Absence de site web : priorité à la création d'un site WordPress professionnel, base de la présence digitale." },
  { id_question:'A5', valeur_reponse:'no', label_reponse:'Non, pas de site', id_module:'MOD-WEB-03', poids:4, actif:true,
    justification:"Créer un site sans réfléchir à son architecture conduit à un site peu efficace commercialement." },
  { id_question:'A5', valeur_reponse:'no', label_reponse:'Non, pas de site', id_module:'MOD-SEO-01', poids:4, actif:true,
    justification:"La création d'un site doit intégrer dès le départ les bonnes pratiques SEO pour être visible." },

  // ══════════════════════════════════════════════════════
  // C1 — Suivi des demandes et prospects (branche conversion)
  // ══════════════════════════════════════════════════════

  { id_question:'C1', valeur_reponse:'crm', label_reponse:'CRM ou outil dédié', id_module:'MOD-CRM-02', poids:3, actif:true,
    justification:"CRM en place : l'amélioration du pipeline commercial et du processus de suivi sont les prochaines étapes." },
  { id_question:'C1', valeur_reponse:'crm', label_reponse:'CRM ou outil dédié', id_module:'MOD-DATA-03', poids:2, actif:true,
    justification:"Un CRM utilisé doit être piloté avec des KPI pour mesurer l'efficacité commerciale." },

  { id_question:'C1', valeur_reponse:'sheets', label_reponse:'Tableur Excel / Google Sheets', id_module:'MOD-CRM-01', poids:4, actif:true,
    justification:"Un tableur comme outil CRM atteint rapidement ses limites : automatisations, relances et suivi multi-utilisateurs sont impossibles." },
  { id_question:'C1', valeur_reponse:'sheets', label_reponse:'Tableur Excel / Google Sheets', id_module:'MOD-CRM-02', poids:4, actif:true,
    justification:"Le tableur ne permet pas de gérer un pipeline commercial avec des statuts d'avancement clairs." },
  { id_question:'C1', valeur_reponse:'sheets', label_reponse:'Tableur Excel / Google Sheets', id_module:'MOD-CRM-05', poids:3, actif:true,
    justification:"Les relances manuelles sur tableur sont chronophages et souvent oubliées." },

  { id_question:'C1', valeur_reponse:'memory', label_reponse:'De tête ou post-it', id_module:'MOD-CRM-01', poids:5, actif:true,
    justification:"Gérer ses prospects de tête ou sur post-it génère des pertes certaines : oublis, doublons, absence de suivi structuré." },
  { id_question:'C1', valeur_reponse:'memory', label_reponse:'De tête ou post-it', id_module:'MOD-CRM-02', poids:5, actif:true,
    justification:"Sans pipeline commercial structuré, il est impossible de visualiser où en sont les opportunités." },
  { id_question:'C1', valeur_reponse:'memory', label_reponse:'De tête ou post-it', id_module:'MOD-CRM-03', poids:4, actif:true,
    justification:"L'absence d'outil centralisé empêche tout suivi cohérent des prospects et de leur avancement." },
  { id_question:'C1', valeur_reponse:'memory', label_reponse:'De tête ou post-it', id_module:'MOD-CRM-05', poids:4, actif:true,
    justification:"Sans outil, les relances sont oubliées ou anarchiques, entraînant une perte directe de CA." },

  { id_question:'C1', valeur_reponse:'nothing', label_reponse:'Je ne suis pas systématiquement', id_module:'MOD-CRM-01', poids:5, actif:true,
    justification:"L'absence de suivi systématique des prospects est l'une des principales causes de manque à gagner en TPE/PME." },
  { id_question:'C1', valeur_reponse:'nothing', label_reponse:'Je ne suis pas systématiquement', id_module:'MOD-CRM-03', poids:5, actif:true,
    justification:"Sans processus de suivi, les prospects « chauds » refroidissent et sont perdus sans même s'en rendre compte." },
  { id_question:'C1', valeur_reponse:'nothing', label_reponse:'Je ne suis pas systématiquement', id_module:'MOD-CRM-05', poids:4, actif:true,
    justification:"L'absence de système de relance est une perte directe de revenus sur des prospects déjà en contact." },
  { id_question:'C1', valeur_reponse:'nothing', label_reponse:'Je ne suis pas systématiquement', id_module:'MOD-AUTO-01', poids:3, actif:true,
    justification:"L'automatisation des relances permet de pallier le manque de suivi sans effort supplémentaire." },

  // ══════════════════════════════════════════════════════
  // C2 — Relances prospects
  // ══════════════════════════════════════════════════════

  { id_question:'C2', valeur_reponse:'auto', label_reponse:'Oui, de façon automatisée', id_module:'MOD-AUTO-05', poids:2, actif:true,
    justification:"Relances automatisées en place : perfectionner les workflows existants est la prochaine étape." },
  { id_question:'C2', valeur_reponse:'auto', label_reponse:'Oui, de façon automatisée', id_module:'MOD-CRM-05', poids:2, actif:true,
    justification:"L'optimisation des scénarios de relance améliore les taux de réponse et de conversion." },

  { id_question:'C2', valeur_reponse:'manual', label_reponse:'Oui, manuellement et régulièrement', id_module:'MOD-AUTO-01', poids:4, actif:true,
    justification:"Relancer manuellement prend du temps : l'automatisation libère ce temps pour des tâches à valeur ajoutée." },
  { id_question:'C2', valeur_reponse:'manual', label_reponse:'Oui, manuellement et régulièrement', id_module:'MOD-CRM-05', poids:3, actif:true,
    justification:"Structurer des séquences de relance dans un CRM rend le processus plus efficace et scalable." },

  { id_question:'C2', valeur_reponse:'rarely', label_reponse:"Rarement, faute de temps", id_module:'MOD-CRM-05', poids:5, actif:true,
    justification:"Ne pas relancer « faute de temps » est le signe que le processus n'est pas automatisé. C'est une perte de CA directe." },
  { id_question:'C2', valeur_reponse:'rarely', label_reponse:"Rarement, faute de temps", id_module:'MOD-AUTO-01', poids:4, actif:true,
    justification:"L'automatisation des relances résout exactement ce problème : elles se déclenchent sans intervention manuelle." },
  { id_question:'C2', valeur_reponse:'rarely', label_reponse:"Rarement, faute de temps", id_module:'MOD-AUTO-05', poids:4, actif:true,
    justification:"Les workflows automatisés permettent de maintenir un rythme de relances sans mobiliser de temps." },

  { id_question:'C2', valeur_reponse:'never', label_reponse:'Non, jamais', id_module:'MOD-CRM-05', poids:5, actif:true,
    justification:"Aucune relance = prospects perdus. C'est un levier commercial immédiat et sous-exploité." },
  { id_question:'C2', valeur_reponse:'never', label_reponse:'Non, jamais', id_module:'MOD-AUTO-01', poids:5, actif:true,
    justification:"L'automatisation des relances est la solution la plus rapide à mettre en place pour récupérer des prospects." },
  { id_question:'C2', valeur_reponse:'never', label_reponse:'Non, jamais', id_module:'MOD-AUTO-05', poids:5, actif:true,
    justification:"Les scénarios automatisés (CRM + email) permettent de relancer sans aucune intervention manuelle." },

  // ══════════════════════════════════════════════════════
  // C3 — Base de données clients
  // ══════════════════════════════════════════════════════

  { id_question:'C3', valeur_reponse:'crm', label_reponse:'Oui, dans un CRM', id_module:'MOD-CRM-04', poids:3, actif:true,
    justification:"CRM en place : la segmentation client permet d'affiner les actions de fidélisation et de relance." },
  { id_question:'C3', valeur_reponse:'crm', label_reponse:'Oui, dans un CRM', id_module:'MOD-FID-01', poids:2, actif:true,
    justification:"Une base structurée dans un CRM est la condition pour mettre en place des actions de fidélisation efficaces." },

  { id_question:'C3', valeur_reponse:'sheets', label_reponse:'Oui, dans un tableur', id_module:'MOD-CRM-01', poids:3, actif:true,
    justification:"Un tableur ne permet pas d'automatiser les actions liées à la base clients (relances, segmentation, historique)." },
  { id_question:'C3', valeur_reponse:'sheets', label_reponse:'Oui, dans un tableur', id_module:'MOD-CRM-04', poids:3, actif:true,
    justification:"La segmentation dans un tableur est manuelle et limitée : un CRM permet de l'automatiser." },

  { id_question:'C3', valeur_reponse:'basic', label_reponse:'Oui, mais pas à jour / incomplète', id_module:'MOD-CRM-01', poids:4, actif:true,
    justification:"Une base incomplète ou obsolète génère des erreurs de suivi et des opportunités manquées." },
  { id_question:'C3', valeur_reponse:'basic', label_reponse:'Oui, mais pas à jour / incomplète', id_module:'MOD-CRM-04', poids:4, actif:true,
    justification:"Segmenter une base incomplète conduit à des actions marketing inefficaces ou mal ciblées." },
  { id_question:'C3', valeur_reponse:'basic', label_reponse:'Oui, mais pas à jour / incomplète', id_module:'MOD-FID-01', poids:3, actif:true,
    justification:"Une base mal tenue empêche la mise en place d'actions de fidélisation pertinentes." },

  { id_question:'C3', valeur_reponse:'no', label_reponse:'Non', id_module:'MOD-CRM-01', poids:5, actif:true,
    justification:"Absence totale de base clients : il est impossible de mener des actions de fidélisation ou de relance sans base structurée." },
  { id_question:'C3', valeur_reponse:'no', label_reponse:'Non', id_module:'MOD-CRM-03', poids:5, actif:true,
    justification:"Sans base clients, chaque prospect est traité de façon isolée, sans mémoire ni historique de la relation." },
  { id_question:'C3', valeur_reponse:'no', label_reponse:'Non', id_module:'MOD-FID-01', poids:4, actif:true,
    justification:"La fidélisation est impossible sans savoir qui sont ses clients et comment les contacter." },

  // ══════════════════════════════════════════════════════
  // C4 — Actions de fidélisation
  // ══════════════════════════════════════════════════════

  { id_question:'C4', valeur_reponse:'regular', label_reponse:'Oui, régulièrement et automatiquement', id_module:'MOD-FID-01', poids:2, actif:true,
    justification:"Actions de fidélisation régulières et automatisées : optimiser et diversifier les mécanismes existants." },
  { id_question:'C4', valeur_reponse:'regular', label_reponse:'Oui, régulièrement et automatiquement', id_module:'MOD-EMAIL-01', poids:2, actif:true,
    justification:"L'emailing reste un levier à optimiser même pour des professionnels déjà actifs sur la fidélisation." },

  { id_question:'C4', valeur_reponse:'sometimes', label_reponse:'Parfois, ponctuellement', id_module:'MOD-FID-01', poids:4, actif:true,
    justification:"Des actions ponctuelles ne créent pas de récurrence client : une stratégie de fidélisation structurée est nécessaire." },
  { id_question:'C4', valeur_reponse:'sometimes', label_reponse:'Parfois, ponctuellement', id_module:'MOD-EMAIL-01', poids:3, actif:true,
    justification:"L'emailing régulier et planifié transforme les actions ponctuelles en campagnes de fidélisation efficaces." },
  { id_question:'C4', valeur_reponse:'sometimes', label_reponse:'Parfois, ponctuellement', id_module:'MOD-WA-01', poids:3, actif:true,
    justification:"WhatsApp Business permet des communications directes et personnalisées pour fidéliser sans lourdeur." },

  { id_question:'C4', valeur_reponse:'no', label_reponse:'Non, jamais', id_module:'MOD-FID-01', poids:5, actif:true,
    justification:"Aucune action de fidélisation : les clients existants sont une mine d'or sous-exploitée. Priorité élevée." },
  { id_question:'C4', valeur_reponse:'no', label_reponse:'Non, jamais', id_module:'MOD-FID-02', poids:4, actif:true,
    justification:"Le parrainage est le levier de fidélisation le plus naturel et le moins coûteux à mettre en place." },
  { id_question:'C4', valeur_reponse:'no', label_reponse:'Non, jamais', id_module:'MOD-EMAIL-01', poids:4, actif:true,
    justification:"Une campagne email de réactivation peut générer du CA immédiat sur une base clients dormante." },
  { id_question:'C4', valeur_reponse:'no', label_reponse:'Non, jamais', id_module:'MOD-WA-01', poids:4, actif:true,
    justification:"WhatsApp Business est le canal le plus direct et personnel pour relancer et fidéliser une clientèle locale." },

  // ══════════════════════════════════════════════════════
  // I1 — Outils digitaux utilisés (branche IA/productivité)
  // ══════════════════════════════════════════════════════

  { id_question:'I1', valeur_reponse:'many', label_reponse:'Plusieurs outils bien intégrés', id_module:'MOD-IA-02', poids:3, actif:true,
    justification:"Plusieurs outils bien intégrés : l'étape suivante est d'y intégrer l'IA pour amplifier leur efficacité." },
  { id_question:'I1', valeur_reponse:'many', label_reponse:'Plusieurs outils bien intégrés', id_module:'MOD-AUTO-01', poids:2, actif:true,
    justification:"Des outils existants peuvent être connectés entre eux via des automatisations pour éliminer les tâches manuelles résiduelles." },

  { id_question:'I1', valeur_reponse:'some', label_reponse:'Quelques outils, mais peu connectés', id_module:'MOD-ORG-02', poids:3, actif:true,
    justification:"Des outils peu connectés créent des silos d'information et des doubles saisies inutiles." },
  { id_question:'I1', valeur_reponse:'some', label_reponse:'Quelques outils, mais peu connectés', id_module:'MOD-AUTO-01', poids:3, actif:true,
    justification:"Connecter les outils existants via des automatisations élimine les tâches manuelles entre applications." },
  { id_question:'I1', valeur_reponse:'some', label_reponse:'Quelques outils, mais peu connectés', id_module:'MOD-IA-02', poids:3, actif:true,
    justification:"L'IA peut compléter et enrichir les outils existants pour améliorer leur efficacité." },

  { id_question:'I1', valeur_reponse:'few', label_reponse:'Email + téléphone uniquement', id_module:'MOD-ORG-01', poids:5, actif:true,
    justification:"N'utiliser que l'email et le téléphone révèle une organisation non digitalisée avec un fort potentiel de gain de temps." },
  { id_question:'I1', valeur_reponse:'few', label_reponse:'Email + téléphone uniquement', id_module:'MOD-ORG-02', poids:4, actif:true,
    justification:"Structurer une organisation digitale de base est la première étape avant toute automatisation ou IA." },
  { id_question:'I1', valeur_reponse:'few', label_reponse:'Email + téléphone uniquement', id_module:'MOD-IA-01', poids:4, actif:true,
    justification:"ChatGPT est l'outil d'entrée le plus accessible pour quelqu'un n'utilisant que l'email et le téléphone." },
  { id_question:'I1', valeur_reponse:'few', label_reponse:'Email + téléphone uniquement', id_module:'MOD-AUTO-01', poids:3, actif:true,
    justification:"L'automatisation de tâches simples (réponses, rappels) est le premier gain concret pour ce profil." },

  { id_question:'I1', valeur_reponse:'none', label_reponse:"Peu ou pas d'outils digitaux", id_module:'MOD-ORG-01', poids:5, actif:true,
    justification:"Aucun outil digital : la digitalisation de l'organisation est le chantier prioritaire, avant toute autre formation." },
  { id_question:'I1', valeur_reponse:'none', label_reponse:"Peu ou pas d'outils digitaux", id_module:'MOD-IA-01', poids:5, actif:true,
    justification:"ChatGPT est l'outil de démarrage idéal pour un professionnel sans expérience digitale : accessible, gratuit, immédiatement utile." },
  { id_question:'I1', valeur_reponse:'none', label_reponse:"Peu ou pas d'outils digitaux", id_module:'MOD-ORG-02', poids:5, actif:true,
    justification:"Sans organisation digitale de base, aucun autre outil ne peut être efficacement adopté." },
  { id_question:'I1', valeur_reponse:'none', label_reponse:"Peu ou pas d'outils digitaux", id_module:'MOD-AUTO-01', poids:4, actif:true,
    justification:"L'automatisation de tâches simples génère des gains visibles dès le départ, même sans expérience digitale." },

  // ══════════════════════════════════════════════════════
  // I2 — Temps perdu sur tâches répétitives
  // ══════════════════════════════════════════════════════

  { id_question:'I2', valeur_reponse:'lt2h', label_reponse:'Moins de 2h', id_module:'MOD-IA-05', poids:1, actif:true,
    justification:"Moins de 2h perdues par semaine : le potentiel de gain est limité. La productivité IA reste utile mais n'est pas prioritaire." },

  { id_question:'I2', valeur_reponse:'2to5h', label_reponse:'2 à 5h par semaine', id_module:'MOD-AUTO-01', poids:4, actif:true,
    justification:"2 à 5h perdues par semaine représentent 8 à 20h par mois. L'automatisation peut récupérer une partie significative de ce temps." },
  { id_question:'I2', valeur_reponse:'2to5h', label_reponse:'2 à 5h par semaine', id_module:'MOD-IA-05', poids:3, actif:true,
    justification:"La productivité IA permet de réduire le temps de rédaction, recherche et traitement de l'information." },
  { id_question:'I2', valeur_reponse:'2to5h', label_reponse:'2 à 5h par semaine', id_module:'MOD-PROC-02', poids:3, actif:true,
    justification:"Optimiser les processus récurrents supprime les sources de perte de temps structurelles." },

  { id_question:'I2', valeur_reponse:'5to10h', label_reponse:'5 à 10h par semaine', id_module:'MOD-AUTO-01', poids:5, actif:true,
    justification:"5 à 10h perdues par semaine = 20 à 40h par mois. L'automatisation est une priorité économique immédiate." },
  { id_question:'I2', valeur_reponse:'5to10h', label_reponse:'5 à 10h par semaine', id_module:'MOD-AUTO-05', poids:4, actif:true,
    justification:"Les workflows automatisés permettent d'éliminer les tâches répétitives les plus chronophages." },
  { id_question:'I2', valeur_reponse:'5to10h', label_reponse:'5 à 10h par semaine', id_module:'MOD-IA-05', poids:4, actif:true,
    justification:"L'IA peut automatiser la partie cognitive des tâches répétitives (rédaction, tri, synthèse)." },
  { id_question:'I2', valeur_reponse:'5to10h', label_reponse:'5 à 10h par semaine', id_module:'MOD-PROC-02', poids:4, actif:true,
    justification:"L'analyse et l'optimisation des processus permet d'identifier et supprimer les sources de perte de temps." },

  { id_question:'I2', valeur_reponse:'more10h', label_reponse:"Plus de 10h — c'est énorme", id_module:'MOD-AUTO-01', poids:5, actif:true,
    justification:"Plus de 10h perdues par semaine est un signal d'alarme : l'automatisation est la priorité absolue." },
  { id_question:'I2', valeur_reponse:'more10h', label_reponse:"Plus de 10h — c'est énorme", id_module:'MOD-AUTO-05', poids:5, actif:true,
    justification:"À ce niveau, des workflows automatisés complexes sont nécessaires pour traiter le volume de tâches répétitives." },
  { id_question:'I2', valeur_reponse:'more10h', label_reponse:"Plus de 10h — c'est énorme", id_module:'MOD-IA-05', poids:5, actif:true,
    justification:"La productivité IA est indispensable pour quelqu'un perdant plus de 10h/semaine en tâches à faible valeur." },
  { id_question:'I2', valeur_reponse:'more10h', label_reponse:"Plus de 10h — c'est énorme", id_module:'MOD-PROC-01', poids:4, actif:true,
    justification:"Un volume aussi important nécessite de cartographier et repenser les processus en profondeur." },
  { id_question:'I2', valeur_reponse:'more10h', label_reponse:"Plus de 10h — c'est énorme", id_module:'MOD-PROC-02', poids:5, actif:true,
    justification:"L'optimisation des processus est la condition préalable à une automatisation efficace à grande échelle." },

  // ══════════════════════════════════════════════════════
  // I3 — Usage actuel de l'IA
  // ══════════════════════════════════════════════════════

  { id_question:'I3', valeur_reponse:'daily', label_reponse:"Oui, tous les jours, je maîtrise", id_module:'MOD-IA-04', poids:3, actif:true,
    justification:"Utilisateur quotidien de l'IA : l'étape suivante est d'identifier de nouveaux cas d'usage métier avancés." },
  { id_question:'I3', valeur_reponse:'daily', label_reponse:"Oui, tous les jours, je maîtrise", id_module:'MOD-IA-08', poids:3, actif:true,
    justification:"Un utilisateur avancé peut créer des assistants IA métier personnalisés pour aller plus loin." },

  { id_question:'I3', valeur_reponse:'sometimes', label_reponse:'Oui, de temps en temps', id_module:'MOD-IA-03', poids:4, actif:true,
    justification:"Usage occasionnel de l'IA : améliorer le prompting permet d'obtenir des résultats bien supérieurs." },
  { id_question:'I3', valeur_reponse:'sometimes', label_reponse:'Oui, de temps en temps', id_module:'MOD-IA-04', poids:4, actif:true,
    justification:"Identifier plus de cas d'usage métier permet de passer d'un usage ponctuel à une utilisation systématique." },
  { id_question:'I3', valeur_reponse:'sometimes', label_reponse:'Oui, de temps en temps', id_module:'MOD-IA-05', poids:3, actif:true,
    justification:"La productivité IA ne se réalise qu'avec une utilisation régulière et structurée." },

  { id_question:'I3', valeur_reponse:'tried', label_reponse:"J'ai essayé mais pas vraiment", id_module:'MOD-IA-01', poids:4, actif:true,
    justification:"Avoir essayé sans vraiment utiliser indique un manque de formation concrète sur les usages pratiques." },
  { id_question:'I3', valeur_reponse:'tried', label_reponse:"J'ai essayé mais pas vraiment", id_module:'MOD-IA-03', poids:4, actif:true,
    justification:"La principale cause d'abandon de l'IA est le manque de compétences en prompting : des résultats médiocres découragent." },
  { id_question:'I3', valeur_reponse:'tried', label_reponse:"J'ai essayé mais pas vraiment", id_module:'MOD-IA-04', poids:4, actif:true,
    justification:"Identifier des cas d'usage concrets liés à son activité rend l'IA immédiatement utile et motivante." },
  { id_question:'I3', valeur_reponse:'tried', label_reponse:"J'ai essayé mais pas vraiment", id_module:'MOD-IA-05', poids:4, actif:true,
    justification:"La productivité IA est la motivation principale : montrer des gains concrets convertit les essayeurs en utilisateurs réguliers." },

  { id_question:'I3', valeur_reponse:'never', label_reponse:'Non, jamais', id_module:'MOD-IA-01', poids:5, actif:true,
    justification:"N'avoir jamais utilisé l'IA en 2025 représente un retard significatif. ChatGPT est l'outil de découverte indispensable." },
  { id_question:'I3', valeur_reponse:'never', label_reponse:'Non, jamais', id_module:'MOD-IA-02', poids:5, actif:true,
    justification:"Comprendre l'IA générative dans son ensemble est nécessaire avant d'aborder des outils spécifiques." },
  { id_question:'I3', valeur_reponse:'never', label_reponse:'Non, jamais', id_module:'MOD-IA-03', poids:4, actif:true,
    justification:"Apprendre le prompting dès le départ évite les mauvaises habitudes et garantit des résultats exploitables." },
  { id_question:'I3', valeur_reponse:'never', label_reponse:'Non, jamais', id_module:'MOD-IA-04', poids:4, actif:true,
    justification:"Identifier d'emblée les cas d'usage métier ancre l'apprentissage de l'IA dans la réalité professionnelle." },
  { id_question:'I3', valeur_reponse:'never', label_reponse:'Non, jamais', id_module:'MOD-IA-05', poids:5, actif:true,
    justification:"Un non-utilisateur de l'IA perd plusieurs heures par semaine sur des tâches que l'IA pourrait traiter en minutes." },

  // ══════════════════════════════════════════════════════
  // I4 — Automatisations en place
  // ══════════════════════════════════════════════════════

  { id_question:'I4', valeur_reponse:'several', label_reponse:'Oui, plusieurs automatisations actives', id_module:'MOD-AUTO-05', poids:2, actif:true,
    justification:"Plusieurs automatisations actives : optimiser et complexifier les workflows existants est la prochaine étape." },
  { id_question:'I4', valeur_reponse:'several', label_reponse:'Oui, plusieurs automatisations actives', id_module:'MOD-IA-08', poids:3, actif:true,
    justification:"Un utilisateur avancé en automatisation peut créer des assistants IA pour aller encore plus loin." },

  { id_question:'I4', valeur_reponse:'one', label_reponse:'Oui, une ou deux', id_module:'MOD-AUTO-01', poids:3, actif:true,
    justification:"Une ou deux automatisations : élargir leur périmètre à d'autres processus récurrents est la prochaine étape." },
  { id_question:'I4', valeur_reponse:'one', label_reponse:'Oui, une ou deux', id_module:'MOD-AUTO-05', poids:3, actif:true,
    justification:"Passer de 1-2 à plusieurs workflows automatisés nécessite une montée en compétences sur les outils no-code." },

  { id_question:'I4', valeur_reponse:'no', label_reponse:'Non, tout est manuel', id_module:'MOD-AUTO-01', poids:5, actif:true,
    justification:"Tout manuel = chaque tâche répétitive consomme du temps et de l'énergie sans valeur ajoutée. L'automatisation est prioritaire." },
  { id_question:'I4', valeur_reponse:'no', label_reponse:'Non, tout est manuel', id_module:'MOD-AUTO-05', poids:5, actif:true,
    justification:"Les workflows automatisés (Make, Zapier) permettent de connecter les outils et d'éliminer les tâches manuelles entre applications." },
  { id_question:'I4', valeur_reponse:'no', label_reponse:'Non, tout est manuel', id_module:'MOD-AUTO-02', poids:4, actif:true,
    justification:"Le no-code permet à tout professionnel, sans compétences techniques, de créer ses premières automatisations." },
  { id_question:'I4', valeur_reponse:'no', label_reponse:'Non, tout est manuel', id_module:'MOD-PROC-01', poids:4, actif:true,
    justification:"Automatiser efficacement nécessite d'abord de formaliser ses processus pour identifier ce qui peut l'être." },
]

// Compter et vérifier
const actives = MAPPING_QUESTIONS_MODULES.filter(m => m.actif)
console.log(`Total associations: ${MAPPING_QUESTIONS_MODULES.length}`)
console.log(`Associations actives: ${actives.length}`)

// Vérifier les justifications génériques restantes
const generiques = MAPPING_QUESTIONS_MODULES.filter(m => m.justification.includes('Correspondance sémantique'))
console.log(`Justifications génériques restantes: ${generiques.length}`)
