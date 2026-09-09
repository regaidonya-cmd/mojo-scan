// ══════════════════════════════════════════════════════════════
// MOJO LEAD ENGINE — Moteur de financement v2
//
// Architecture : SIRET → orientation NAF → OPCO (probable/to_confirm)
// Séparation stricte OPCO entreprise / Financeur bénéficiaire
// Aucun % affiché au prospect
// NAF_VERSION explicite — migration NAF 2025 prévue 2027
// ══════════════════════════════════════════════════════════════

import type { Company, FundingResult, OpcoResult, FundingBody } from '@/types'

export const NAF_VERSION = 'NAF_REV2_2008' as const

// ── Orientation NAF → OPCO (jamais "certain" seul) ────────────
// Source : France Compétences — périmètres OPCO 2021
// Confiance max sans IDCC : 'probable'
const NAF_OPCO_ORIENTATION: Record<string, { opco: string; note: string }> = {
  '01': { opco:'OCAPIAT',               note:'Agriculture, production végétale/animale' },
  '02': { opco:'OCAPIAT',               note:'Sylviculture' },
  '03': { opco:'OCAPIAT',               note:'Pêche et aquaculture' },
  '10': { opco:'OPCO 2i',               note:'Industries alimentaires' },
  '11': { opco:'OPCO 2i',               note:'Fabrication de boissons' },
  '13': { opco:'OPCO 2i',               note:'Textiles' },
  '14': { opco:'OPCO 2i',               note:'Habillement' },
  '16': { opco:'OPCO 2i',               note:'Travail du bois' },
  '17': { opco:'OPCO 2i',               note:'Papier/carton' },
  '18': { opco:'OPCO 2i',               note:'Imprimerie' },
  '20': { opco:'OPCO 2i',               note:'Industrie chimique' },
  '22': { opco:'OPCO 2i',               note:'Caoutchouc/plastique' },
  '23': { opco:'OPCO 2i',               note:'Produits minéraux' },
  '24': { opco:'OPCO 2i',               note:'Métallurgie' },
  '25': { opco:'OPCO 2i',               note:'Produits métalliques' },
  '26': { opco:'OPCO 2i',               note:'Informatique/électronique' },
  '27': { opco:'OPCO 2i',               note:'Équipements électriques' },
  '28': { opco:'OPCO 2i',               note:'Machines et équipements' },
  '29': { opco:'OPCO 2i',               note:'Automobile' },
  '30': { opco:'OPCO 2i',               note:'Matériels de transport' },
  '31': { opco:'OPCO 2i',               note:'Fabrication meubles' },
  '32': { opco:'OPCO 2i',               note:'Autres industries manufacturières' },
  '41': { opco:'OPCO Constructys',      note:'Construction de bâtiments' },
  '42': { opco:'OPCO Constructys',      note:'Génie civil' },
  '43': { opco:'OPCO Constructys',      note:'Travaux spécialisés' },
  '45': { opco:'OPCO Mobilités',        note:'Commerce/réparation automobiles' },
  '46': { opco:'OPCO Commerce',         note:'Commerce de gros' },
  '47': { opco:'OPCO Commerce',         note:'Commerce de détail' },
  '49': { opco:'OPCO Mobilités',        note:'Transports terrestres' },
  '50': { opco:'OPCO Mobilités',        note:'Transports par eau' },
  '51': { opco:'OPCO Mobilités',        note:'Transports aériens' },
  '52': { opco:'OPCO Mobilités',        note:'Entreposage et auxiliaires transport' },
  '53': { opco:'OPCO Mobilités',        note:'Poste et courrier' },
  '55': { opco:'OPCO EP',               note:'Hébergement/hôtellerie' },
  '56': { opco:'OPCO EP',               note:'Restauration' },
  '58': { opco:'AFDAS',                 note:'Édition' },
  '59': { opco:'AFDAS',                 note:'Production audiovisuelle' },
  '60': { opco:'AFDAS',                 note:'Programmation et diffusion' },
  '61': { opco:'OPCO Atlas',            note:'Télécommunications' },
  '62': { opco:'OPCO Atlas',            note:'Informatique/conseil IT' },
  '63': { opco:'OPCO Atlas',            note:'Services d\'information' },
  '64': { opco:'OPCO Atlas',            note:'Services financiers' },
  '65': { opco:'OPCO Atlas',            note:'Assurances' },
  '66': { opco:'OPCO Atlas',            note:'Activités auxiliaires financières' },
  '68': { opco:'OPCO Atlas',            note:'Immobilier' },
  '69': { opco:'OPCO Atlas',            note:'Activités juridiques et comptables' },
  '70': { opco:'OPCO Atlas',            note:'Conseil de gestion' },
  '71': { opco:'OPCO Atlas',            note:'Architecture, ingénierie' },
  '72': { opco:'OPCO Atlas',            note:'R&D scientifique' },
  '73': { opco:'OPCO Atlas',            note:'Publicité et études de marché' },
  '74': { opco:'OPCO Atlas',            note:'Activités spécialisées diverses' },
  '75': { opco:'OCAPIAT',               note:'Activités vétérinaires' },
  '77': { opco:'OPCO Mobilités',        note:'Location et crédit-bail' },
  '78': { opco:'OPCO Cohésion Sociale', note:'Emploi/intérim' },
  '79': { opco:'AFDAS',                 note:'Agences de voyage' },
  '80': { opco:'OPCO Cohésion Sociale', note:'Sécurité/enquêtes' },
  '81': { opco:'OPCO EP',               note:'Services aux bâtiments/paysage' },
  '82': { opco:'OPCO Atlas',            note:'Services administratifs bureaux' },
  '84': { opco:'ANFH',                  note:'Administration publique' },
  '85': { opco:'OPCO EP',               note:'Enseignement privé' },
  '86': { opco:'OPCO Santé',            note:'Santé humaine' },
  '87': { opco:'OPCO Santé',            note:'Hébergement médico-social' },
  '88': { opco:'OPCO Santé',            note:'Action sociale sans hébergement' },
  '90': { opco:'AFDAS',                 note:'Arts, spectacle, activités créatives' },
  '91': { opco:'AFDAS',                 note:'Bibliothèques, musées' },
  '92': { opco:'AFDAS',                 note:'Jeux de hasard' },
  '93': { opco:'AFDAS',                 note:'Sport et loisirs' },
  '94': { opco:'OPCO Cohésion Sociale', note:'Associations' },
  '95': { opco:'OPCO Atlas',            note:'Réparation équipements' },
  '96': { opco:'OPCO EP',               note:'Services personnels (coiffure, esthétique...)' },
  '97': { opco:'OPCO Cohésion Sociale', note:'Employeurs personnels domestiques' },
}

