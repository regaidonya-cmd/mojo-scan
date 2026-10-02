-- ══════════════════════════════════════════════════════════════
-- MOJO SALES — SDR / PR3 — Portefeuille SDR : STRUCTURE (additive).
--
-- Aucune donnée modifiée : uniquement du DDL additif.
--   1. prospects_sales.assigned_to — 0 ou 1 SDR par prospect.
--      FK vers public.profiles(user_id) (porte le rôle/actif ; profiles
--      référence déjà auth.users). ON DELETE SET NULL : la suppression
--      d'un compte rend le prospect "non affecté", jamais supprimé.
--      Le contrôle role='SDR' AND actif est fait à l'affectation (008),
--      volontairement PAS par trigger (sinon impossible de désactiver un
--      SDR qui a encore un portefeuille).
--   2. prospects_sales.besoin_identifie — texte libre (pas de taxonomie).
--   3. sdr_population_officielle — population officielle FIGÉE : la
--      règle de fiabilité téléphone étant globale et dynamique, un futur
--      lot pourrait faire basculer silencieusement un FIABLE en
--      A_VERIFIER ; la population est donc matérialisée une fois pour
--      toutes (alimentée par 008).
--
-- Ne modifie ni PR1 (004) ni PR2 (005/006).
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.prospects_sales
  ADD COLUMN IF NOT EXISTS assigned_to uuid NULL,
  ADD COLUMN IF NOT EXISTS besoin_identifie text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prospects_sales_assigned_to_fkey'
  ) THEN
    ALTER TABLE public.prospects_sales
      ADD CONSTRAINT prospects_sales_assigned_to_fkey
      FOREIGN KEY (assigned_to) REFERENCES public.profiles(user_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prospects_sales_assigned_to
  ON public.prospects_sales (assigned_to);

CREATE TABLE IF NOT EXISTS public.sdr_population_officielle (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id),
  siren text NOT NULL UNIQUE,
  lot_code text NOT NULL,
  telephone_normalise text NOT NULL UNIQUE,
  statut_matching text NOT NULL CHECK (statut_matching IN ('MATCH_FORT', 'MATCH_PROBABLE')),
  code_population text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sdr_population_officielle_code
  ON public.sdr_population_officielle (code_population);

-- Même modèle que les autres tables métier : RLS activée, aucune policy,
-- aucun GRANT anon/authenticated — seul le backend (service_role) lit.
ALTER TABLE public.sdr_population_officielle ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sdr_population_officielle FROM anon, authenticated;
GRANT SELECT ON public.sdr_population_officielle TO service_role;
