// ══════════════════════════════════════════════════════════════
// MOJO SCAN — Moteur de recommandation
// Matching déterministe : tags besoins → catalogue
// ══════════════════════════════════════════════════════════════

import type { Answer, BusinessScore, Branch, Recommendation, CatalogItem } from '@/types'

// Catalogue local (fallback si DB indisponible)
export const CATALOG_FALLBACK: CatalogItem[] = [
  { code: 'IA_DIG_1J',  title: 'IA & ChatGPT pour dirigeants',                   duration_h: 7,  price_ht: 990,  tags: ['ia','chatgpt','productivite','acquisition'],        audience: ['dirigeant'], active: true },
  { code: 'SEO_LOC_1J', title: 'SEO Local & Google Business Profile',             duration_h: 7,  price_ht: 990,  tags: ['seo-local','google','acquisition','visibilite'],      audience: ['dirigeant','salarie'], active: true },
  { code: 'AUTO_1J',    title: 'Automatisation & Productivité avec l\'IA',        duration_h: 7,  price_ht: 990,  tags: ['automatisation','ia','productivite','organisation'],   audience: ['dirigeant','salarie'], active: true },
  { code: 'RS_ACQ_1J',  title: 'Réseaux sociaux & Acquisition clients',           duration_h: 7,  price_ht: 990,  tags: ['reseaux-sociaux','acquisition','contenus'],           audience: ['dirigeant','salarie'], active: true },
  { code: 'WP_PRO_2J',  title: 'WordPress Professionnel',                         duration_h: 14, price_ht: 1490, tags: ['wordpress','site','seo','autonomie'],                  audience: ['dirigeant','salarie'], active: true },
  { code: 'RESTO_FULL', title: 'Parcours Digital Restaurateur',                   duration_h: 21, price_ht: 3200, tags: ['restauration','seo-local','acquisition','fidelisation'],audience: ['dirigeant'], active: true },
  { code: 'AUTO_FULL',  title: 'Parcours Digital Auto-École',                     duration_h: 21, price_ht: 3200, tags: ['auto-ecole','seo-local','acquisition','automatisation'],audience: ['dirigeant'], active: true },
  { code: 'BTP_FULL',   title: 'Parcours Digital Artisan BTP',                    duration_h: 21, price_ht: 3200, tags: ['btp','artisan','seo-local','acquisition'],             audience: ['dirigeant'], active: true },
  { code: 'FIDELISA_1J',title: 'Fidélisation Client Digital',                     duration_h: 7,  price_ht: 990,  tags: ['fidelisation','crm','emailing','automatisation'],      audience: ['dirigeant','salarie'], active: true },
  { code: 'CONVERT_1J', title: 'Génération de Rendez-vous Digital',               duration_h: 7,  price_ht: 990,  tags: ['conversion','rdv','tunnel','acquisition'],             audience: ['dirigeant','salarie'], active: true },
]

// Tags issus de l'objectif → tags catalogue
const OBJECTIVE_TAGS: Record<string, string[]> = {
  clients:        ['acquisition','seo-local','reseaux-sociaux'],
  google:         ['seo-local','google','visibilite'],
  reseaux:        ['reseaux-sociaux','acquisition','contenus'],
  fidelisation:   ['fidelisation','crm','emailing'],
  site:           ['wordpress','site','seo'],
  temps:          ['productivite','automatisation','organisation'],
  automatisation: ['automatisation','ia','productivite'],
  ia:             ['ia','chatgpt','automatisation'],
  organisation:   ['organisation','automatisation','productivite'],
  competences:    ['ia','seo-local','acquisition'],
}

// NAF → tags sectoriels
const NAF_SECTOR_TAGS: Record<string, string[]> = {
  '56': ['restauration'],   // restauration
  '45': ['auto-ecole'],     // commerce/réparation auto
  '85': ['auto-ecole'],     // enseignement
  '41': ['btp','artisan'],  // construction
  '42': ['btp'],
  '43': ['btp','artisan'],
}

export function computeRecommendations(
  answers: Record<string, string>,
  businessScore: BusinessScore,
  branch: Branch,
  catalog: CatalogItem[] = CATALOG_FALLBACK,
  nafCode?: string
): Recommendation[] {

  // 1. Collecter les tags selon l'objectif
  const objective = answers['P3'] ?? ''
  const needTags = OBJECTIVE_TAGS[objective] ?? []

  // 2. Ajouter tags sectoriels selon NAF
  const sectorTags: string[] = []
  if (nafCode) {
    const prefix = nafCode.substring(0, 2)
    sectorTags.push(...(NAF_SECTOR_TAGS[prefix] ?? []))
  }

  // 3. Scorer chaque item du catalogue
  const scored = catalog
    .filter(item => item.active)
    .map(item => {
      let score = 0
      // Tags correspondants avec l'objectif
      score += item.tags.filter(t => needTags.includes(t)).length * 3
      // Tags sectoriels (priorité haute)
      score += item.tags.filter(t => sectorTags.includes(t)).length * 5
      // Bonus branche
      if (branch === 'acquisition' && ['seo-local','acquisition','reseaux-sociaux'].some(t => item.tags.includes(t))) score += 2
      if (branch === 'conversion'  && ['fidelisation','crm','conversion'].some(t => item.tags.includes(t))) score += 2
      if (branch === 'ia'          && ['ia','automatisation','productivite'].some(t => item.tags.includes(t))) score += 2

      return { item, score }
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)

  const top2 = scored.slice(0, 2)

  return top2.map((s, i) => ({
    item: s.item,
    rank: (i + 1) as 1 | 2,
    reason: buildReason(s.item, objective, branch),
  }))
}

function buildReason(item: CatalogItem, objective: string, branch: Branch): string {
  const reasonMap: Record<string, string> = {
    'IA_DIG_1J':   'Vous gagnerez du temps immédiatement et développerez de nouveaux leviers de croissance grâce à l\'IA.',
    'SEO_LOC_1J':  'Vos futurs clients vous cherchent sur Google — cette formation vous rend visible là où ils sont.',
    'AUTO_1J':     'Réduisez vos tâches répétitives de 3h/jour et concentrez-vous sur ce qui crée vraiment de la valeur.',
    'RS_ACQ_1J':   'Transformez vos réseaux en machine à leads qualifiés avec une méthode éprouvée.',
    'WP_PRO_2J':   'Devenez autonome sur votre site — plus de dépendance, plus d\'agilité.',
    'RESTO_FULL':  'Parcours complet adapté à votre secteur restauration — réservations, Google, fidélisation.',
    'AUTO_FULL':   'Parcours dédié auto-école — tout ce dont vous avez besoin pour attirer et convertir des élèves.',
    'BTP_FULL':    'Parcours artisan BTP — visibilité locale, devis efficaces, clients qui reviennent.',
    'FIDELISA_1J': 'Vos clients existants sont votre meilleur atout — apprenez à les faire revenir automatiquement.',
    'CONVERT_1J':  'Un système de prise de RDV automatisé qui travaille pour vous 24h/24.',
  }
  return reasonMap[item.code] ?? 'Adapté à votre profil et à vos objectifs prioritaires.'
}
