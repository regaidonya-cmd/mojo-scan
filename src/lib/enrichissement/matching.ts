import type { EtablissementReference, CandidatGooglePlace, ResultatMatching } from './types'

function normaliser(s: string): string {
  return s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

function similariteChaine(a: string, b: string): number {
  const na = normaliser(a), nb = normaliser(b)
  if (na === nb) return 1
  const motsA = new Set(na.split(' ')), motsB = new Set(nb.split(' '))
  const intersection = Array.from(motsA).filter((m) => motsB.has(m)).length
  const union = new Set(Array.from(motsA).concat(Array.from(motsB))).size
  return union === 0 ? 0 : intersection / union // Jaccard sur les mots — simple, explicable, sans dépendance externe
}

/**
 * calculerMatching — combine nom/enseigne + adresse + code postal + commune.
 * Ne retourne JAMAIS MATCH_FORT sur la seule proximité du nom : l'adresse
 * (ou au moins le code postal) doit aussi concorder.
 */
export function calculerMatching(
  reference: EtablissementReference,
  candidats: CandidatGooglePlace[]
): ResultatMatching {
  if (candidats.length === 0) {
    return { statut: 'NON_TROUVE', candidatRetenu: null, score: 0, raisons: ['Aucun candidat retourné par la recherche'] }
  }

  const nomReference = reference.enseigne || reference.raisonSociale
  const scored = candidats.map((c) => {
    const scoreNom = similariteChaine(nomReference, c.displayName)
    const scoreAdresse = similariteChaine(`${reference.adresse} ${reference.codePostal} ${reference.commune}`, c.formattedAddress)
    const codePostalPresent = c.formattedAddress.includes(reference.codePostal)
    // Score composite : le nom seul ne suffit jamais, l'adresse pèse autant
    const score = 0.5 * scoreNom + 0.5 * scoreAdresse
    return { candidat: c, score, scoreNom, scoreAdresse, codePostalPresent }
  }).sort((a, b) => b.score - a.score)

  const meilleur = scored[0]
  const raisons = [`Meilleur candidat: score nom=${meilleur.scoreNom.toFixed(2)}, score adresse=${meilleur.scoreAdresse.toFixed(2)}`]

  // Plusieurs candidats avec un score proche => ambigu, jamais tranché automatiquement
  const secondProche = scored[1] && (meilleur.score - scored[1].score) < 0.15
  if (secondProche) {
    raisons.push(`Second candidat trop proche (écart < 0.15) — ambiguïté non résolue automatiquement`)
    return { statut: 'AMBIGU', candidatRetenu: null, score: meilleur.score, raisons }
  }

  if (meilleur.scoreNom >= 0.6 && meilleur.codePostalPresent) {
    return { statut: 'MATCH_FORT', candidatRetenu: meilleur.candidat, score: meilleur.score, raisons }
  }
  if (meilleur.scoreNom >= 0.3 && meilleur.codePostalPresent) {
    return { statut: 'MATCH_PROBABLE', candidatRetenu: meilleur.candidat, score: meilleur.score, raisons }
  }
  raisons.push('Score insuffisant ou code postal non concordant')
  return { statut: 'AMBIGU', candidatRetenu: null, score: meilleur.score, raisons }
}
