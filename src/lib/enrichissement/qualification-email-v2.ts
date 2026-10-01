import type { EmailTrouve } from './extraction-email-sdr'

// ══════════════════════════════════════════════════════════════
// Qualification email V2 — module PUR (aucune écriture DB, aucun appel
// réseau). Reprend les EmailTrouve[] déjà extraits (V1, inchangée) et
// les re-qualifie selon la taxonomie V2. communeCible est un PARAMÈTRE
// — aucune commune (Villeneuve-Saint-Georges, VSG...) n'est codée en dur
// dans ce moteur, réutilisable pour tout futur territoire.
// ══════════════════════════════════════════════════════════════

export type RelationDomaineV2 = 'SITE_PROPRE' | 'PLATEFORME_ANNUAIRE' | 'SITE_RESEAU_FRANCHISE' | 'DOMAINE_AFFILIE' | 'WEBMAIL_PUBLIC' | 'EXCLU_TECHNIQUE'
export type NiveauConfianceV2 = 'CONFIRME' | 'PROBABLE' | 'A_VERIFIER' | 'A_VERIFIER_ATTRIBUTION'

export interface EmailQualifie {
  email: string
  emailDomain: string
  relationDomaine: RelationDomaineV2
  niveauConfiance: NiveauConfianceV2
  sourceUrl: string
  raisonAttribution: string
}

export interface ResultatQualifieEntreprise {
  companyId: string
  siren: string
  siteWeb: string
  emailPrincipal: EmailQualifie | null
  emailsSecondaires: EmailQualifie[]
  emailsExclus: EmailQualifie[]
}

export interface EntreeQualification {
  companyId: string
  siren: string
  siteWeb: string
  telephone: string | null
  telephoneFiable: boolean // seul un téléphone FIABLE déclenche A_VERIFIER_ATTRIBUTION sur doublon
  emailsTrouves: EmailTrouve[]
  communeCible: string
  aliasesCommune?: string[] // ex. ['vsg'] pour Villeneuve-Saint-Georges — jamais déduit automatiquement
}

const WEBMAILS_PUBLICS = [
  'gmail.com', 'googlemail.com', 'outlook.com', 'outlook.fr', 'hotmail.com', 'hotmail.fr',
  'live.com', 'live.fr', 'yahoo.com', 'yahoo.fr', 'orange.fr', 'wanadoo.fr', 'free.fr',
  'laposte.net', 'sfr.fr', 'bbox.fr', 'icloud.com', 'me.com', 'aol.com',
]

const PRESTATAIRES_TECHNIQUES_CONNUS = ['linkeo.com', 'clara.net', 'wix.com', 'wixpress.com', 'abyxo.com']
const DOMAINES_EXEMPLE = ['exemple.com', 'exemple.fr', 'example.com', 'example.org']
const DOMAINES_GENERIQUES_SUSPECTS = ['mail.com', 'email.com', 'email.fr', 'domain.com']
const EXTENSIONS_FICHIER = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp']
const MOTS_CLES_TOUJOURS_TECHNIQUES = ['dpo', 'webmestre', 'mediateur', 'mediation', 'cil', 'noreply', 'no-reply', 'exceptions']
const MOTS_CLES_TECHNIQUES_CONDITIONNELS = ['support'] // recevable sur un vrai SITE_PROPRE (ex. support@monentreprise.fr)
const PATTERNS_PRENOM_NOM_GENERIQUES = ['jean.dupont', 'martin.durand', 'marie.durand', 'camille.dupont', 'martindupont']

function domaineRacine(hostname: string): string {
  return hostname.replace(/^www\./, '')
}

function racineSansSeparateurs(domaine: string): string {
  // "vsg-pneus.fr" et "vsgpneu.com" -> comparables après retrait tirets/TLD, approximatif et volontairement simple
  return domaine.replace(/^www\./, '').split('.')[0].replace(/[-_]/g, '').toLowerCase()
}

function normaliserPourComparaison(s: string): string {
  return s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '')
}

