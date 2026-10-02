// ══════════════════════════════════════════════════════════════
// INSIGHT V1 — Aide à la préparation d'appel, DÉTERMINISTE et TRAÇABLE.
//
// Module PUR : aucun accès base, aucun réseau, aucun LLM. Il reçoit les
// données DÉJÀ présentes (SIRENE, fiche Google rapprochée, site, EMAIL V2)
// et produit :
//   - un niveau : INSIGHT_EXPLOITABLE | CONTEXTE_SEULEMENT | AUCUN_INSIGHT_FIABLE
//   - des faits observés, chacun relié à sa source ;
//   - « Pourquoi ce prospect ? » et une question d'ouverture.
// Rien n'est persisté : calcul à la lecture, données sources intactes.
//
// Doctrine : l'insight est une aide à la découverte, jamais un
// diagnostic. Une absence (site, email…) n'est jamais un problème. En cas
// de doute, on DÉGRADE (CONTEXTE_SEULEMENT, puis AUCUN_INSIGHT_FIABLE).
// Toutes les formulations viennent de ./referentiels (source unique).
// ══════════════════════════════════════════════════════════════

import {
  LIBELLES_NAF, LIBELLES_TRANCHE, TRANCHES_STRUCTURE_IMPORTANTE, FAMILLES, FAMILLE_DEPUIS_LIBELLE_LOT,
  FAMILLE_DEPUIS_NAF, NATURE_DEPUIS_NAF, MOTS_EXCLUS_IDENTITE, LEXIQUE_ACTIVITE, RESEAUX,
  DOMAINES_NON_PROPRES, QUESTION_FROIDE_PLAYBOOK, MENTION_SUGGESTION, type CleFamille,
} from './referentiels'

export type NiveauInsight = 'INSIGHT_EXPLOITABLE' | 'CONTEXTE_SEULEMENT' | 'AUCUN_INSIGHT_FIABLE'
export type SourceFait = 'SIRENE' | 'GOOGLE_PLACES' | 'EMAIL_V2'

export interface FaitObserve {
  texte: string
  source: SourceFait
  champ: string // champ d'origine, pour la traçabilité
}

/** Entrée : uniquement des données existantes, lues telles quelles. */
export interface EntreeInsight {
  raisonSociale: string
  enseigne: string | null
  naf: string | null
  trancheEffectif: string | null
  adresseSirene: string | null
  codePostalSirene: string | null
  communeSirene: string | null
  familleLot: string | null // enrichissement_resultats.famille_metier
  googleNom: string | null // fiche Google rapprochée (candidats_examines[placeId].displayName)
  googleAdresse: string | null // idem formattedAddress
  siteWeb: string | null
  statutEmailV2: string | null // observations_entreprise 'email_recherche_statut' (lecture seule)
  joignableParEmail: boolean // email exploitable dans le modèle de contact
}

export interface InsightV1 {
  niveau: NiveauInsight
  famille: CleFamille
  familleLibelle: string
  identiteGoogle: 'VERIFIEE' | 'DOUTEUSE' | 'ABSENTE'
  faits: FaitObserve[]
  aucunFaitDifferenciant: boolean
  pourquoi: string
  angle: string
  mention: string
  alertes: string[] // contexte interne, jamais présenté comme un fait observé
}

// ── Normalisation ───────────────────────────────────────────────

