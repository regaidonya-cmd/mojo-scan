-- ══════════════════════════════════════════════════════════════
-- MOJO SCAN — Source de campagne des leads (?src=...)
-- Ex. src=DIAG_REX_DMH_2026_10 (EMAIL_2 de la campagne Diag' My Home).
-- Additive et nullable : sans effet sur les diagnostics existants.
-- ══════════════════════════════════════════════════════════════

ALTER TABLE diagnostics ADD COLUMN IF NOT EXISTS source_campagne text;
ALTER TABLE contacts    ADD COLUMN IF NOT EXISTS source_campagne text;

COMMENT ON COLUMN diagnostics.source_campagne IS 'Code campagne lu dans ?src= à l''arrivée sur le scan (null = accès direct)';
COMMENT ON COLUMN contacts.source_campagne    IS 'Dernière campagne connue ayant amené ce contact au scan';

CREATE INDEX IF NOT EXISTS idx_diagnostics_source_campagne
  ON diagnostics (source_campagne) WHERE source_campagne IS NOT NULL;