// Mots trop génériques pour constituer une preuve géographique à eux
// seuls (fréquents dans des centaines de noms de communes françaises :
// Saint-X, Sainte-X, La/Le/Les X, Sur-X, etc.) — jamais retenus seuls,
// même s'ils dépassent le seuil de longueur.
const MOTS_COMMUNE_TROP_GENERIQUES = ['saint', 'sainte', 'les', 'le', 'la', 'sur', 'sous', 'en', 'de', 'du', 'des', 'aux', 'nouvelle', 'grand', 'grande', 'petit', 'petite', 'notre', 'dame']

/** Formes normalisées de la commune cible : nom complet + CHAQUE mot
 * significatif (>3 caractères, hors mots trop génériques) + alias
 * explicites fournis en entrée. Toujours DÉRIVÉ du paramètre
 * communeCible, jamais une commune codée en dur dans le moteur. */
function formesCommune(communeCible: string, aliases: string[] = []): string[] {
  const formeComplete = normaliserPourComparaison(communeCible)
  const mots = communeCible.split(/[\s\-]+/)
    .filter((m) => !MOTS_COMMUNE_TROP_GENERIQUES.includes(m.toLowerCase()))
    .map(normaliserPourComparaison)
    .filter((m) => m.length > 3)
  return [formeComplete, ...mots, ...aliases.map(normaliserPourComparaison)].filter((f) => f.length > 0)
}

function contientFormeCommune(texte: string, formes: string[]): boolean {
  const t = normaliserPourComparaison(texte)
  return formes.some((f) => t.includes(f))
}

/** Étape B — EXCLU_TECHNIQUE, déterministe, prioritaire sur tout le reste. */
function estExcluTechnique(email: string, emailDomain: string, siteDomaine: string): string | null {
  if (EXTENSIONS_FICHIER.some((ext) => emailDomain.toLowerCase().endsWith(ext))) return 'Domaine se terminant par une extension de fichier (faux positif technique)'
  const local = email.split('@')[0].toLowerCase()
  if (local === 'xxx' && emailDomain.toLowerCase().startsWith('xxx')) return 'Pattern placeholder "xxx@xxx..." (exemple de format)'
  if (DOMAINES_EXEMPLE.includes(domaineRacine(emailDomain).toLowerCase())) return 'Domaine explicitement fictif (exemple/example)'
  // Mots institutionnels (dpo/webmestre/médiateur/CIL/noreply/exceptions) : TOUJOURS exclus,
  // quel que soit le domaine — jamais un contact commercial recevable.
  const motToujoursTechnique = MOTS_CLES_TOUJOURS_TECHNIQUES.find((m) => local.includes(m))
  if (motToujoursTechnique) return `Mot-clé institutionnel/technique "${motToujoursTechnique}" (jamais un contact commercial)`
  const racineSite = domaineRacine(siteDomaine).toLowerCase()
  const racineEmail = domaineRacine(emailDomain).toLowerCase()
  const estSitePropreApprox = racineEmail === racineSite || racineEmail.endsWith('.' + racineSite)
  if (!estSitePropreApprox && MOTS_CLES_TECHNIQUES_CONDITIONNELS.some((m) => local.includes(m))) return `Mot-clé technique "support" sur un domaine non-propre`
  if (PRESTATAIRES_TECHNIQUES_CONNUS.some((d) => racineEmail === d || racineEmail.endsWith('.' + d))) return 'Domaine de prestataire technique connu'
  // Pattern prénom.nom générique français (ex. "Martin Dupont"), même sur
  // un webmail légitime, QUAND la page source est une plateforme/annuaire
  // connue — signal fort d'un exemple de formulaire, pas un vrai contact.
  if (estDomainePlateformeConnue(siteDomaine) && PATTERNS_PRENOM_NOM_GENERIQUES.some((p) => local.includes(p))) {
    return 'Pattern prénom.nom générique français sur une page de plateforme/annuaire (exemple de formulaire)'
  }
  return null
}

