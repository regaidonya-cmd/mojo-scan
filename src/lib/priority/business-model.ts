// ══════════════════════════════════════════════════════════════
// P0.6A — Modèle commercial (Contactabilité / Connaissance / Armement)
// Fonctions pures. Consomme le résultat du moteur P0.5 (evaluateProspect)
// + les faits commerciaux déjà persistés. N'accède jamais à Supabase.
// ══════════════════════════════════════════════════════════════

import type { ProspectInput, CommercialPriorityResult } from './types'

export type Contactabilite = 'BONNE' | 'PARTIELLE' | 'INSUFFISANTE' | 'BLOQUEE'
export type Connaissance = 'FAIBLE' | 'MOYENNE' | 'BONNE'
export type Armement = 'PRET' | 'INSUFFISANT'

export interface FaitCommercial {
  texte: string // texte source brut, conservé pour audit/provenance
  texteAffichable: string // texte sanitisé pour l'UI commerciale (voir sanitizeFaitTexte)
  sensibilite: 'UTILISABLE_DANS_ACCROCHE' | 'CONTEXTE_INTERNE' | 'A_VERIFIER'
  source: string
}

export type UiNba =
  | 'CALL' | 'EMAIL' | 'QUALIFY' | 'ENRICH' | 'PREPARE_RDV' | 'FOLLOW_UP'
  | 'SEND_PROPOSAL' | 'WAIT' | 'NURTURE' | 'NO_ACTION' | 'NO_ACTION_TEMPORAIRE'

export interface DisplayNba {
  type: string
  dueAt: string | null
  reason: string
  source: 'PERSISTE' | 'STRUCTUREL'
}

export interface BusinessModelResult {
  contactabilite: Contactabilite
  connaissance: Connaissance
  armement: Armement
  ready: boolean
  faitPrincipal: FaitCommercial | null
  raisonMaintenant: string
  raisonLabel: 'Pourquoi maintenant ?' | 'Pourquoi ce prospect ?'
  angleApproche: string
  uiNba: UiNba // NBA structurel seul (armement/contactabilité) — conservé pour usage interne
  displayNba: DisplayNba // P0.7D-FIX.5 — NBA à AFFICHER, source de vérité unique pour toutes les vues
}

/**
 * P0.5C.1 — Contactabilité corrigée :
 * BLOQUEE seulement si opposition globale OU aucun canal autorisé
 * pour une raison d'opposition. Absence de donnée ≠ BLOQUEE.
 */
function computeContactabilite(input: ProspectInput, engineResult: CommercialPriorityResult): Contactabilite {
  if (input.globalOppositionActive) return 'BLOQUEE'

  const allowed = input.contactMethods.filter((c) => c.allowed)
  if (allowed.length === 0) {
    // PREUVE (P0.6A.1) : ContactMethod.allowed est positionné exclusivement
    // dans fetch-real.ts par `!personneOpposee && !moyenOppose && !canalBloque`,
    // trois variables dérivées uniquement de lignes actives de la table
    // `oppositions`. Une donnée simplement absente (tél/email manquant)
    // ne produit JAMAIS d'entrée ContactMethod avec allowed=false — elle
    // ne produit aucune entrée du tout. Donc : contactMethods.length > 0
    // ET aucun allowed ==> nécessairement une opposition réelle sur
    // chaque méthode présente. BLOQUEE est ici toujours justifiée par
    // une opposition, jamais par une simple absence de donnée.
    const hadMethodsButNoneAllowed = input.contactMethods.length > 0
    return hadMethodsButNoneAllowed ? 'BLOQUEE' : 'INSUFFISANTE'
  }

  const distinctPersonnes = new Set(allowed.filter((c) => c.nominatif).map((c) => c.personneId))
  if (distinctPersonnes.size > 1) return 'PARTIELLE' // interlocuteur ambigu, canal existe
  if (input.contactMethods.some((c) => !c.allowed)) return 'PARTIELLE' // un canal/valeur bloqué parmi d'autres
  return 'BONNE'
}