// ── Préfixes NAF → dispositif bénéficiaire ────────────────────
const FIF_PL_NAF  = ['69','70','71','72','73','74','75','85','86','87','88']
const FAFCEA_NAF  = ['41','42','43','10','11','12','13','14','16','17','18',
                     '23','24','25','26','27','28','29','30','31','32']
const AGEFICE_EXCL = [...FIF_PL_NAF, ...FAFCEA_NAF]

// ══════════════════════════════════════════════════════════════
// POINT D'ENTRÉE PRINCIPAL
// ══════════════════════════════════════════════════════════════
export function computeFunding(
  company?: Partial<Company>,
  answers?: Record<string, string>
): FundingResult[] {

  const naf       = (company?.naf ?? '').replace(/\s/g, '').toUpperCase()
  const nafPrefix  = naf.substring(0, 2)

  // Statut bénéficiaire — P8 explicite > déduction P1/P2
  const p8 = answers?.['P8'] ?? ''
  const p1 = answers?.['P1'] ?? ''
  const p2 = answers?.['P2'] ?? ''

  const isTNS     = p8 === 'tns'     || (!p8 && (p1 === 'dirigeant' || p2 === 'me' || p2 === 'both'))
  const isSalarie = p8 === 'salarie' || (!p8 && (p1 === 'salarie'   || p2 === 'team'))

  const opco    = resolveOpco(naf, nafPrefix, company)
  const funding = resolveFunding(nafPrefix, isTNS, isSalarie, !!p8)
  const text    = buildProspectText(opco, funding)

  return [{
    funder:         funding.funding_body,
    coverage_label: funding.funding_reason,
    opco,
    funding_body:   funding,
    prospect_text:  text,
    naf_version:    NAF_VERSION,
  }]
}

