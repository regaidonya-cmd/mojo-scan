-- ══════════════════════════════════════════════════════════════
-- MOJO SALES — SDR / PR1 — Sécurisation de l'idempotence des activités
--
-- Diagnostic confirmé (lecture seule, avant cette migration) :
--   - activites.idempotency_key ne possède AUCUNE contrainte/index UNIQUE
--   - 0 doublon non-null/non-vide actuellement en base
--   - 0 ligne vide/blanche actuellement en base
--
-- Compatibilité PostgreSQL vérifiée EMPIRIQUEMENT (table de test isolée,
-- jamais `activites`, supprimée immédiatement après) avant d'écrire cette
-- migration — PAS supposée :
--   1. Index UNIQUE complet (sans WHERE) + ON CONFLICT (idempotency_key)
--      WHERE idempotency_key IS NOT NULL DO NOTHING -> FONCTIONNE
--   2. Index UNIQUE PARTIEL (WHERE idempotency_key IS NOT NULL) + le MÊME
--      ON CONFLICT (prédicat exact) -> FONCTIONNE
--   3. Index UNIQUE PARTIEL + ON CONFLICT SANS prédicat -> ÉCHOUE
--      (erreur PostgreSQL 42P10 "there is no unique or exclusion
--      constraint matching the ON CONFLICT specification", reproduite
--      réellement pendant le diagnostic)
--
-- La fonction p07_enregistrer_resultat_appel (déjà en base, jamais
-- modifiée par cette migration) utilise DÉJÀ exactement le prédicat
-- `WHERE idempotency_key IS NOT NULL` dans sa clause ON CONFLICT — elle
-- est donc compatible avec l'index PARTIEL ci-dessous SANS AUCUNE
-- MODIFICATION DE LA FONCTION.
--
-- Choix : index PARTIEL (pas complet) — plus économe (n'indexe pas les
-- lignes sans clé), sémantiquement cohérent (seules les clés non-NULL
-- doivent être uniques, les NULL ne participent jamais à une contrainte
-- unique de toute façon en PostgreSQL, mais un index partiel évite de
-- gaspiller de l'espace sur des entrées qui ne seront jamais dans la
-- clause ON CONFLICT).
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'activites_idempotency_key_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX activites_idempotency_key_unique_idx
      ON public.activites (idempotency_key)
      WHERE idempotency_key IS NOT NULL;
  END IF;
END $$;

-- AUCUNE modification de public.p07_enregistrer_resultat_appel : son
-- ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO
-- NOTHING existant est déjà exactement compatible avec cet index partiel.