/** Étape C — domaines génériques suspects, faisceau de signaux (jamais une blacklist seule). */
function estExcluParFaisceauGenerique(email: string, emailDomain: string, pageEstPlateforme: boolean): string | null {
  const racineEmail = domaineRacine(emailDomain).toLowerCase()
  if (!DOMAINES_GENERIQUES_SUSPECTS.includes(racineEmail)) return null
  const local = email.split('@')[0].toLowerCase()
  const localGenerique = PATTERNS_PRENOM_NOM_GENERIQUES.some((p) => local.includes(p)) || /^nom@|^prenom/.test(local)
  if (localGenerique || pageEstPlateforme) {
    return `Domaine générique suspect (${racineEmail}) combiné à un local-part type exemple ou une page plateforme`
  }
  return null // domaine générique SEUL, sans autre signal -> jamais exclu automatiquement
}

const DOMAINES_PLATEFORMES_CONNUS = ['doctolib.fr', 'doctolib.com', 'notaires.fr', 'franprix.fr', 'ramsaysante.fr', 'foncia.com', 'foncia.fr']

function estDomainePlateformeConnue(domaine: string): boolean {
  const racine = domaineRacine(domaine).toLowerCase()
  return DOMAINES_PLATEFORMES_CONNUS.some((d) => racine === d || racine.endsWith('.' + d))
}

/** Qualifie UN email pour UNE entreprise — fonction pure. */
function qualifierUnEmail(e: EmailTrouve, siteDomaine: string, communeCible: string, aliasesCommune: string[]): EmailQualifie {
  const formes = formesCommune(communeCible, aliasesCommune)
  const emailDomain = e.emailDomain

  const raisonTechnique = estExcluTechnique(e.email, emailDomain, siteDomaine)
  if (raisonTechnique) {
    return { email: e.email, emailDomain, relationDomaine: 'EXCLU_TECHNIQUE', niveauConfiance: 'A_VERIFIER', sourceUrl: e.sourceUrl, raisonAttribution: raisonTechnique }
  }

  const racineSite = domaineRacine(siteDomaine).toLowerCase()
  const racineEmail = domaineRacine(emailDomain).toLowerCase()
  const memeDomaineQueSite = racineEmail === racineSite || racineEmail.endsWith('.' + racineSite)

  if (memeDomaineQueSite) {
    const pageEstPlateforme = estDomainePlateformeConnue(siteDomaine)
    const raisonGenerique = estExcluParFaisceauGenerique(e.email, emailDomain, pageEstPlateforme)
    if (raisonGenerique) {
      return { email: e.email, emailDomain, relationDomaine: 'EXCLU_TECHNIQUE', niveauConfiance: 'A_VERIFIER', sourceUrl: e.sourceUrl, raisonAttribution: raisonGenerique }
    }

    const contientCommune = contientFormeCommune(e.email, formes)
    if (pageEstPlateforme) {
      if (contientCommune) {
        return { email: e.email, emailDomain, relationDomaine: 'SITE_RESEAU_FRANCHISE', niveauConfiance: 'PROBABLE', sourceUrl: e.sourceUrl, raisonAttribution: `Identifiant géographique "${communeCible}" détecté dans l'adresse (réseau/plateforme)` }
      }
      return { email: e.email, emailDomain, relationDomaine: 'PLATEFORME_ANNUAIRE', niveauConfiance: 'A_VERIFIER', sourceUrl: e.sourceUrl, raisonAttribution: 'Domaine identifié comme plateforme/annuaire, aucun identifiant géographique correspondant à la commune cible' }
    }

    const confirme = (e.sourcePageType === 'ACCUEIL' || e.sourcePageType === 'CONTACT') && (e.classificationEmail === 'contact_commercial')
    return { email: e.email, emailDomain, relationDomaine: 'SITE_PROPRE', niveauConfiance: confirme ? 'CONFIRME' : 'PROBABLE', sourceUrl: e.sourceUrl, raisonAttribution: 'Domaine identique à celui du site visité (SITE_PROPRE)' }
  }

  if (WEBMAILS_PUBLICS.includes(racineEmail)) {
    return { email: e.email, emailDomain, relationDomaine: 'WEBMAIL_PUBLIC', niveauConfiance: 'PROBABLE', sourceUrl: e.sourceUrl, raisonAttribution: 'Webmail public explicitement publié sur le site' }
  }

  // Signal géographique AVANT similarité lexicale générique : un
  // identifiant de commune explicite est une preuve plus forte qu'une
  // simple ressemblance de nom de domaine.
  const contientCommuneGeneriqueAvant = contientFormeCommune(e.email, formes)
  if (contientCommuneGeneriqueAvant) {
    return { email: e.email, emailDomain, relationDomaine: 'SITE_RESEAU_FRANCHISE', niveauConfiance: 'PROBABLE', sourceUrl: e.sourceUrl, raisonAttribution: `Identifiant géographique "${communeCible}" détecté, domaine distinct du site (réseau)` }
  }

  // DOMAINE_AFFILIE — CORRECTION VALIDÉE : similarité lexicale SEULE ne suffit
  // jamais. Exige en plus la présence sur une page du site propre
  // (ACCUEIL/CONTACT/MENTIONS_LEGALES) comme signal contextuel fort.
  const racineLexEmail = racineSansSeparateurs(emailDomain)
  const racineLexSite = racineSansSeparateurs(siteDomaine)
  const similariteLexicale = racineLexEmail.length > 2 && (racineLexEmail.includes(racineLexSite) || racineLexSite.includes(racineLexEmail))
  const pagePropre = e.sourcePageType === 'ACCUEIL' || e.sourcePageType === 'CONTACT' || e.sourcePageType === 'MENTIONS_LEGALES'
  if (similariteLexicale && pagePropre) {
    const niveau: NiveauConfianceV2 = (e.sourcePageType === 'MENTIONS_LEGALES') ? 'PROBABLE' : 'A_VERIFIER'
    return { email: e.email, emailDomain, relationDomaine: 'DOMAINE_AFFILIE', niveauConfiance: niveau, sourceUrl: e.sourceUrl, raisonAttribution: `Nom de domaine proche de "${siteDomaine}" ET présent sur une page du site propre (${e.sourcePageType})` }
  }

  return { email: e.email, emailDomain, relationDomaine: 'PLATEFORME_ANNUAIRE', niveauConfiance: 'A_VERIFIER', sourceUrl: e.sourceUrl, raisonAttribution: 'Domaine tiers sans preuve de rattachement ni correspondance géographique' }
}