export function normaliser(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}
function compact(s: string): string {
  return normaliser(s).replace(/ /g, '')
}
function motsSignificatifs(s: string): string[] {
  return normaliser(s).split(' ').filter((m) => m.length >= 3 && !MOTS_EXCLUS_IDENTITE.has(m))
}
function initiales(s: string): string {
  return normaliser(s).split(' ').filter((m) => m && !['sarl', 'sas', 'sasu', 'eurl', 'ei', 'sa', 'le', 'la', 'les', 'l', 'd', 'de', 'du', 'des', 'et', 'a'].includes(m) && /^[a-z]/.test(m)).map((m) => m[0]).join('')
}
function titre(s: string): string {
  return s.toLowerCase().replace(/(^|[\s\-'’(])([a-zà-ÿ])/g, (_m, p, c) => p + c.toUpperCase())
}
function domaine(url: string | null): string | null {
  if (!url) return null
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase() } catch { return null }
}
function premiereMinuscule(q: string): string {
  return q.charAt(0).toLowerCase() + q.slice(1)
}

// ── Famille métier ──────────────────────────────────────────────

export function determinerFamille(naf: string | null, familleLot: string | null): CleFamille {
  if (naf && naf.startsWith('85.53')) return 'AUTO_ECOLE' // sous-famille, prioritaire
  if (familleLot && FAMILLE_DEPUIS_LIBELLE_LOT[familleLot]) return FAMILLE_DEPUIS_LIBELLE_LOT[familleLot]
  if (naf) for (const [prefixe, cle] of FAMILLE_DEPUIS_NAF) if (naf.startsWith(prefixe)) return cle
  return 'AUTRE'
}

export function questionMetier(famille: CleFamille): string {
  return FAMILLES[famille].question
}

// ── Identité de la fiche Google ─────────────────────────────────

function reseauxDans(texte: string): string[] {
  const n = ` ${normaliser(texte)} `
  return RESEAUX.filter((r) => n.includes(` ${r.cle} `)).map((r) => r.cle)
}

/** VERIFIEE si (1) même code postal que SIRENE et (2) le nom Google
 * recoupe la raison sociale ou l'enseigne. Un réseau/marque ne compte
 * pour l'identité que s'il est déclaré en enseigne, ou si la raison
 * sociale COMMENCE par cette marque (ex. FONCIA…, LAPEYRE) — jamais un
 * simple homonyme (ex. une personne nommée Renault). */
export function verifierIdentiteGoogle(e: Pick<EntreeInsight, 'raisonSociale' | 'enseigne' | 'codePostalSirene' | 'googleNom' | 'googleAdresse'>): 'VERIFIEE' | 'DOUTEUSE' | 'ABSENTE' {
  if (!e.googleNom) return 'ABSENTE'
  if (!e.codePostalSirene || !e.googleAdresse || !e.googleAdresse.includes(e.codePostalSirene)) return 'DOUTEUSE'

  const g = e.googleNom
  const gMots = new Set(motsSignificatifs(g))
  const gCompact = compact(g)
  const reseauxGoogle = new Set(reseauxDans(g))
  const premierMotRS = normaliser(e.raisonSociale).split(' ')[0] ?? ''

  for (const source of [e.raisonSociale, e.enseigne].filter(Boolean) as string[]) {
    const estEnseigne = source === e.enseigne
    for (const m of motsSignificatifs(source)) {
      const estReseau = RESEAUX.some((r) => r.cle === m)
      if (estReseau && !estEnseigne && m !== premierMotRS) continue // homonyme d'une marque : ignoré
      if (estReseau && reseauxGoogle.has(m)) return 'VERIFIEE'
      if (gMots.has(m)) return 'VERIFIEE'
      if (m.length >= 4 && gCompact.includes(m)) return 'VERIFIEE'
    }
    for (const gm of Array.from(gMots)) if (gm.length >= 4 && !RESEAUX.some((r) => r.cle === gm) && compact(source).includes(gm)) return 'VERIFIEE'
    const sc = motsSignificatifs(source).join('') || compact(source)
    if (sc.length >= 3 && gCompact.includes(sc)) return 'VERIFIEE'
    if (compact(source).length >= 3 && gCompact.includes(compact(source))) return 'VERIFIEE'
    if (compact(source).length === 2 && gCompact.startsWith(compact(source))) return 'VERIFIEE' // ex. « M & K »
    const ini = initiales(source)
    if (ini.length >= 3 && Array.from(gMots).some((gm) => gm.startsWith(ini))) return 'VERIFIEE' // ex. CBM75
  }
  return 'DOUTEUSE'
}

// ── Faits propres à l'entreprise ────────────────────────────────

function enseigneDistincte(e: EntreeInsight): boolean {
  if (!e.enseigne) return false
  const a = compact(e.enseigne), b = compact(e.raisonSociale)
  return !!a && !a.includes(b) && !b.includes(a)
}

/** Segment de l'intitulé Google qui porte l'information (séparateurs
 * « - » ou « | »), cité tel quel, jamais reformulé. */
function segmentDescriptif(googleNom: string, motsAjoutes: Set<string>, reseaux: string[]): string {
  const segments = googleNom.split(/\s[-|]\s|\s\|\s|\|/).map((s) => s.trim()).filter(Boolean)
  const porteur = segments.find((s) => {
    const n = ` ${normaliser(s)} `
    return Array.from(motsAjoutes).some((m) => n.includes(` ${m} `)) || reseaux.some((r) => n.includes(` ${r} `))
  })
  return porteur ?? googleNom.trim()
}

function analyseIntituleGoogle(e: EntreeInsight): { descriptif: boolean; reseaux: string[]; segment: string | null } {
  if (!e.googleNom) return { descriptif: false, reseaux: [], segment: null }
  const deja = new Set([...normaliser(e.raisonSociale).split(' '), ...(e.enseigne ? normaliser(e.enseigne).split(' ') : [])])
  const ajoutes = new Set(normaliser(e.googleNom).split(' ').filter((m) => LEXIQUE_ACTIVITE.has(m) && !deja.has(m)))
  // Un réseau déjà présent dans la raison sociale n'apporte rien (ex. LAPEYRE).
  const reseaux = reseauxDans(e.googleNom).filter((r) => !` ${normaliser(e.raisonSociale)} `.includes(` ${r} `))
  const descriptif = ajoutes.size > 0 || reseaux.length > 0
  return { descriptif, reseaux, segment: descriptif ? segmentDescriptif(e.googleNom, ajoutes, reseaux) : null }
}

// ── Calcul principal ────────────────────────────────────────────

export function calculerInsightV1(e: EntreeInsight): InsightV1 {
  const famille = determinerFamille(e.naf, e.familleLot)
  const fam = FAMILLES[famille]
  const identite = verifierIdentiteGoogle(e)
  const commune = e.communeSirene ? titre(e.communeSirene) : null
  const nature = (e.naf && NATURE_DEPUIS_NAF[e.naf]) || fam.nature
  const alertes: string[] = []

  // Faits SIRENE (toujours vrais pour l'entité déclarée)
  const faits: FaitObserve[] = []
  if (e.naf) {
    const lib = LIBELLES_NAF[e.naf]
    faits.push({ texte: lib ? `Activité déclarée : ${lib} (NAF ${e.naf})` : `Activité déclarée : NAF ${e.naf}`, source: 'SIRENE', champ: 'companies.naf' })
  }
  const ensDistincte = enseigneDistincte(e)
  if (ensDistincte) faits.push({ texte: `Enseigne déclarée : ${e.enseigne}`, source: 'SIRENE', champ: 'companies.trade_name' })

  // Faits Google / site : UNIQUEMENT si l'identité est vérifiée
  const google = identite === 'VERIFIEE' ? analyseIntituleGoogle(e) : { descriptif: false, reseaux: [], segment: null }
  if (identite === 'VERIFIEE' && e.googleNom) {
    faits.push({ texte: `Fiche Google : « ${e.googleNom.trim()} »`, source: 'GOOGLE_PLACES', champ: 'enrichissement_resultats.candidats_examines.displayName' })
    for (const r of google.reseaux) {
      const lib = RESEAUX.find((x) => x.cle === r)?.libelle ?? r
      faits.push({ texte: `Réseau / marque mentionné : ${lib}`, source: 'GOOGLE_PLACES', champ: 'enrichissement_resultats.candidats_examines.displayName' })
    }
    const dom = domaine(e.siteWeb)
    const siteMort = e.statutEmailV2 === 'PAS_DE_SITE_EXPLOITABLE'
    if (dom && !siteMort && !DOMAINES_NON_PROPRES.some((d) => dom === d || dom.endsWith('.' + d))) {
      faits.push({ texte: `Site web : ${dom}`, source: 'GOOGLE_PLACES', champ: 'enrichissement_resultats.site_web' })
    }
  }

  // Classification
  let niveau: NiveauInsight
  if (identite !== 'VERIFIEE') niveau = 'AUCUN_INSIGHT_FIABLE'
  else if (ensDistincte || google.descriptif) niveau = 'INSIGHT_EXPLOITABLE'
  else niveau = 'CONTEXTE_SEULEMENT'

  // Alertes (contexte interne)
  if (identite === 'DOUTEUSE' && e.googleAdresse && e.codePostalSirene && !e.googleAdresse.includes(e.codePostalSirene)) {
    alertes.push(`La fiche Google rapprochée est située hors de ${e.codePostalSirene} : le numéro appartient peut-être à une autre entreprise.`)
  } else if (identite === 'DOUTEUSE') {
    alertes.push(`La fiche Google rapprochée porte un autre nom (« ${e.googleNom?.trim()} ») : identité du numéro à confirmer.`)
  } else if (identite === 'ABSENTE') {
    alertes.push('Aucune fiche Google rapprochée : identité du numéro à confirmer.')
  }
  const structureImportante = !!e.trancheEffectif && TRANCHES_STRUCTURE_IMPORTANTE.has(e.trancheEffectif)
  if (structureImportante) alertes.push('Structure importante : décisionnaire à identifier.')

  // POURQUOI CE PROSPECT ?
  const effectif = e.trancheEffectif && LIBELLES_TRANCHE[e.trancheEffectif] ? ` (${LIBELLES_TRANCHE[e.trancheEffectif]} déclarés)` : ''
  const lieu = commune ? ` à ${commune}` : ''
  const joignable = e.joignableParEmail ? 'Joignable par téléphone et par email.' : 'Joignable par téléphone.'
  let pourquoi: string
  let accroche: string | null = null
  if (niveau === 'AUCUN_INSIGHT_FIABLE') {
    pourquoi = `${nature}${lieu}, dans le périmètre local de MOJO Académie. ⚠ Identité du numéro à confirmer avant toute approche.`
  } else {
    pourquoi = `${nature}${effectif}${lieu}, dans le périmètre local de MOJO Académie. ${joignable}`
    if (niveau === 'INSIGHT_EXPLOITABLE') {
      accroche = google.segment
        ?? (e.googleNom && e.enseigne && (compact(e.googleNom).includes(compact(e.enseigne)) || compact(e.enseigne).includes(compact(e.googleNom))) ? e.googleNom.trim() : e.enseigne)
      pourquoi += ` Se présente publiquement comme « ${accroche} ».`
    }
    if (structureImportante) pourquoi += ' ⚠ Structure importante : décisionnaire à identifier.'
  }

  // ANGLE D'APPROCHE (question d'ouverture)
  let angle: string
  if (niveau === 'AUCUN_INSIGHT_FIABLE') {
    angle = `Je cherche à joindre ${e.raisonSociale}${lieu} : est-ce bien vous ? Puis : ${QUESTION_FROIDE_PLAYBOOK}`
  } else if (niveau === 'INSIGHT_EXPLOITABLE' && accroche) {
    angle = `J'ai vu que vous vous présentez comme « ${accroche} » : ${premiereMinuscule(fam.question)}`
  } else {
    angle = fam.question
  }

  return {
    niveau, famille, familleLibelle: fam.libelle, identiteGoogle: identite,
    faits, aucunFaitDifferenciant: niveau !== 'INSIGHT_EXPLOITABLE',
    pourquoi, angle, mention: MENTION_SUGGESTION, alertes,
  }
}

// ── Qualité de contact (calculée, jamais persistée) ─────────────

export type QualiteContact = 'A_COMPLET' | 'B_APPELABLE'

/** A_COMPLET = téléphone fiable + email exploitable (modèle de contact,
 * CONFIRME/PROBABLE, non opposé). B_APPELABLE = téléphone fiable sans
 * email exploitable. null = pas de téléphone autorisé (hors grille).
 * Indépendant d'INSIGHT et des statuts EMAIL V2 (simple sous-motif). */
export function calculerQualiteContact(telephoneAutorise: boolean, emailExploitable: boolean): QualiteContact | null {
  if (!telephoneAutorise) return null
  return emailExploitable ? 'A_COMPLET' : 'B_APPELABLE'
}

export const LIBELLES_STATUT_EMAIL: Record<string, string> = {
  EMAIL_TROUVE: 'email trouvé',
  EMAIL_RECHERCHE_NON_TROUVE: 'recherche effectuée, aucun email trouvé',
  RECHERCHE_EMAIL_NON_EFFECTUEE: 'recherche email non effectuée',
  PAS_DE_SITE_EXPLOITABLE: 'pas de site exploitable pour la recherche',
  A_VERIFIER_ATTRIBUTION: 'email à vérifier (attribution)',
}

/** Données Google brutes -> nom/adresse de la fiche rapprochée (placeId). */
export function ficheGoogleRapprochee(placeId: string | null, candidats: unknown): { nom: string | null; adresse: string | null } {
  if (!placeId || !Array.isArray(candidats)) return { nom: null, adresse: null }
  const c = (candidats as any[]).find((x) => x && x.placeId === placeId)
  return { nom: c?.displayName ?? null, adresse: c?.formattedAddress ?? null }
}