// ── A. Résolution OPCO entreprise ─────────────────────────────
function resolveOpco(naf: string, nafPrefix: string, company?: Partial<Company>): OpcoResult {

  const orientation = nafPrefix ? NAF_OPCO_ORIENTATION[nafPrefix] : null

  // SIRET présent + NAF mappé → probable (pas certain : IDCC absent)
  if (company?.siret && orientation) {
    return {
      opco_name:       orientation.opco,
      opco_status:     'probable',
      opco_confidence: 'medium',
      opco_source:     'naf_orientation',
      opco_note:       `Orientation basée sur le code APE ${naf} (${orientation.note}). La convention collective (IDCC) est nécessaire pour confirmer.`,
    }
  }

  // NAF seul → to_confirm
  if (orientation) {
    return {
      opco_name:       orientation.opco,
      opco_status:     'to_confirm',
      opco_confidence: 'low',
      opco_source:     'naf_orientation',
      opco_note:       `Orientation indicative sur le code APE ${naf}. À confirmer avec la convention collective.`,
    }
  }

  // Inconnu
  return {
    opco_name:       'À identifier',
    opco_status:     'unknown',
    opco_confidence: 'low',
    opco_source:     'unknown',
    opco_note:       'Code APE non mappé. L\'OPCO sera identifié lors de l\'échange.',
  }
}

// ── B. Résolution financeur bénéficiaire ──────────────────────
function resolveFunding(
  nafPrefix: string,
  isTNS: boolean,
  isSalarie: boolean,
  statutExplicite: boolean
): FundingBody {

  const conf: 'medium' | 'low' = statutExplicite ? 'medium' : 'low'
  const statutNote = statutExplicite ? '' : ' (statut déduit du questionnaire — à confirmer).'

  if (isSalarie) {
    return {
      funding_body:       'CPF (Compte Personnel de Formation)',
      funding_status:     'probable',
      funding_confidence: conf,
      funding_reason:     'Le CPF est le dispositif principal pour les salariés souhaitant se former à titre individuel.',
      funding_note:       `Montant disponible sur moncompteformation.gouv.fr${statutNote} Un abondement employeur peut être possible.`,
    }
  }

  if (isTNS && FIF_PL_NAF.includes(nafPrefix)) {
    return {
      funding_body:       'FIF PL',
      funding_status:     'probable',
      funding_confidence: conf,
      funding_reason:     'Le FIF PL est le fonds de formation des professionnels libéraux. Votre secteur semble correspondre.',
      funding_note:       `Éligibilité et montant à confirmer selon votre situation${statutNote}`,
    }
  }

  if (isTNS && FAFCEA_NAF.includes(nafPrefix)) {
    return {
      funding_body:       'FAFCEA',
      funding_status:     'probable',
      funding_confidence: conf,
      funding_reason:     'Le FAFCEA est le fonds de formation des chefs d\'entreprise artisanale. Votre activité semble correspondre.',
      funding_note:       `Nécessite une immatriculation au Répertoire des Métiers${statutNote}`,
    }
  }

  if (isTNS && !AGEFICE_EXCL.includes(nafPrefix)) {
    return {
      funding_body:       'AGEFICE',
      funding_status:     'probable',
      funding_confidence: conf,
      funding_reason:     'L\'AGEFICE est le fonds de formation des chefs d\'entreprise non-salariés du commerce et des services.',
      funding_note:       `Éligibilité conditionnée au statut TNS (gérant non-salarié)${statutNote}`,
    }
  }

  return {
    funding_body:       'À identifier lors de l\'échange',
    funding_status:     'unknown',
    funding_confidence: 'low',
    funding_reason:     'Le dispositif applicable dépend de votre statut juridique exact (salarié, dirigeant TNS, gérant salarié...).',
    funding_note:       'MOJO ACADÉMIE vous aide à l\'identifier et à constituer votre dossier.',
  }
}

// ── C. Texte prospect — sobre, sans % ────────────────────────
function buildProspectText(opco: OpcoResult, fb: FundingBody): string {
  const opcoStr = opco.opco_status === 'unknown'
    ? 'le rattachement OPCO de votre entreprise reste à confirmer'
    : `votre entreprise semble rattachée à ${opco.opco_name} (à confirmer)`

  const fbStr = fb.funding_status === 'unknown'
    ? 'un financement partiel ou total peut être possible selon votre statut et les critères en vigueur'
    : `un financement via ${fb.funding_body} peut être possible selon votre situation`

  return `Sur la base des éléments renseignés, ${opcoStr}. ${fbStr}. MOJO ACADÉMIE vous accompagne dans la vérification et la constitution de votre dossier lors de l'échange gratuit.`
}