function computeConnaissance(faits: FaitCommercial[], hasVerifiedSiteContent: boolean): Connaissance {
  const utilisable = faits.filter((f) => f.sensibilite === 'UTILISABLE_DANS_ACCROCHE')
  if (utilisable.length > 0) return 'BONNE'
  // P0.6C-FIX.1 : un crawl RÉUSSI (page réellement visitée et vérifiée)
  // rehausse la connaissance, mais ne crée jamais de fait d'accroche —
  // voir computeArmement, strictement indépendant de ce signal.
  if (faits.length > 0 || hasVerifiedSiteContent) return 'MOYENNE'
  return 'FAIBLE'
}

/**
 * ARMEMENT = PRET uniquement si un fait UTILISABLE_DANS_ACCROCHE existe.
 * Un fait CONTEXTE_INTERNE ou A_VERIFIER seul ne suffit jamais
 * (règle durcie P0.5C — cas DIAGPROEVO/DIAGOBAH).
 */
function computeArmement(contactabilite: Contactabilite, faits: FaitCommercial[]): Armement {
  if (contactabilite === 'BLOQUEE') return 'INSUFFISANT'
  const hasUsableFait = faits.some((f) => f.sensibilite === 'UTILISABLE_DANS_ACCROCHE')
  return hasUsableFait ? 'PRET' : 'INSUFFISANT'
}

/**
 * P0.6C-FIX.2 §5 — Affine le NBA du moteur pur (QUALIFY générique)
 * en distinguant QUALIFY (interlocuteur ambigu, décision humaine
 * nécessaire) de ENRICH (contact clair disponible, mais aucun fait
 * exploitable pour préparer une approche fiable). Ne modifie jamais
 * engine.ts — purement une couche d'affichage/orientation métier.
 * Ne transforme PAS automatiquement tout P3 en ENRICH : la décision
 * découle strictement de contactabilité + armement.
 */
function computeUiNba(engineNba: string, contactabilite: Contactabilite, armement: Armement): UiNba {
  if (engineNba !== 'QUALIFY') return engineNba as UiNba
  // Le moteur a renvoyé QUALIFY pour l'une de ces deux raisons distinctes :
  if (contactabilite === 'PARTIELLE') {
    return 'QUALIFY' // plusieurs interlocuteurs/canaux, décision humaine nécessaire
  }
  if (contactabilite === 'BONNE' && armement === 'INSUFFISANT') {
    return 'ENRICH' // interlocuteur clair, mais rien à dire — manque de connaissance/fait
  }
  return 'QUALIFY' // par défaut, prudence
}

function computeRaisonLabel(priorite: string): 'Pourquoi maintenant ?' | 'Pourquoi ce prospect ?' {
  // P0/P1 ne sont atteignables (engine.ts/computePriorite) que via un
  // signal temporel réel (température CHAUD ou événement explicite) —
  // "maintenant" n'est donc jamais un abus de langage pour ces cas.
  return priorite === 'P0' || priorite === 'P1' ? 'Pourquoi maintenant ?' : 'Pourquoi ce prospect ?'
}

/**
 * P0.6C-FIX.2 §2 — L'angle est une SUGGESTION, jamais un fait. Il ne
 * répète jamais le fait mot pour mot (évite la duplication Fait/Pourquoi
 * signalée en recette) et n'invente jamais un problème/besoin non observé.
 * Si aucun fait utilisable n'existe : réponse honnête, pas d'hallucination.
 */
function computeAngleApproche(armement: Armement, faitPrincipal: FaitCommercial | null): string {
  if (armement !== 'PRET' || !faitPrincipal) {
    return 'Angle à préparer — informations insuffisantes pour proposer une approche personnalisée fiable.'
  }
  return `Vous pouvez ouvrir la conversation en vous appuyant sur ce point, sans présumer d'un besoin non exprimé par l'entreprise.`
}

function computeRaisonMaintenant(
  priorite: string,
  potentiel: string,
  faitPrincipal: FaitCommercial | null,
  whyNow: string[]
): string {
  if (priorite === 'P0' || priorite === 'P1') {
    return whyNow[whyNow.length - 1] || 'Signal commercial récent identifié.'
  }
  if (faitPrincipal && faitPrincipal.sensibilite === 'UTILISABLE_DANS_ACCROCHE') {
    return faitPrincipal.texteAffichable
  }
  if (potentiel === 'FORT') {
    return 'Meilleur prospect disponible à travailler actuellement.'
  }
  return 'Prospect à qualifier.'
}

