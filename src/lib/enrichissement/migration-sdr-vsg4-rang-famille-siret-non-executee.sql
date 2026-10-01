-- ══════════════════════════════════════════════════════════════
-- SDR.VSG.4 — Extension additive de enrichissement_resultats.
-- PROPOSITION UNIQUEMENT — NON EXÉCUTÉE.
--
-- Réutilise le modèle existant (table déjà créée en ENRICH.VSG.6/VSG.DATA.3)
-- — AUCUNE nouvelle table. Ces 3 colonnes sont génériques (pas
-- spécifiques à VSG), réutilisables pour tout futur lot d'enrichissement
-- nécessitant une traçabilité de sélection immuable avant exécution.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.enrichissement_resultats
  ADD COLUMN IF NOT EXISTS rang integer,
  ADD COLUMN IF NOT EXISTS famille_metier text,
  ADD COLUMN IF NOT EXISTS siret text;

-- SDR.VSG.4 (correction) — garantie DB réelle d'idempotence : jamais
-- deux fois le même (lot_code, siren). Audit préalable effectué
-- (lecture seule) : AUCUN doublon existant actuellement sur
-- enrichissement_resultats — cette contrainte est donc sûre à ajouter.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_enrichissement_resultats_lot_siren'
  ) THEN
    ALTER TABLE public.enrichissement_resultats
      ADD CONSTRAINT uq_enrichissement_resultats_lot_siren UNIQUE (lot_code, siren);
  END IF;
END $$;

-- Nullable par construction : les lignes existantes (VSG_BAT50) restent
-- NULL sur ces colonnes — aucune incompatibilité, aucune donnée
-- existante modifiée. `statut` reste inchangé dans son usage
-- (A_TRAITER/MATCH_FORT/MATCH_PROBABLE/AMBIGU/NON_TROUVE/ERREUR).