function choisirPrincipal(candidats: EmailQualifie[]): { principal: EmailQualifie | null; secondaires: EmailQualifie[] } {
  // SITE_RESEAU_FRANCHISE avant SITE_PROPRE : à confiance égale, une
  // correspondance géographique SPÉCIFIQUE (antenne locale identifiée)
  // est plus pertinente qu'un contact générique du même domaine — ce
  // n'est PAS un niveau de confiance gonflé (les deux restent PROBABLE),
  // seulement un critère de spécificité pour départager un choix de
  // principal. Ne change rien quand un seul candidat existe.
  const ordreRelation: Record<RelationDomaineV2, number> = { SITE_RESEAU_FRANCHISE: 0, SITE_PROPRE: 1, WEBMAIL_PUBLIC: 2, DOMAINE_AFFILIE: 3, PLATEFORME_ANNUAIRE: 4, EXCLU_TECHNIQUE: 5 }
  const ordreConfiance: Record<NiveauConfianceV2, number> = { CONFIRME: 0, PROBABLE: 1, A_VERIFIER: 2, A_VERIFIER_ATTRIBUTION: 3 }
  const tries = [...candidats].sort((a, b) => (ordreConfiance[a.niveauConfiance] - ordreConfiance[b.niveauConfiance]) || (ordreRelation[a.relationDomaine] - ordreRelation[b.relationDomaine]))
  if (tries.length === 0) return { principal: null, secondaires: [] }
  return { principal: tries[0], secondaires: tries.slice(1) }
}