/**
 * P0.6A.1 — Un site_statut seul (FOUND, AMBIGUOUS ou NOT_FOUND), sans
 * détail de page réellement observé ni fait complémentaire, n'est
 * JAMAIS suffisant pour UTILISABLE_DANS_ACCROCHE.
 * FOUND seul / NOT_FOUND seul -> pas un fait différenciant (retiré).
 * AMBIGUOUS seul -> A_VERIFIER (anomalie à lever, pas une accroche).
 */
/**
 * P0.6C-FIX.1A — Classification de sensibilité PAR FAIT (contenu de
 * l'observation elle-même), jamais par entreprise/SIREN.
 *
 * Principe de prudence : un fait ne devient JAMAIS UTILISABLE_DANS_ACCROCHE
 * à cause d'un mot isolé générique (une date, un montant, « agence »,
 * « notifié » pris seuls). La gouvernance/direction/actionnariat est
 * TOUJOURS CONTEXTE_INTERNE, sauf une seule exception explicite et
 * spécifique : la mention d'un « marché public » réellement identifié,
 * qui reste un fait commercial fort même si le même texte évoque aussi
 * un changement de gouvernance (cas réel DIAGOBAH — un même fait peut
 * légitimement combiner les deux, la classification reste par fait,
 * pas par mot-clé isolé).
 *
 * Générique et transversal : aucun terme spécifique à un métier
 * (diagnostiqueur, auto-école, restaurant, beauté...) n'est requis.
 */
// Regex gouvernance partagée entre classifyFaitText et sanitizeFaitTexte —
// une seule source de vérité pour "qu'est-ce qu'une portion sensible".
const GOUVERNANCE_RE = /(changement|remplac).{0,40}(direction|actionnariat|gouvernance)/i
const FIABILITE_DOUTEUSE_RE = /contradictoire|non fiable|generee automatiquement|générée automatiquement|statut actif\/inactif/i

export function classifyFaitText(texte: string): 'UTILISABLE_DANS_ACCROCHE' | 'CONTEXTE_INTERNE' | 'A_VERIFIER' {
  const t = texte.toLowerCase()

  // A_VERIFIER : fiabilité douteuse ou statut explicitement incertain
  if (FIABILITE_DOUTEUSE_RE.test(t)) {
    return 'A_VERIFIER'
  }

  // Exception unique et explicite : un marché public réellement identifié
  // reste un fait commercial fort, même combiné à une mention de gouvernance
  // dans le même texte. « marché public » est une expression spécifique et
  // rare — jamais un simple mot isolé (date/montant/« notifié »/« agence »).
  if (/marche public|marché public/.test(t)) {
    return 'UTILISABLE_DANS_ACCROCHE'
  }

  // CONTEXTE_INTERNE : gouvernance/actionnariat/direction — TOUJOURS
  // prioritaire sur tout le reste (sauf l'exception marché public ci-dessus).
  // Empêche qu'une date, un montant ou le mot « agence » mentionnés dans
  // un texte de gouvernance ne le fassent basculer à tort en UTILISABLE.
  if (GOUVERNANCE_RE.test(t)) {
    return 'CONTEXTE_INTERNE'
  }

  // UTILISABLE_DANS_ACCROCHE : signaux compomés, spécifiques, jamais un
  // mot générique isolé (pas de « notifié » seul, pas de montant seul).
  if (/soci[ée]t[ée] s[oœ]{1,2}ur|diversification/.test(t)) {
    return 'UTILISABLE_DANS_ACCROCHE'
  }
  if (/r[ée]seau|rattach[ée]/.test(t)) {
    return 'UTILISABLE_DANS_ACCROCHE'
  }
  if (/activit[ée] [ée]largie/.test(t)) {
    return 'UTILISABLE_DANS_ACCROCHE'
  }
  if (/\d\s?\/\s?5|note\s?\d/.test(t)) {
    return 'UTILISABLE_DANS_ACCROCHE'
  }
  if (/r[ée]servation en ligne/.test(t)) {
    return 'UTILISABLE_DANS_ACCROCHE'
  }
  if (/nouvelle agence|ouverture d.{0,3}une.{0,12}agence/.test(t)) {
    return 'UTILISABLE_DANS_ACCROCHE'
  }

  // Par défaut : identité/ancienneté/dirigeant seuls, ou tout fait
  // inconnu -> position prudente, jamais UTILISABLE par défaut.
  return 'CONTEXTE_INTERNE'
}

