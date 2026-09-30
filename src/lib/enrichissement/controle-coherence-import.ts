// ══════════════════════════════════════════════════════════════
// VSG.DATA.3 — Garde-fou de cohérence. Un import ciblé ne doit JAMAIS
// démarrer si son jeu de données ne correspond pas exactement au lot
// réellement attendu (source de vérité : enrichissement_resultats pour
// un lot déjà exécuté). Cause racine VSG.DATA.3 : une liste statique
// reconstruite de mémoire avait divergé silencieusement de la vraie
// donnée — ce contrôle rend cette divergence IMPOSSIBLE À IGNORER.
// ══════════════════════════════════════════════════════════════

export interface RapportCoherence {
  nbAttendus: number
  nbSource: number
  nbIntersection: number
  absentsDeLaSource: string[] // attendus mais absents du jeu fourni
  supplementairesDansLaSource: string[] // présents dans le jeu fourni mais pas attendus
  doublonsDansLaSource: string[]
  coherent: boolean
}

/**
 * controlerCoherence — compare la liste des SIREN ATTENDUS (source de
 * vérité, ex. enrichissement_resultats pour un lot déjà exécuté) à la
 * liste des SIREN effectivement présents dans le jeu de données préparé
 * pour l'import. `coherent=false` DOIT bloquer tout import (levé comme
 * exception par l'appelant, jamais ignoré silencieusement).
 */
export function controlerCoherence(sirenAttendus: string[], sirenSource: string[]): RapportCoherence {
  const setAttendus = new Set(sirenAttendus)
  const setSource = new Set(sirenSource)

  const doublons = sirenSource.filter((s, i) => sirenSource.indexOf(s) !== i)

  const intersection = sirenAttendus.filter((s) => setSource.has(s))
  const absents = sirenAttendus.filter((s) => !setSource.has(s))
  const supplementaires = sirenSource.filter((s) => !setAttendus.has(s))

  return {
    nbAttendus: sirenAttendus.length,
    nbSource: sirenSource.length,
    nbIntersection: intersection.length,
    absentsDeLaSource: absents,
    supplementairesDansLaSource: Array.from(new Set(supplementaires)),
    doublonsDansLaSource: Array.from(new Set(doublons)),
    coherent: absents.length === 0 && doublons.length === 0,
    // Note : des "supplementaires" ne sont PAS bloquants en soi (un jeu
    // de données plus large que le strict nécessaire reste exploitable),
    // seuls des ABSENTS ou des DOUBLONS rendent l'import incohérent.
  }
}

export class IncoherenceImportError extends Error {
  constructor(public rapport: RapportCoherence) {
    super(
      `Import refusé : incohérence détectée entre le lot attendu (${rapport.nbAttendus}) et la source fournie (${rapport.nbSource}). ` +
      `Absents: ${rapport.absentsDeLaSource.length}, Doublons: ${rapport.doublonsDansLaSource.length}.`
    )
    this.name = 'IncoherenceImportError'
  }
}

/** Bloque l'exécution si le jeu de données n'est pas cohérent avec le
 * lot attendu — à appeler EN TOUT PREMIER, avant toute écriture. */
export function verifierCoherenceOuBloquer(sirenAttendus: string[], sirenSource: string[]): RapportCoherence {
  const rapport = controlerCoherence(sirenAttendus, sirenSource)
  if (!rapport.coherent) throw new IncoherenceImportError(rapport)
  return rapport
}
