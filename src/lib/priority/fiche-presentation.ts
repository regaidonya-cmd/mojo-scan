// P0.7E — Décisions de présentation liées aux états STOP/TERMINE, extraites
// en fonctions pures pour rester testables sans DOM. Ne modifie AUCUNE règle
// métier (priorité/scoring/oppositions/pipeline) — uniquement du texte/UI.

export function getStatutBadgeLabel(priorite: string, ready: boolean): { label: string; filled?: boolean; muted?: boolean } {
  if (priorite === 'STOP') return { label: 'Prospection arrêtée', muted: true }
  if (priorite === 'TERMINE') return { label: 'Opportunité clôturée', muted: true }
  return ready ? { label: 'READY', filled: true } : { label: 'À préparer', muted: true }
}

export function getRaisonAffichee(priorite: string, raisonMaintenantMetier: string): string {
  if (priorite === 'STOP') return "Prospection arrêtée à la demande de l'entreprise."
  if (priorite === 'TERMINE') return 'Opportunité clôturée — dossier non actif actuellement.'
  return raisonMaintenantMetier
}

/** P0.7E §4 (ajusté) — STOP (opposition entreprise) ET TERMINE (opportunité
 * clôturée) verrouillent tous deux l'enregistrement d'un résultat d'appel
 * dans ce périmètre P0.7. Une future fonctionnalité "Réactiver l'opportunité"
 * sera conçue séparément — non implémentée ici. PERSONNE/MOYEN ne produisent
 * jamais priorite='STOP'/'TERMINE' (cf. engine.ts), donc jamais verrouillés. */
export function peutEnregistrerResultat(priorite: string): boolean {
  return priorite !== 'STOP' && priorite !== 'TERMINE'
}
