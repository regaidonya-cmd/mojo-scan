// ══════════════════════════════════════════════════════════════
// MOJO LEAD ENGINE — Mapping_Parcours_Programmes
// Normalise la relation parcours métier ↔ programmes
// Le poids qualifie l'importance du programme dans le parcours
// mais NE crée PAS de bonus de scoring supplémentaire (V1)
// ══════════════════════════════════════════════════════════════

export interface ParcoursProgramme {
  id_parcours: string
  id_programme: string
  poids: number   // 1-5 : importance dans le parcours (usage futur, pas de scoring V1)
  actif: boolean
}

export const MAPPING_PARCOURS_PROGRAMMES: ParcoursProgramme[] = [
  // PARC-001 — Diagnostiqueur immobilier
  { id_parcours:'PARC-001', id_programme:'PROG-001', poids:5, actif:true }, // SEO local — visibilité locale prioritaire
  { id_parcours:'PARC-001', id_programme:'PROG-002', poids:5, actif:true }, // GBP — fiche Google indispensable
  { id_parcours:'PARC-001', id_programme:'PROG-006', poids:4, actif:true }, // ChatGPT — rédaction rapports, devis
  { id_parcours:'PARC-001', id_programme:'PROG-011', poids:4, actif:true }, // CRM — suivi des missions et prospects
  { id_parcours:'PARC-001', id_programme:'PROG-015', poids:4, actif:true }, // Relances — relancer les devis et prospects

  // PARC-002 — Auto-école
  { id_parcours:'PARC-002', id_programme:'PROG-001', poids:5, actif:true }, // SEO local — trouver élèves localement
  { id_parcours:'PARC-002', id_programme:'PROG-003', poids:4, actif:true }, // Réseaux sociaux — recruter nouveaux élèves
  { id_parcours:'PARC-002', id_programme:'PROG-011', poids:5, actif:true }, // CRM — suivi parcours élèves
  { id_parcours:'PARC-002', id_programme:'PROG-012', poids:4, actif:true }, // WhatsApp — communication directe élèves
  { id_parcours:'PARC-002', id_programme:'PROG-015', poids:4, actif:true }, // Relances — relancer les inscrits

  // PARC-003 — Restaurant
  { id_parcours:'PARC-003', id_programme:'PROG-002', poids:5, actif:true }, // GBP — référencement local et avis
  { id_parcours:'PARC-003', id_programme:'PROG-003', poids:5, actif:true }, // Réseaux sociaux — plats, événements, ambiance
  { id_parcours:'PARC-003', id_programme:'PROG-010', poids:4, actif:true }, // Contenus IA — visuels et posts efficacement
  { id_parcours:'PARC-003', id_programme:'PROG-012', poids:4, actif:true }, // WhatsApp — réservations et relation client
  { id_parcours:'PARC-003', id_programme:'PROG-013', poids:4, actif:true }, // Fidélisation — faire revenir les habitués

  // PARC-004 — Beauté / Coiffure / Esthétique
  { id_parcours:'PARC-004', id_programme:'PROG-002', poids:5, actif:true }, // GBP — remplir l'agenda via Google
  { id_parcours:'PARC-004', id_programme:'PROG-003', poids:4, actif:true }, // Réseaux sociaux — contenus beauté et RDV
  { id_parcours:'PARC-004', id_programme:'PROG-010', poids:4, actif:true }, // Contenus IA — posts et stories rapidement
  { id_parcours:'PARC-004', id_programme:'PROG-012', poids:5, actif:true }, // WhatsApp — prise de RDV directe
  { id_parcours:'PARC-004', id_programme:'PROG-013', poids:5, actif:true }, // Fidélisation — récurrence des RDV

  // PARC-005 — Artisan & commerçant
  { id_parcours:'PARC-005', id_programme:'PROG-001', poids:5, actif:true }, // SEO local — être trouvé localement
  { id_parcours:'PARC-005', id_programme:'PROG-002', poids:5, actif:true }, // GBP — avis et visibilité Maps
  { id_parcours:'PARC-005', id_programme:'PROG-006', poids:4, actif:true }, // ChatGPT — rédiger devis et emails
  { id_parcours:'PARC-005', id_programme:'PROG-011', poids:4, actif:true }, // CRM — suivi chantiers et prospects
  { id_parcours:'PARC-005', id_programme:'PROG-015', poids:4, actif:true }, // Relances — relancer les devis sans réponse

  // PARC-006 — Profession libérale
  { id_parcours:'PARC-006', id_programme:'PROG-001', poids:5, actif:true }, // SEO local — être trouvé par les patients/clients
  { id_parcours:'PARC-006', id_programme:'PROG-006', poids:5, actif:true }, // ChatGPT — productivité cabinet
  { id_parcours:'PARC-006', id_programme:'PROG-007', poids:4, actif:true }, // IA métier — cas d'usage professionnels
  { id_parcours:'PARC-006', id_programme:'PROG-011', poids:4, actif:true }, // CRM — suivi patients et clients
  { id_parcours:'PARC-006', id_programme:'PROG-016', poids:4, actif:true }, // Digitalisation org — structurer le cabinet
]
