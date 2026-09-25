import type { EtablissementReference, CandidatGooglePlace, ResultatMatching, DetailScoreCandidat } from './types'

// ══════════════════════════════════════════════════════════════
// ENRICH.VSG.4 — Matching V2. Règles exactes (documentées, pas seulement
// codées) :
//
// SEUIL_PLAUSIBLE = 0.35 (score composite minimal pour qu'un candidat
//   compte comme "plausible" — sous ce seuil, il est ignoré, jamais
//   comparé à un autre pour décider d'une ambiguïté).
// SEUIL_ECART_AMBIGU = 0.15 (écart de score minimal entre le meilleur et
//   le second candidat PLAUSIBLE pour trancher sans ambiguïté).
// SEUIL_NOM_FORT = 0.6, SEUIL_ADRESSE_FORT = 0.5 (MATCH_FORT exige les
//   DEUX à la fois — double corroboration, jamais le nom seul).
//
// MATCH_FORT    = 1 candidat plausible dominant, nom ET adresse forts.
// MATCH_PROBABLE = 1 candidat plausible dominant, mais preuve incomplète
//   (nom fort/adresse faible, ou l'inverse).
// AMBIGU         = >= 2 candidats plausibles trop proches pour trancher.
// NON_TROUVE     = aucun candidat plausible (même si des candidats bruts
//   existent — un score faible ne compte pas comme "trouvé").
// ══════════════════════════════════════════════════════════════

const SEUIL_PLAUSIBLE = 0.35
const SEUIL_ECART_AMBIGU = 0.15
const SEUIL_NOM_FORT = 0.6
const SEUIL_ADRESSE_FORT = 0.5

