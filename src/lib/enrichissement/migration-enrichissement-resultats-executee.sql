-- ══════════════════════════════════════════════════════════════
-- ENRICH.VSG.6 — Persistance GÉNÉRIQUE d'enrichissement, PAR ÉTAPE.
-- STATUT : déjà exécutée réellement en base (confirmée : table créée,
-- RLS=true, GRANT service_role SELECT/INSERT/UPDATE/DELETE=true).
-- Ce fichier est conservé pour traçabilité Git.
--
-- ENRICH.VSG.6B — AUCUN CHANGEMENT DE SCHÉMA. La distinction erreur
-- retryable/non-retryable (§3 de la revue) est représentée via une
-- convention sur la colonne `erreur` déjà existante (préfixe
-- "[NON_RETRYABLE]"), sans migration supplémentaire — voir
-- persistance.ts pour la justification de ce choix.
-- ══════════════════════════════════════════════════════════════

create table enrichissement_resultats (
  id uuid primary key default gen_random_uuid(),

  siren text not null,
  company_id uuid references companies(id),
  lot_code text not null,
  source text not null default 'GOOGLE_PLACES',

  text_search_termine boolean not null default false,
  place_details_termine boolean not null default false,

  statut text not null default 'A_TRAITER'
    check (statut in ('A_TRAITER', 'MATCH_FORT', 'MATCH_PROBABLE', 'AMBIGU', 'NON_TROUVE', 'ERREUR')),

  verdict_matching text
    check (verdict_matching in ('MATCH_FORT', 'MATCH_PROBABLE', 'AMBIGU', 'NON_TROUVE')),

  score_matching numeric(4,3),
  place_id text,
  telephone text,
  site_web text,
  email text,
  candidats_examines jsonb,

  erreur text, -- convention VSG.6B : préfixe "[NON_RETRYABLE]" = jamais retentée

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index uq_enrichissement_resultats_siren_lot_source
  on enrichissement_resultats(siren, lot_code, source);

create index idx_enrichissement_resultats_lot_statut
  on enrichissement_resultats(lot_code, statut);

create index idx_enrichissement_resultats_company
  on enrichissement_resultats(company_id) where company_id is not null;
