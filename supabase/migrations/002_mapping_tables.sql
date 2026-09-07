-- ══════════════════════════════════════════════════════════════
-- MOJO LEAD ENGINE — Tables de mapping (source de vérité DB)
-- Modifiables via Supabase dashboard sans redéploiement
-- ══════════════════════════════════════════════════════════════

-- Table Mapping_Questions_Modules
create table if not exists mapping_questions_modules (
  id              serial primary key,
  id_question     varchar(10) not null,
  valeur_reponse  text not null,
  label_reponse   text not null,
  id_module       varchar(20) not null,
  poids           int not null check (poids between 1 and 5),
  actif           boolean default true,
  justification   text,
  updated_at      timestamptz default now()
);
create index if not exists mqm_question_idx on mapping_questions_modules(id_question, valeur_reponse);
create index if not exists mqm_actif_idx on mapping_questions_modules(actif);

-- Table Mapping_Parcours_Programmes
create table if not exists mapping_parcours_programmes (
  id              serial primary key,
  id_parcours     varchar(10) not null,
  id_programme    varchar(10) not null,
  poids           int not null check (poids between 1 and 5),
  actif           boolean default true,
  updated_at      timestamptz default now()
);
create index if not exists mpp_parcours_idx on mapping_parcours_programmes(id_parcours);

-- Droits
grant all on mapping_questions_modules to anon, authenticated, service_role;
grant all on mapping_parcours_programmes to anon, authenticated, service_role;
grant usage, select on sequence mapping_questions_modules_id_seq to anon, authenticated, service_role;
grant usage, select on sequence mapping_parcours_programmes_id_seq to anon, authenticated, service_role;