/**
 * P0.6C-FIX.2 §3 — Sanitisation GÉNÉRIQUE de l'affichage commercial d'un
 * fait. Découpe le texte source en segments (séparateur « ; »), retire
 * tout segment identifié comme gouvernance/fiabilité douteuse, et
 * rejoint les segments restants. Aucune exception codée sur un SIREN
 * ou un nom d'entreprise — la règle s'applique à n'importe quel fait
 * futur présentant la même structure (plusieurs informations mélangées
 * dans une seule observation).
 *
 * Limite documentée : le découpage repose sur le séparateur « ; » tel
 * qu'utilisé par les observations actuelles. Un texte sans séparateur
 * clair mélangeant gouvernance et fait commercial dans une seule phrase
 * ne peut pas être séparé de façon fiable avec cette approche simple —
 * dans ce cas, le texte est conservé tel quel plutôt que risqué d'être
 * tronqué de façon incohérente (position prudente : on ne modifie pas
 * un texte qu'on ne peut pas segmenter avec confiance).
 */
/**
 * P0.6C-FIX.3 — Retourne `null` quand une exposition sûre ne peut pas être
 * garantie (au lieu de retourner le texte brut par défaut). Deux cas :
 * 1. Pas de séparateur « ; » fiable ET le texte contient malgré tout un
 *    marqueur sensible (gouvernance/fiabilité douteuse) mélangé au signal
 *    commercial dans la même phrase -> impossible de séparer proprement,
 *    position prudente : ne pas exposer.
 * 2. Tous les segments filtrés (rien de sain à exposer).
 * `null` signale à l'appelant (buildFaitCommercial) de rétrograder la
 * sensibilité plutôt que d'afficher un texte potentiellement mélangé.
 */
export function sanitizeFaitTexte(texte: string): string | null {
  const segments = texte.split(';').map((s) => s.trim()).filter(Boolean)

  if (segments.length <= 1) {
    const t = texte.toLowerCase()
    if (GOUVERNANCE_RE.test(t) || FIABILITE_DOUTEUSE_RE.test(t)) {
      return null // portion sensible presente, aucune separation fiable possible
    }
    return texte // aucun marqueur sensible detecte, texte sain tel quel
  }

  const segmentsSains = segments.filter((seg) => {
    const s = seg.toLowerCase()
    return !GOUVERNANCE_RE.test(s) && !FIABILITE_DOUTEUSE_RE.test(s)
  })

  if (segmentsSains.length === 0) return null // tout filtre -> rien de sur a exposer
  return segmentsSains.join('; ')
}

/**
 * P0.6C-FIX.3 — Point d'entrée unique pour construire un FaitCommercial :
 * classification + sanitisation + rétrogradation de sécurité, centralisés
 * ici pour que fetch-real.ts et tout futur appelant ne puissent pas
 * oublier le garde-fou (au lieu de dupliquer la logique).
 */
export function buildFaitCommercial(texte: string, source: string): FaitCommercial {
  let sensibilite = classifyFaitText(texte)
  let texteAffichable = texte

  if (sensibilite === 'UTILISABLE_DANS_ACCROCHE') {
    const safe = sanitizeFaitTexte(texte)
    if (safe === null) {
      // Séparation non fiable + portion sensible présente dans la même
      // phrase -> on ne peut pas garantir une accroche propre. Position
      // prudente : rétrograder. La donnée brute reste disponible (`texte`)
      // pour provenance/audit, sans modification ni suppression en base.
      sensibilite = 'CONTEXTE_INTERNE'
    } else {
      texteAffichable = safe
    }
  }

  return { texte, texteAffichable, sensibilite, source }
}

export function classifySiteStatutOnly(
  siteStatut: 'FOUND' | 'AMBIGUOUS' | 'NOT_FOUND'
): 'A_VERIFIER' | null {
  if (siteStatut === 'AMBIGUOUS') return 'A_VERIFIER'
  return null // FOUND ou NOT_FOUND seuls : aucun fait différenciant
}