function normaliser(s: string): string {
  return s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

function jaccardMots(a: string, b: string): number {
  const na = normaliser(a), nb = normaliser(b)
  if (na === nb) return 1
  const motsA = new Set(na.split(' ')), motsB = new Set(nb.split(' '))
  const intersection = Array.from(motsA).filter((m) => motsB.has(m)).length
  const union = new Set(Array.from(motsA).concat(Array.from(motsB))).size
  return union === 0 ? 0 : intersection / union
}

/** Coefficient de Dice sur bigrammes de caractères — gère les sigles,
 * variations légères et préfixes/titres, là où le Jaccard mots entiers
 * est trop binaire (tout ou rien) sur les noms courts. */
function diceBigrammes(a: string, b: string): number {
  const bigrammes = (s: string): string[] => {
    const n = normaliser(s).replace(/ /g, '')
    if (n.length < 2) return [n]
    const out: string[] = []
    for (let i = 0; i < n.length - 1; i++) out.push(n.slice(i, i + 2))
    return out
  }
  const ba = bigrammes(a), bb = bigrammes(b)
  if (ba.length === 0 || bb.length === 0) return 0
  const setB = new Map<string, number>()
  for (const g of bb) setB.set(g, (setB.get(g) ?? 0) + 1)
  let communs = 0
  for (const g of ba) {
    const restant = setB.get(g) ?? 0
    if (restant > 0) { communs++; setB.set(g, restant - 1) }
  }
  return (2 * communs) / (ba.length + bb.length)
}

/** scoreNom = meilleur des deux signaux (mots entiers OU caractères) —
 * capture aussi bien les noms longs à mots identiques que les sigles/
 * noms courts avec variations légères. Ne sert jamais seul à décider :
 * toujours combiné à l'adresse dans le score composite. */
function scoreNomCombine(a: string, b: string): number {
  return Math.max(jaccardMots(a, b), diceBigrammes(a, b))
}

export function calculerMatching(
  reference: EtablissementReference,
  candidats: CandidatGooglePlace[]
): ResultatMatching {
  if (candidats.length === 0) {
    return { statut: 'NON_TROUVE', candidatRetenu: null, score: 0, raisons: ['Aucun candidat retourné par la recherche'], candidatsExamines: [] }
  }

  const nomReference = reference.enseigne || reference.raisonSociale
  const scored = candidats.map((c) => {
    const scoreNom = scoreNomCombine(nomReference, c.displayName)
    const scoreAdresse = jaccardMots(`${reference.adresse} ${reference.codePostal} ${reference.commune}`, c.formattedAddress)
    const codePostalPresent = c.formattedAddress.includes(reference.codePostal)
    // Score composite : adresse pèse autant que le nom — un nom fort avec
    // une adresse incompatible ne doit jamais dominer seul.
    const scoreComposite = 0.5 * scoreNom + 0.5 * scoreAdresse
    return { candidat: c, scoreNom, scoreAdresse, scoreComposite, codePostalPresent }
  }).sort((a, b) => b.scoreComposite - a.scoreComposite)

  const detailTop3: DetailScoreCandidat[] = scored.slice(0, 3).map((s) => ({
    placeId: s.candidat.placeId, displayName: s.candidat.displayName, formattedAddress: s.candidat.formattedAddress,
    scoreNom: s.scoreNom, scoreAdresse: s.scoreAdresse, scoreComposite: s.scoreComposite,
    codePostalPresent: s.codePostalPresent, plausible: s.scoreComposite >= SEUIL_PLAUSIBLE,
  }))

  const plausibles = scored.filter((s) => s.scoreComposite >= SEUIL_PLAUSIBLE)

  // Aucun candidat plausible => NON_TROUVE, jamais AMBIGU par défaut.
  if (plausibles.length === 0) {
    return {
      statut: 'NON_TROUVE', candidatRetenu: null, score: scored[0].scoreComposite,
      raisons: [`Aucun candidat n'atteint le seuil de plausibilité (${SEUIL_PLAUSIBLE}) — meilleur score observé: ${scored[0].scoreComposite.toFixed(2)}`],
      candidatsExamines: detailTop3,
    }
  }

  // Deux candidats plausibles trop proches => AMBIGU (vraie ambiguïté,
  // jamais déclenchée par deux candidats tous les deux faibles).
  const meilleur = plausibles[0]
  const ecartAuSecond = plausibles[1] ? meilleur.scoreComposite - plausibles[1].scoreComposite : 1
  if (plausibles.length >= 2 && ecartAuSecond < SEUIL_ECART_AMBIGU) {
    return {
      statut: 'AMBIGU', candidatRetenu: null, score: meilleur.scoreComposite,
      raisons: [`${plausibles.length} candidats plausibles, écart trop faible (${ecartAuSecond.toFixed(2)} < ${SEUIL_ECART_AMBIGU}) — ambiguïté réelle, non tranchée automatiquement`],
      candidatsExamines: detailTop3,
    }
  }

  // Double corroboration (nom fort ET adresse forte) => MATCH_FORT.
  if (meilleur.scoreNom >= SEUIL_NOM_FORT && meilleur.codePostalPresent && meilleur.scoreAdresse >= SEUIL_ADRESSE_FORT) {
    return {
      statut: 'MATCH_FORT', candidatRetenu: meilleur.candidat, score: meilleur.scoreComposite,
      raisons: [`Candidat dominant, nom fort (${meilleur.scoreNom.toFixed(2)}) ET adresse forte (${meilleur.scoreAdresse.toFixed(2)}) — double corroboration`],
      candidatsExamines: detailTop3,
    }
  }

  // Candidat dominant mais preuve incomplète (nom OU adresse fort, pas les deux) => MATCH_PROBABLE.
  return {
    statut: 'MATCH_PROBABLE', candidatRetenu: meilleur.candidat, score: meilleur.scoreComposite,
    raisons: [`Candidat dominant (plausible, non ambigu) mais corroboration incomplète : nom=${meilleur.scoreNom.toFixed(2)}, adresse=${meilleur.scoreAdresse.toFixed(2)} — décision humaine recommandée`],
    candidatsExamines: detailTop3,
  }
}
