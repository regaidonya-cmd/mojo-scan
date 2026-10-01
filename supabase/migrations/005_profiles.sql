-- ══════════════════════════════════════════════════════════════
-- MOJO SALES — SDR / PR2 — Table profiles (rôle ADMIN/SDR).
--
-- L'identité (email, mot de passe, session) reste ENTIÈREMENT gérée par
-- Supabase Auth natif (auth.users) — profiles ne contient AUCUN mot de
-- passe, uniquement un rôle métier.
--
-- RLS : un utilisateur authentifié peut lire UNIQUEMENT son propre
-- profil (auth.uid() = user_id). Aucune écriture possible depuis le
-- navigateur (anon/authenticated) — seule service_role (backend) peut
-- créer/modifier un profil, exactement comme pour toutes les autres
-- tables sensibles de ce projet (cohérent avec companies/prospects_sales).
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom text NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN', 'SDR')),
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Aucune policy INSERT/UPDATE/DELETE pour anon/authenticated : RLS activé
-- sans policy d'écriture = toute écriture depuis le navigateur est
-- refusée par défaut. Seul service_role (bypass RLS natif) peut écrire.
