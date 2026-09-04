// ══════════════════════════════════════════════════════════════
// MOJO SCAN — Moteur de financement FLASH
// Déterministe, prudent, avec source et date de vérification
// ══════════════════════════════════════════════════════════════

import type { Company, FundingResult } from '@/types'

// Mapping NAF → OPCO (liste simplifiée — à enrichir)
const NAF_TO_OPCO: Record<string, string> = {
  '56': 'OPCO EP',    // Restauration, cafés, hôtels
  '55': 'OPCO EP',    // Hébergement
  '45': 'OPCO Mobilités',
  '77': 'OPCO Mobilités',
  '41': 'OPCO Construction',
  '42': 'OPCO Construction',
  '43': 'OPCO Construction',
  '47': 'OPCO Commerce',
  '46': 'OPCO Commerce',
  '85': 'OPCO EP',    // Enseignement privé
  '86': 'OPCO Santé',
  '87': 'OPCO Santé',
  '88': 'OPCO Santé',
  '69': 'OPCO Atlas',   // Juridique, comptabilité
  '70': 'OPCO Atlas',   // Conseil
  '71': 'OPCO Atlas',   // Architecture, ingénierie
  '72': 'OPCO Atlas',   // R&D
  '73': 'OPCO Atlas',   // Publicité
  '74': 'OPCO Atlas',   // Activités spécialisées
  '62': 'OPCO Atlas',   // Programmation, conseil IT
  '63': 'OPCO Atlas',   // Services information
  '78': 'OPCO Cohésion Sociale', // Intérim
  '82': 'OPCO Atlas',   // Activités administratives
  '84': 'ANFH',         // Administration publique (hors scope souvent)
  '90': 'AFDAS',        // Arts, spectacle
  '91': 'AFDAS',
  '92': 'AFDAS',
  '93': 'AFDAS',
}

// Professions libérales (FIF PL)
const FIF_PL_CODES = ['69','70','71','72','73','74','75','85','86','87','88']

// Artisans (FAFCEA)
const FAFCEA_CODES = ['41','42','43','10','11','12','13','14','15','16','17','18','23','24','25','26']

export function computeFunding(
  company?: Partial<Company>,
  answers?: Record<string, string>
): FundingResult[] {
  const results: FundingResult[] = []
  const naf = company?.naf ?? ''
  const nafPrefix = naf.substring(0, 2)
  const role = answers?.['P1'] ?? 'dirigeant'
  const beneficiary = answers?.['P2'] ?? 'me'
  const employeeBand = company?.employee_band ?? 'BE'

  const isSalarie   = role === 'salarie' || beneficiary === 'team'
  const isDirigeant = role === 'dirigeant' || beneficiary === 'me' || beneficiary === 'both'
  const isTNS       = isDirigeant && ['TE','BE'].includes(employeeBand)

  // ── CPF (salarié ou demandeur d'emploi) ──────────────────────
  if (isSalarie) {
    results.push({
      funder:         'CPF (Compte Personnel de Formation)',
      coverage_label: 'Selon solde disponible sur moncompteformation.gouv.fr',
      coverage_pct:   80,
      confidence:     'medium',
      note:           'Vérifiez votre solde sur moncompteformation.gouv.fr',
    })
  }

  // ── OPCO ─────────────────────────────────────────────────────
  if (nafPrefix && NAF_TO_OPCO[nafPrefix]) {
    const opco = NAF_TO_OPCO[nafPrefix]
    const isSmall = ['TE','BE','PE'].includes(employeeBand)
    results.push({
      funder:         opco,
      coverage_label: isSmall
        ? 'Jusqu\'à 100% pour les entreprises < 50 salariés — à confirmer'
        : 'Prise en charge partielle selon votre convention',
      coverage_pct:   isSmall ? 90 : 60,
      confidence:     isSmall ? 'high' : 'medium',
      note:           'Votre OPCO a été identifié selon votre code NAF. Vérification recommandée.',
    })
  } else if (naf) {
    // OPCO non identifié précisément
    results.push({
      funder:         'OPCO (à identifier)',
      coverage_label: 'Prise en charge possible — OPCO à confirmer selon convention collective',
      coverage_pct:   70,
      confidence:     'low',
      note:           'Nous identifierons votre OPCO lors de notre échange.',
    })
  }

  // ── AGEFICE (dirigeants TNS commerce/services) ───────────────
  if (isTNS && !FIF_PL_CODES.includes(nafPrefix) && !FAFCEA_CODES.includes(nafPrefix)) {
    results.push({
      funder:         'AGEFICE',
      coverage_label: '100% pour les chefs d\'entreprise TNS (non-salarié) du commerce et services',
      coverage_pct:   100,
      confidence:     'medium',
      note:           'Eligible si gérant majoritaire ou TNS. Plafond annuel applicable.',
    })
  }

  // ── FIF PL (professions libérales) ───────────────────────────
  if (isDirigeant && FIF_PL_CODES.includes(nafPrefix)) {
    results.push({
      funder:         'FIF PL',
      coverage_label: 'Jusqu\'à 100% pour les professions libérales non réglementées',
      coverage_pct:   100,
      confidence:     'high',
      note:           'Votre secteur est éligible FIF PL. Montant plafonné selon les règles en vigueur.',
    })
  }

  // ── FAFCEA (artisans) ─────────────────────────────────────────
  if (isDirigeant && FAFCEA_CODES.includes(nafPrefix)) {
    results.push({
      funder:         'FAFCEA',
      coverage_label: 'Jusqu\'à 100% pour les chefs d\'entreprise artisanale',
      coverage_pct:   100,
      confidence:     'high',
      note:           'Votre activité artisanale vous rend éligible au FAFCEA.',
    })
  }

  // Si aucun financement détecté
  if (results.length === 0) {
    results.push({
      funder:         'Financement à identifier',
      coverage_label: 'Des dispositifs existent selon votre profil — à valider ensemble',
      coverage_pct:   70,
      confidence:     'low',
      note:           'Nous identifierons les dispositifs adaptés lors de notre échange gratuit.',
    })
  }

  return results.slice(0, 3) // Max 3 résultats affichés
}
