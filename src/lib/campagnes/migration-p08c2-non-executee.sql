-- ══════════════════════════════════════════════════════════════
-- P0.8C.2 — CAMPAGNE > LOT > MEMBRE. PRÉPARÉE, NON EXÉCUTÉE.
-- Aucune duplication de companies/prospects_sales — company_id est la
-- seule référence, tout le reste (email, contactabilité, opposition)
-- reste lu en direct depuis le modèle existant à chaque contrôle.
-- campagne_evenements N'EST PAS créée ici (P0.8C.4).
-- ══════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── CAMPAGNE (initiative commerciale) ──
create table campagnes (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,              -- ex. 'DIAGNOSTIQUEURS 94 — VISIBILITE LOCALE'
  segment text,                           -- ex. 'DIAGNOSTIC_IMMOBILIER_94', informatif
  created_at timestamptz not null default now()
);

-- ── LOT (sous-ensemble de destinataires d'une campagne) ──
create table campagne_lots (
  id uuid primary key default gen_random_uuid(),
  campagne_id uuid not null references campagnes(id),
  nom text not null,                      -- ex. 'DIAG94_BAT01'
  criteres_filtre jsonb,                  -- snapshot des filtres utilisés à la création
  nombre_selectionne int not null default 0,
  nombre_valide int not null default 0,
  nombre_exclu int not null default 0,
  statut text not null default 'BROUILLON'
    check (statut in ('BROUILLON','CONTROLE_OK','SYNCHRONISE','ERREUR')),
  brevo_list_id text,                     -- nullable, rempli en P0.8C.3
  synchronized_at timestamptz,            -- nullable, rempli en P0.8C.3
  created_at timestamptz not null default now(),
  unique (campagne_id, nom)               -- pas deux lots de même nom dans une campagne
);

-- ── MEMBRE DU LOT ──
create table campagne_lot_membres (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references campagne_lots(id),
  company_id uuid not null references companies(id),
  statut text not null default 'SELECTIONNE'
    check (statut in ('SELECTIONNE','VALIDE','EXCLU','SYNCHRONISE','ERREUR')),
  raison_exclusion text,                  -- rempli si statut='EXCLU'
  brevo_contact_id text,                  -- nullable, rempli en P0.8C.3
  synchronized_at timestamptz,            -- nullable, rempli en P0.8C.3
  created_at timestamptz not null default now(),
  -- Contrainte demandée §2 : unicité d'une entreprise DANS UN MÊME LOT.
  -- La même entreprise reste autorisée dans deux lots différents (aucune
  -- contrainte transversale entre lots).
  unique (lot_id, company_id)
);

create index idx_campagne_lot_membres_lot on campagne_lot_membres(lot_id);
create index idx_campagne_lot_membres_company on campagne_lot_membres(company_id);

-- ══════════════════════════════════════════════════════════════
-- Vérifications avant exécution réelle (à faire manuellement) :
-- - FK : campagne_lots.campagne_id -> campagnes.id (ON DELETE non précisé
--   volontairement : suppression d'une campagne avec lots existants doit
--   être un choix explicite, pas un CASCADE silencieux) ;
--   campagne_lot_membres.lot_id -> campagne_lots.id ; .company_id ->
--   companies.id (jamais de duplication du modèle entreprise).
-- - Unicité : (campagne_id, nom) sur campagne_lots ; (lot_id, company_id)
--   sur campagne_lot_membres (contrainte demandée §2).
-- - Rollback : script purement additif (CREATE TABLE), aucune table
--   existante modifiée — un rollback consiste à DROP TABLE dans l'ordre
--   inverse (campagne_lot_membres, campagne_lots, campagnes).
-- - Compatibilité : aucune colonne ajoutée à companies/prospects_sales/
--   qualifications_courantes — le champ historique preuve_metier reste
--   strictement inchangé, jamais consulté par ce module (cf. §3).
-- ══════════════════════════════════════════════════════════════