/** qualifierEntreprise — qualifie les emails d'UNE entreprise. Pur, aucune écriture. */
export function qualifierEntreprise(entree: EntreeQualification, declencherAVerifierAttribution: boolean): ResultatQualifieEntreprise {
  const siteDomaine = (() => { try { return new URL(entree.siteWeb).hostname } catch { return '' } })()

  let qualifies = entree.emailsTrouves.map((e) => qualifierUnEmail(e, siteDomaine, entree.communeCible, entree.aliasesCommune ?? []))

  // CORRECTION VALIDÉE (point 2) — SITE_RESEAU_MULTI_ANTENNES : un domaine
  // SITE_PROPRE peut contenir de nombreux emails d'antennes différentes
  // (ex. bienvieillir-idf.org). Détecté par un nombre élevé d'emails
  // SITE_PROPRE à local-part court (1 mot, signature typique d'un nom de
  // ville) pour cette même entreprise — jamais par un domaine listé a
  // priori. Dans ce cas : seul celui qui correspond à communeCible
  // devient principal (SITE_RESEAU_FRANCHISE), le contact générique reste
  // secondaire éligible, les autres antennes sont exclues (PLATEFORME_ANNUAIRE).
  const formes = formesCommune(entree.communeCible, entree.aliasesCommune ?? [])
  const sitesPropresCourts = qualifies.filter((q) => q.relationDomaine === 'SITE_PROPRE' && /^[a-z]+@/i.test(q.email) && !q.email.split('@')[0].toLowerCase().includes('contact'))
  const SEUIL_MULTI_ANTENNES = 5
  if (sitesPropresCourts.length >= SEUIL_MULTI_ANTENNES) {
    qualifies = qualifies.map((q) => {
      if (q.relationDomaine !== 'SITE_PROPRE') return q
      const local = q.email.split('@')[0].toLowerCase()
      if (contientFormeCommune(q.email, formes)) {
        return { ...q, relationDomaine: 'SITE_RESEAU_FRANCHISE' as RelationDomaineV2, niveauConfiance: 'PROBABLE' as NiveauConfianceV2, raisonAttribution: `Domaine multi-antennes détecté — identifiant géographique "${entree.communeCible}" correspond à l'antenne locale` }
      }
      if (local.includes('contact')) {
        return { ...q, raisonAttribution: q.raisonAttribution + ' (contact générique du réseau, domaine multi-antennes détecté)' }
      }
      return { ...q, relationDomaine: 'PLATEFORME_ANNUAIRE' as RelationDomaineV2, niveauConfiance: 'A_VERIFIER' as NiveauConfianceV2, raisonAttribution: `Domaine multi-antennes détecté — cette adresse correspond à une autre antenne que "${entree.communeCible}"` }
    })
  }

  if (declencherAVerifierAttribution) {
    for (const q of qualifies) {
      if (q.relationDomaine !== 'EXCLU_TECHNIQUE') {
        q.niveauConfiance = 'A_VERIFIER_ATTRIBUTION'
        q.raisonAttribution += ' — site+téléphone fiable identiques à une autre entreprise, attribution non confirmée'
      }
    }
  }

  const retenus = qualifies.filter((q) => q.relationDomaine !== 'EXCLU_TECHNIQUE' && q.relationDomaine !== 'PLATEFORME_ANNUAIRE')
  const exclus = qualifies.filter((q) => q.relationDomaine === 'EXCLU_TECHNIQUE' || q.relationDomaine === 'PLATEFORME_ANNUAIRE')

  const { principal, secondaires } = choisirPrincipal(retenus)

  return { companyId: entree.companyId, siren: entree.siren, siteWeb: entree.siteWeb, emailPrincipal: principal, emailsSecondaires: secondaires, emailsExclus: exclus }
}

/**
 * qualifierLotEntreprises — détecte D'ABORD les doublons (site_web +
 * téléphone FIABLE identiques entre ≥2 company_id), puis qualifie
 * chaque entreprise. Un téléphone non fiable ne déclenche jamais
 * A_VERIFIER_ATTRIBUTION (correction validée).
 */
export function qualifierLotEntreprises(entrees: EntreeQualification[]): ResultatQualifieEntreprise[] {
  const groupes = new Map<string, EntreeQualification[]>()
  for (const e of entrees) {
    if (!e.telephoneFiable || !e.telephone) continue
    const cle = `${e.siteWeb}|${e.telephone}`
    if (!groupes.has(cle)) groupes.set(cle, [])
    groupes.get(cle)!.push(e)
  }
  const companyIdsEnDoublon = new Set<string>()
  for (const groupe of Array.from(groupes.values())) {
    if (groupe.length > 1) for (const e of groupe) companyIdsEnDoublon.add(e.companyId)
  }

  return entrees.map((e) => qualifierEntreprise(e, companyIdsEnDoublon.has(e.companyId)))
}