/**
 * P0.7D-FIX.5 — Résolution CENTRALISÉE du NBA à afficher, seule source de
 * vérité pour FICHE PROSPECT / MA JOURNÉE / PROSPECTS. Hiérarchie verrouillée :
 * 1. STOP/opposition -> priorité absolue ;
 * 2. action commerciale persistée pertinente (next_action_type != NO_ACTION,
 *    != null) -> restituée telle quelle, avec sa date si elle existe ;
 * 3. sinon -> NBA structurel calculé (uiNba).
 * N'affecte JAMAIS la priorité (P0/P1/P2/P3/P4, toujours calculée par
 * engine.ts séparément) ni la température — uniquement l'affichage du NBA.
 */
function computeDisplayNba(
  priorite: string,
  contactabilite: Contactabilite,
  persistedNextAction: { type: string; dueAt: string | null; reason: string } | null | undefined,
  uiNba: UiNba
): DisplayNba {
  if (priorite === 'STOP' || contactabilite === 'BLOQUEE') {
    return { type: 'STOP', dueAt: null, reason: 'Opposition active — aucune action commerciale possible', source: 'STRUCTUREL' }
  }
  // P0.7D-FIX.7 — Opportunité terminale (PERDU/GAGNE) : NO_ACTION obligatoire,
  // AVANT toute autre logique (y compris une action persistée non-NO_ACTION
  // resterait affichée sinon si le pipeline a été clôturé après coup — un
  // dossier clos ne doit JAMAIS afficher CALL/EMAIL/QUALIFY/ENRICH/FOLLOW_UP).
  if (priorite === 'TERMINE') {
    return { type: 'NO_ACTION', dueAt: null, reason: 'Opportunité clôturée — dossier clos', source: 'STRUCTUREL' }
  }
  // P0.7D-FIX.5 — les 66 prospects réels portent tous un leftover de
  // l'import P0.3D original (next_action_type='CALL', reason='Import
  // pilote P0.3D'), jamais une décision commerciale P0.7 réelle. Ce
  // leftover n'est PAS une action persistée pertinente et ne doit jamais
  // supplanter le NBA structurel — seule une action réellement produite
  // par le flux P0.7 (résultat d'appel enregistré) est restituée ici.
  const estLeftoverImport = persistedNextAction?.reason === 'Import pilote P0.3D'
  if (persistedNextAction && persistedNextAction.type && persistedNextAction.type !== 'NO_ACTION' && !estLeftoverImport) {
    return { type: persistedNextAction.type, dueAt: persistedNextAction.dueAt, reason: persistedNextAction.reason, source: 'PERSISTE' }
  }
  return { type: uiNba, dueAt: null, reason: '', source: 'STRUCTUREL' }
}

export function evaluateBusinessModel(
  input: ProspectInput,
  engineResult: CommercialPriorityResult,
  faits: FaitCommercial[],
  hasVerifiedSiteContent: boolean = false
): BusinessModelResult {
  const contactabilite = computeContactabilite(input, engineResult)
  const connaissance = computeConnaissance(faits, hasVerifiedSiteContent)
  const armement = computeArmement(contactabilite, faits)
  const ready =
    (contactabilite === 'BONNE' || contactabilite === 'PARTIELLE') && armement === 'PRET'

  const faitPrincipal =
    faits.find((f) => f.sensibilite === 'UTILISABLE_DANS_ACCROCHE') ?? faits[0] ?? null

  const raisonMaintenant = computeRaisonMaintenant(
    engineResult.priorite,
    engineResult.potentiel,
    faitPrincipal,
    engineResult.whyNow
  )

  const raisonLabel = computeRaisonLabel(engineResult.priorite)
  const angleApproche = computeAngleApproche(armement, faitPrincipal)
  const uiNba = computeUiNba(engineResult.nextBestAction.type, contactabilite, armement)
  const displayNba = computeDisplayNba(engineResult.priorite, contactabilite, input.persistedNextAction, uiNba)

  return {
    contactabilite, connaissance, armement, ready, faitPrincipal,
    raisonMaintenant, raisonLabel, angleApproche, uiNba, displayNba,
  }
}
