-- ══════════════════════════════════════════════════════════════
-- MOJO SALES — SDR / PR3 — Portefeuille SDR : DONNÉES (idempotente).
--
-- Prérequis : 007_pr3_sdr_portefeuille_structure.sql.
--
-- Un SEUL bloc DO = une seule instruction atomique : toute anomalie
-- lève une exception et annule l'intégralité de l'opération (aucun
-- état intermédiaire possible).
--
-- A. Reconstruit la population selon EXACTEMENT la règle validée
--    (identique à compterTelephonesFiables / normaliserTelephone) :
--      - lots VSG_BAT50 + VSG_SDR_ENRICH_01..04 ;
--      - telephone non vide ;
--      - normalisation regexp_replace(telephone,'[\s.\-()]','','g') ;
--      - FIABLE  <=> numéro normalisé lié à exactement 1 company_id ;
--      - A_VERIFIER <=> numéro lié à ≥ 2 company_id -> EXCLU.
-- B. Contrôles bloquants (100/100/100/100, 0 A_VERIFIER, 55/45, lots).
-- C. Fige les 100 dans sdr_population_officielle (ou vérifie l'égalité
--    stricte si déjà figée).
-- D. Crée UNIQUEMENT les prospects_sales manquants
--    (ON CONFLICT (company_id) DO NOTHING — jamais d'écrasement).
-- E. Intègre les 100 téléphones au modèle de contact existant :
--    sources -> moyens_contact -> personnes_moyens_contact au niveau
--    ENTREPRISE (personne_id NULL, aucune personne inventée).
--    niveau_confiance : MATCH_FORT -> CONFIRME, MATCH_PROBABLE -> PROBABLE
--    (valeurs autorisées par le CHECK existant, vérifié en lecture).
-- F. Affecte la population (et elle seule) au SDR cible, uniquement si
--    son profil est role='SDR' AND actif, uniquement là où
--    assigned_to IS NULL (jamais d'écrasement d'une affectation).
-- G. Contrôles post-opération bloquants + preuve que les lignes
--    prospects_sales hors population (les 66 pilotes) sont
--    STRICTEMENT inchangées (empreinte complète avant/après).
--
-- Rejouable : un second passage n'insère/ne modifie rien et repasse
-- tous les contrôles.
-- ══════════════════════════════════════════════════════════════

DO $pr3$
DECLARE
  c_code_population constant text := 'SDR_VSG_FIABLES_100_V1';
  c_source_code     constant text := 'GOOGLE_PLACES_SDR_PR3';
  c_sdr_user_id     constant uuid := '0beb391e-6524-4ecb-8abd-b2139b98db4e';
  c_lots            constant text[] := ARRAY['VSG_BAT50','VSG_SDR_ENRICH_01','VSG_SDR_ENRICH_02','VSG_SDR_ENRICH_03','VSG_SDR_ENRICH_04'];

  v_n int; v_n2 int; v_n3 int; v_n4 int;
  v_deja_figee int;
  v_source_id uuid;
  v_pilotes_avant_n int; v_pilotes_avant_hash text;
  v_pilotes_apres_n int; v_pilotes_apres_hash text;
  v_ps_inseres int; v_mc_inseres int; v_pmc_inseres int; v_affectes int;
BEGIN
  -- ── A. Reconstruction (lecture seule) ─────────────────────────
  DROP TABLE IF EXISTS pg_temp._pr3_candidats;
  CREATE TEMP TABLE _pr3_candidats ON COMMIT DROP AS
  WITH t AS (
    SELECT er.lot_code, er.siren, er.company_id, er.statut, er.telephone,
           regexp_replace(er.telephone, '[\s.\-()]', '', 'g') AS tn
    FROM public.enrichissement_resultats er
    WHERE er.lot_code = ANY (c_lots)
      AND er.telephone IS NOT NULL AND trim(er.telephone) <> ''
  ), g AS (
    SELECT tn, count(DISTINCT company_id) AS nb_companies FROM t GROUP BY tn
  )
  SELECT t.*, g.nb_companies,
         CASE WHEN g.nb_companies = 1 THEN 'FIABLE' ELSE 'A_VERIFIER' END AS qualification
  FROM t JOIN g USING (tn);

  -- ── B. Contrôles bloquants sur la reconstruction ──────────────
  SELECT count(*), count(DISTINCT company_id), count(DISTINCT siren), count(DISTINCT tn)
    INTO v_n, v_n2, v_n3, v_n4
  FROM _pr3_candidats WHERE qualification = 'FIABLE';
  IF v_n <> 100 OR v_n2 <> 100 OR v_n3 <> 100 OR v_n4 <> 100 THEN
    RAISE EXCEPTION 'PR3 STOP — population FIABLE inattendue : lignes=%, company_id=%, siren=%, telephones=% (attendu 100/100/100/100)', v_n, v_n2, v_n3, v_n4;
  END IF;

  SELECT count(*) INTO v_n FROM _pr3_candidats WHERE qualification = 'A_VERIFIER';
  IF v_n <> 19 THEN
    RAISE EXCEPTION 'PR3 STOP — A_VERIFIER inattendus : % (attendu 19)', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM _pr3_candidats f
  WHERE f.qualification = 'FIABLE'
    AND f.company_id IN (SELECT company_id FROM _pr3_candidats WHERE qualification = 'A_VERIFIER');
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'PR3 STOP — % entreprise(s) à la fois FIABLE et A_VERIFIER', v_n;
  END IF;

  SELECT count(*) FILTER (WHERE statut = 'MATCH_FORT'), count(*) FILTER (WHERE statut = 'MATCH_PROBABLE')
    INTO v_n, v_n2
  FROM _pr3_candidats WHERE qualification = 'FIABLE';
  IF v_n <> 55 OR v_n2 <> 45 THEN
    RAISE EXCEPTION 'PR3 STOP — répartition matching inattendue : MATCH_FORT=%, MATCH_PROBABLE=% (attendu 55/45)', v_n, v_n2;
  END IF;

  IF (SELECT count(*) FROM _pr3_candidats WHERE qualification = 'FIABLE' AND lot_code = 'VSG_SDR_ENRICH_01') <> 25
  OR (SELECT count(*) FROM _pr3_candidats WHERE qualification = 'FIABLE' AND lot_code = 'VSG_SDR_ENRICH_02') <> 23
  OR (SELECT count(*) FROM _pr3_candidats WHERE qualification = 'FIABLE' AND lot_code = 'VSG_SDR_ENRICH_03') <> 25
  OR (SELECT count(*) FROM _pr3_candidats WHERE qualification = 'FIABLE' AND lot_code = 'VSG_SDR_ENRICH_04') <> 15
  OR (SELECT count(*) FROM _pr3_candidats WHERE qualification = 'FIABLE' AND lot_code = 'VSG_BAT50') <> 12 THEN
    RAISE EXCEPTION 'PR3 STOP — répartition par lot différente de 25/23/25/15/12';
  END IF;

  SELECT count(*) INTO v_n FROM _pr3_candidats f JOIN public.companies c ON c.id = f.company_id AND c.siren = f.siren
  WHERE f.qualification = 'FIABLE';
  IF v_n <> 100 THEN
    RAISE EXCEPTION 'PR3 STOP — seulement % / 100 entreprises retrouvées dans companies avec SIREN cohérent', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM _pr3_candidats
  WHERE qualification = 'FIABLE' AND tn !~ '^0[1-9][0-9]{8}$';
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'PR3 STOP — % téléphone(s) hors format 0XXXXXXXXX (format de moyens_contact.valeur_normalisee)', v_n;
  END IF;

  -- Un numéro de la population déjà rattaché ailleurs à UNE AUTRE
  -- entreprise serait un partage hors lots : jamais FIABLE -> STOP.
  SELECT count(*) INTO v_n
  FROM _pr3_candidats f
  JOIN public.moyens_contact mc ON mc.type = 'telephone' AND mc.valeur_normalisee = f.tn
  JOIN public.personnes_moyens_contact pmc ON pmc.moyen_contact_id = mc.id
  LEFT JOIN public.personnes p ON p.id = pmc.personne_id
  LEFT JOIN public.etablissements e ON e.id = pmc.etablissement_id
  WHERE f.qualification = 'FIABLE'
    AND coalesce(pmc.company_id, p.company_id, e.company_id) IS DISTINCT FROM f.company_id;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'PR3 STOP — % téléphone(s) de la population déjà rattaché(s) à une autre entreprise', v_n;
  END IF;

  -- ── Empreinte AVANT des lignes hors population (66 pilotes) ───
  SELECT count(*),
         md5(coalesce(string_agg(concat_ws('|', ps.id, ps.company_id, coalesce(ps.pipeline_stage, '∅'),
               coalesce(ps.next_action_type, '∅'), coalesce(ps.next_action_due_at::text, '∅'),
               coalesce(ps.temperature, '∅'), coalesce(ps.next_action_reason, '∅'),
               coalesce(ps.priorite_interne, '∅'), coalesce(ps.next_action_note, '∅'),
               coalesce(ps.date_dernier_contact::text, '∅'), coalesce(ps.date_prochain_contact::text, '∅'),
               coalesce(ps.assigned_to::text, '∅'), coalesce(ps.besoin_identifie, '∅'), ps.created_at::text),
             ',' ORDER BY ps.company_id), ''))
    INTO v_pilotes_avant_n, v_pilotes_avant_hash
  FROM public.prospects_sales ps
  WHERE ps.company_id NOT IN (SELECT company_id FROM _pr3_candidats WHERE qualification = 'FIABLE');

  -- ── C. Figer la population ────────────────────────────────────
  SELECT count(*) INTO v_deja_figee FROM public.sdr_population_officielle WHERE code_population = c_code_population;
  IF v_deja_figee = 0 THEN
    INSERT INTO public.sdr_population_officielle (company_id, siren, lot_code, telephone_normalise, statut_matching, code_population)
    SELECT company_id, siren, lot_code, tn, statut, c_code_population
    FROM _pr3_candidats WHERE qualification = 'FIABLE'
    ON CONFLICT (company_id) DO NOTHING;
  END IF;

  -- Égalité STRICTE population figée <-> reconstruction (company_id, siren, téléphone, lot, statut).
  SELECT count(*) INTO v_n FROM (
    (SELECT company_id, siren, lot_code, telephone_normalise, statut_matching
       FROM public.sdr_population_officielle WHERE code_population = c_code_population
     EXCEPT
     SELECT company_id, siren, lot_code, tn, statut FROM _pr3_candidats WHERE qualification = 'FIABLE')
    UNION ALL
    (SELECT company_id, siren, lot_code, tn, statut FROM _pr3_candidats WHERE qualification = 'FIABLE'
     EXCEPT
     SELECT company_id, siren, lot_code, telephone_normalise, statut_matching
       FROM public.sdr_population_officielle WHERE code_population = c_code_population)
  ) diff;
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'PR3 STOP — population figée et reconstruction divergent (% écart(s))', v_n;
  END IF;

  -- ── D. prospects_sales manquants uniquement ───────────────────
  INSERT INTO public.prospects_sales (company_id, pipeline_stage, next_action_type, next_action_reason)
  SELECT company_id, 'A_CONTACTER', 'CALL', 'Portefeuille SDR PR3 — premier appel à réaliser'
  FROM public.sdr_population_officielle WHERE code_population = c_code_population
  ON CONFLICT (company_id) DO NOTHING;
  GET DIAGNOSTICS v_ps_inseres = ROW_COUNT;

  -- ── E. Téléphones -> modèle de contact (niveau ENTREPRISE) ────
  INSERT INTO public.sources (code, libelle, type, actif)
  VALUES (c_source_code, 'Google Places — téléphone fiable du portefeuille SDR (PR3)', 'enrichissement_google_places', true)
  ON CONFLICT (code) DO NOTHING;
  SELECT id INTO v_source_id FROM public.sources WHERE code = c_source_code;

  INSERT INTO public.moyens_contact (type, valeur_normalisee, valeur_source_originale)
  SELECT 'telephone', p.telephone_normalise, er.telephone
  FROM public.sdr_population_officielle p
  JOIN public.enrichissement_resultats er
    ON er.company_id = p.company_id AND er.lot_code = p.lot_code AND er.siren = p.siren
  WHERE p.code_population = c_code_population
  ON CONFLICT (type, valeur_normalisee) DO NOTHING;
  GET DIAGNOSTICS v_mc_inseres = ROW_COUNT;

  -- ON CONFLICT avec le prédicat EXACT de l'index unique partiel
  -- ux_pmc_company (WHERE company_id IS NOT NULL) — sans ce prédicat,
  -- PostgreSQL lève 42P10 (même piège que celui documenté en PR1).
  INSERT INTO public.personnes_moyens_contact
    (company_id, moyen_contact_id, source_id, statut, provenance_detail, niveau_confiance)
  SELECT p.company_id, mc.id, v_source_id, 'retenu',
         'PR3 — téléphone FIABLE (lot ' || p.lot_code || ', ' || p.statut_matching || ')',
         CASE p.statut_matching WHEN 'MATCH_FORT' THEN 'CONFIRME' ELSE 'PROBABLE' END
  FROM public.sdr_population_officielle p
  JOIN public.moyens_contact mc ON mc.type = 'telephone' AND mc.valeur_normalisee = p.telephone_normalise
  WHERE p.code_population = c_code_population
  ON CONFLICT (moyen_contact_id, company_id, source_id) WHERE company_id IS NOT NULL DO NOTHING;
  GET DIAGNOSTICS v_pmc_inseres = ROW_COUNT;

  -- ── F. Affectation au SDR cible ───────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = c_sdr_user_id AND role = 'SDR' AND actif = true) THEN
    RAISE EXCEPTION 'PR3 STOP — le profil % n''est pas un SDR actif', c_sdr_user_id;
  END IF;

  UPDATE public.prospects_sales ps
  SET assigned_to = c_sdr_user_id
  FROM public.sdr_population_officielle p
  WHERE ps.company_id = p.company_id
    AND p.code_population = c_code_population
    AND ps.assigned_to IS NULL;
  GET DIAGNOSTICS v_affectes = ROW_COUNT;

  -- ── G. Contrôles post-opération bloquants ─────────────────────
  SELECT count(*) INTO v_n FROM public.sdr_population_officielle WHERE code_population = c_code_population;
  IF v_n <> 100 THEN RAISE EXCEPTION 'PR3 STOP — population officielle = % (attendu 100)', v_n; END IF;

  SELECT count(*) INTO v_n FROM public.prospects_sales ps
  JOIN public.sdr_population_officielle p ON p.company_id = ps.company_id AND p.code_population = c_code_population;
  IF v_n <> 100 THEN RAISE EXCEPTION 'PR3 STOP — prospects_sales correspondants = % (attendu 100)', v_n; END IF;

  SELECT count(DISTINCT p.company_id) INTO v_n
  FROM public.sdr_population_officielle p
  JOIN public.moyens_contact mc ON mc.type = 'telephone' AND mc.valeur_normalisee = p.telephone_normalise
  JOIN public.personnes_moyens_contact pmc
    ON pmc.moyen_contact_id = mc.id AND pmc.company_id = p.company_id AND pmc.source_id = v_source_id
  WHERE p.code_population = c_code_population;
  IF v_n <> 100 THEN RAISE EXCEPTION 'PR3 STOP — téléphones rattachés = % (attendu 100)', v_n; END IF;

  SELECT count(*) INTO v_n FROM public.personnes_moyens_contact pmc
  WHERE pmc.source_id = v_source_id AND pmc.personne_id IS NOT NULL;
  IF v_n <> 0 THEN RAISE EXCEPTION 'PR3 STOP — % rattachement(s) à une personne (aucune personne ne doit être créée/liée)', v_n; END IF;

  SELECT count(*) INTO v_n FROM (
    SELECT pmc.company_id FROM public.personnes_moyens_contact pmc
    WHERE pmc.source_id = v_source_id GROUP BY pmc.company_id HAVING count(*) > 1
  ) d;
  IF v_n <> 0 THEN RAISE EXCEPTION 'PR3 STOP — % entreprise(s) avec rattachement téléphone en double', v_n; END IF;

  SELECT count(*) INTO v_n FROM public.prospects_sales ps
  JOIN public.sdr_population_officielle p ON p.company_id = ps.company_id AND p.code_population = c_code_population
  WHERE ps.assigned_to = c_sdr_user_id;
  IF v_n <> 100 THEN RAISE EXCEPTION 'PR3 STOP — assigned_to SDR cible = % / 100', v_n; END IF;

  SELECT count(*) INTO v_n FROM public.prospects_sales ps
  WHERE ps.assigned_to = c_sdr_user_id
    AND ps.company_id NOT IN (SELECT company_id FROM public.sdr_population_officielle WHERE code_population = c_code_population);
  IF v_n <> 0 THEN RAISE EXCEPTION 'PR3 STOP — % prospect(s) hors population affecté(s) au SDR cible', v_n; END IF;

  SELECT count(*) INTO v_n FROM public.prospects_sales ps
  WHERE ps.company_id IN (SELECT company_id FROM _pr3_candidats WHERE qualification = 'A_VERIFIER')
    AND (ps.assigned_to IS NOT NULL
         OR ps.company_id IN (SELECT company_id FROM public.sdr_population_officielle));
  IF v_n <> 0 THEN RAISE EXCEPTION 'PR3 STOP — % entreprise(s) A_VERIFIER intégrée(s)/affectée(s)', v_n; END IF;

  SELECT count(*) - count(DISTINCT company_id) INTO v_n FROM public.prospects_sales;
  IF v_n <> 0 THEN RAISE EXCEPTION 'PR3 STOP — % doublon(s) dans prospects_sales', v_n; END IF;

  -- Empreinte APRÈS des lignes hors population : doit être IDENTIQUE.
  SELECT count(*),
         md5(coalesce(string_agg(concat_ws('|', ps.id, ps.company_id, coalesce(ps.pipeline_stage, '∅'),
               coalesce(ps.next_action_type, '∅'), coalesce(ps.next_action_due_at::text, '∅'),
               coalesce(ps.temperature, '∅'), coalesce(ps.next_action_reason, '∅'),
               coalesce(ps.priorite_interne, '∅'), coalesce(ps.next_action_note, '∅'),
               coalesce(ps.date_dernier_contact::text, '∅'), coalesce(ps.date_prochain_contact::text, '∅'),
               coalesce(ps.assigned_to::text, '∅'), coalesce(ps.besoin_identifie, '∅'), ps.created_at::text),
             ',' ORDER BY ps.company_id), ''))
    INTO v_pilotes_apres_n, v_pilotes_apres_hash
  FROM public.prospects_sales ps
  WHERE ps.company_id NOT IN (SELECT company_id FROM public.sdr_population_officielle WHERE code_population = c_code_population);
  IF v_pilotes_apres_n <> v_pilotes_avant_n OR v_pilotes_apres_hash <> v_pilotes_avant_hash THEN
    RAISE EXCEPTION 'PR3 STOP — lignes pilotes altérées : avant n=% hash=% / après n=% hash=%',
      v_pilotes_avant_n, v_pilotes_avant_hash, v_pilotes_apres_n, v_pilotes_apres_hash;
  END IF;

  RAISE NOTICE 'PR3 OK — prospects_sales insérés=%, moyens_contact insérés=%, rattachements insérés=%, affectés=%, pilotes préservés=% (hash %)',
    v_ps_inseres, v_mc_inseres, v_pmc_inseres, v_affectes, v_pilotes_apres_n, v_pilotes_apres_hash;
END
$pr3$;
