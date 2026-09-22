-- ══════════════════════════════════════════════════════════════
-- FIX.2 — Permissions manquantes sur les tables P0.8C.2.
--
-- CAUSE : la migration P0.8C.2 (migration-p08c2-non-executee.sql) a créé
-- campagnes/campagne_lots/campagne_lot_membres sans GRANT explicite.
-- Contrairement aux tables P0.7 (prospects_sales, activites), service_role
-- ne disposait que de REFERENCES/TRIGGER/TRUNCATE — aucun SELECT/INSERT/
-- UPDATE/DELETE. D'où "permission denied for table campagnes" à la
-- première écriture applicative (POST /api/admin/campagnes).
--
-- RLS n'est PAS la cause (désactivé sur les 3 tables, vérifié). Ceci est
-- un GRANT SQL brut, jamais une policy RLS.
--
-- STATUT : déjà exécutée manuellement le 21/09/2026 (vérifiée avant/après
-- — voir rapport FIX.2). Ce fichier est conservé uniquement pour
-- traçabilité Git, comme demandé.
--
-- Portée strictement limitée à service_role — jamais anon/authenticated
-- (ces tables restent une interface admin privée). Aucun changement de
-- schéma métier, aucun changement d'owner, aucune modification RLS.
-- ══════════════════════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE campagnes, campagne_lots, campagne_lot_membres
TO service_role;
