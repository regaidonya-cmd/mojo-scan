-- ══════════════════════════════════════════════════════════════
-- MOJO SCAN FLASH — Schéma SQL v1
-- Supabase / PostgreSQL
-- ══════════════════════════════════════════════════════════════

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- recherche floue entreprises

-- ── ENTREPRISES ───────────────────────────────────────────────
create table companies (
  id            uuid primary key default uuid_generate_v4(),
  siren         varchar(9) unique,
  siret         varchar(14),
  name          text not null,
  trade_name    text,
  naf           varchar(6),
  naf_label     text,
  address       text,
  postal_code   varchar(5),
  city          text,
  employee_band text, -- 'TE','BE','PE','ME','GE'
  source        text default 'api-recherche-entreprises',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index companies_siren_idx on companies(siren);
create index companies_name_trgm on companies using gin(name gin_trgm_ops);

-- ── CONTACTS ──────────────────────────────────────────────────
create table contacts (
  id            uuid primary key default uuid_generate_v4(),
  company_id    uuid references companies(id),
  firstname     text,
  email         text not null unique,
  phone         text,
  role          text, -- 'dirigeant','rh','manager','salarie','autre'
  hubspot_id    text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index contacts_email_idx on contacts(email);
create index contacts_hubspot_idx on contacts(hubspot_id);

-- ── DIAGNOSTICS ───────────────────────────────────────────────
create table diagnostics (
  id                  uuid primary key default uuid_generate_v4(),
  company_id          uuid references companies(id),
  contact_id          uuid references contacts(id),
  mode                text not null check (mode in ('site','terrain','call')),
  source              text default 'web',
  status              text not null default 'in_progress'
                        check (status in ('in_progress','completed','abandoned')),
  -- Scores
  business_score      int,
  score_acquisition   int,
  score_visibilite    int,
  score_conversion    int,
  score_fidelisation  int,
  score_organisation  int,
  score_ia            int,
  lead_score          int,
  -- Résultats
  objective_main      text,
  branch              text, -- 'acquisition','conversion','ia'
  priorities          jsonb, -- [{rank:1, label:'...', detail:'...'}]
  financement_label   text,
  financement_details jsonb,
  -- Report
  report_token        text unique default encode(gen_random_bytes(32), 'hex'),
  report_url          text,
  report_sent_at      timestamptz,
  email_sent_at       timestamptz,
  -- HubSpot
  hubspot_contact_id  text,
  hubspot_deal_id     text,
  hubspot_synced_at   timestamptz,
  -- Tracking
  adviser_note        text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  completed_at        timestamptz
);
create index diagnostics_status_idx      on diagnostics(status);
create index diagnostics_lead_score_idx  on diagnostics(lead_score desc);
create index diagnostics_created_at_idx  on diagnostics(created_at desc);
create index diagnostics_report_token_idx on diagnostics(report_token);

-- ── RÉPONSES ──────────────────────────────────────────────────
create table answers (
  id              uuid primary key default uuid_generate_v4(),
  diagnostic_id   uuid not null references diagnostics(id) on delete cascade,
  question_code   text not null,
  value           text not null,
  score           int default 0,
  created_at      timestamptz default now()
);
create index answers_diagnostic_idx on answers(diagnostic_id);

-- ── CATALOGUE FORMATIONS ──────────────────────────────────────
create table catalog_items (
  id          uuid primary key default uuid_generate_v4(),
  code        text not null unique,
  title       text not null,
  description text,
  duration_h  int, -- heures
  price_ht    int, -- euros
  tags        text[] not null default '{}',
  audience    text[] not null default '{}', -- ['dirigeant','salarie']
  active      boolean default true,
  sort_order  int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── RECOMMANDATIONS ───────────────────────────────────────────
create table recommendations (
  id              uuid primary key default uuid_generate_v4(),
  diagnostic_id   uuid not null references diagnostics(id) on delete cascade,
  catalog_code    text not null references catalog_items(code),
  rank            int not null default 1,
  reason          text,
  created_at      timestamptz default now()
);

-- ── RÈGLES DE FINANCEMENT ─────────────────────────────────────
create table funding_rules (
  id              uuid primary key default uuid_generate_v4(),
  funder          text not null, -- 'OPCO EP','AGEFICE','FIF PL','FAFCEA'...
  audience        text[] not null,
  naf_codes       text[], -- null = tous secteurs
  employee_bands  text[], -- null = toutes tailles
  conditions      jsonb not null default '{}',
  coverage_pct    int, -- % de prise en charge estimée
  coverage_label  text, -- '100% si <11 salariés'
  source_url      text,
  verified_at     date,
  active          boolean default true,
  created_at      timestamptz default now()
);

-- ── FILE D'ATTENTE SYNC ───────────────────────────────────────
create table sync_queue (
  id          uuid primary key default uuid_generate_v4(),
  provider    text not null, -- 'hubspot'
  object_type text not null, -- 'contact','company','deal'
  payload     jsonb not null,
  status      text not null default 'pending'
                check (status in ('pending','processing','done','failed')),
  retries     int default 0,
  last_error  text,
  created_at  timestamptz default now(),
  processed_at timestamptz
);
create index sync_queue_status_idx on sync_queue(status, created_at);

-- ── CONSENTEMENTS ─────────────────────────────────────────────
create table consents (
  id              uuid primary key default uuid_generate_v4(),
  contact_id      uuid references contacts(id),
  diagnostic_id   uuid references diagnostics(id),
  type            text not null, -- 'diagnostic_send','marketing'
  granted         boolean not null,
  version         text not null default '1.0',
  ip_hash         text,
  user_agent      text,
  created_at      timestamptz default now()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
alter table companies       enable row level security;
alter table contacts        enable row level security;
alter table diagnostics     enable row level security;
alter table answers         enable row level security;
alter table recommendations enable row level security;
alter table sync_queue      enable row level security;
alter table consents        enable row level security;

-- Politique : service_role a accès complet (API backend)
-- Les clients publics n'ont pas d'accès direct
create policy "service_role_all" on companies       for all using (auth.role() = 'service_role');
create policy "service_role_all" on contacts        for all using (auth.role() = 'service_role');
create policy "service_role_all" on diagnostics     for all using (auth.role() = 'service_role');
create policy "service_role_all" on answers         for all using (auth.role() = 'service_role');
create policy "service_role_all" on recommendations for all using (auth.role() = 'service_role');
create policy "service_role_all" on sync_queue      for all using (auth.role() = 'service_role');
create policy "service_role_all" on consents        for all using (auth.role() = 'service_role');

-- Catalog et funding_rules : lecture publique OK
create policy "public_read" on catalog_items   for select using (true);
create policy "public_read" on funding_rules   for select using (active = true);

-- ── DONNÉES INITIALES — CATALOGUE ────────────────────────────
insert into catalog_items (code, title, duration_h, price_ht, tags, audience) values
  ('IA_DIG_1J',   'IA & ChatGPT pour dirigeants — Gagner 1h/jour et 3 nouveaux clients',   7,  990,  array['ia','chatgpt','productivite','acquisition'],        array['dirigeant']),
  ('SEO_LOC_1J',  'SEO Local & Google Business Profile — Être visible là où on vous cherche', 7,  990,  array['seo-local','google','acquisition','visibilite'],      array['dirigeant','salarie']),
  ('AUTO_1J',     'Automatisation & Productivité — Gagnez 3h/jour sur vos tâches répétitives', 7, 990, array['automatisation','ia','productivite','organisation'],   array['dirigeant','salarie']),
  ('RS_ACQ_1J',   'Réseaux sociaux & Acquisition clients — Transformer Instagram en machine à leads', 7, 990, array['reseaux-sociaux','acquisition','contenus'], array['dirigeant','salarie']),
  ('WP_PRO_2J',   'WordPress Professionnel — Créer et gérer votre site sans coder',          14, 1490, array['wordpress','site','seo','autonomie'],                  array['dirigeant','salarie']),
  ('RESTO_FULL',  'Parcours Digital Restaurateur — Réservations, Google, Réseaux',           21, 3200, array['restauration','seo-local','acquisition','fidelisation'],array['dirigeant']),
  ('AUTO_FULL',   'Parcours Digital Auto-École — Leads, GBP, Automatisation',                21, 3200, array['auto-ecole','seo-local','acquisition','automatisation'],array['dirigeant']),
  ('BTP_FULL',    'Parcours Digital Artisan BTP — Visibilité, Devis, Fidélisation',          21, 3200, array['btp','artisan','seo-local','acquisition','devis'],      array['dirigeant']),
  ('FIDELISA_1J', 'Fidélisation Client Digital — CRM, Emailing, Automatisation',             7,  990,  array['fidelisation','crm','emailing','automatisation'],       array['dirigeant','salarie']),
  ('CONVERT_1J',  'Génération de Rendez-vous — Calendly, Tunnel & Page de capture',          7,  990,  array['conversion','rdv','tunnel','acquisition'],              array['dirigeant','salarie']);

-- ── DONNÉES INITIALES — FINANCEMENT ──────────────────────────
insert into funding_rules (funder, audience, conditions, coverage_pct, coverage_label, verified_at) values
  ('OPCO EP',     array['dirigeant','salarie'], '{"max_employees": 50}'::jsonb,           80,  'Jusqu''à 80% pour les TPE < 50 salariés', '2026-01-01'),
  ('AGEFICE',     array['dirigeant'],           '{"status": ["TNS","gérant non salarié"]}'::jsonb, 100, '100% pour les dirigeants TNS', '2026-01-01'),
  ('FIF PL',      array['dirigeant'],           '{"naf_prefix": ["69","70","71","72","73","74","75","85","86","87","88"]}'::jsonb, 100, '100% professions libérales', '2026-01-01'),
  ('FAFCEA',      array['dirigeant'],           '{"naf_prefix": ["41","42","43","45"]}'::jsonb, 100, '100% artisans BTP', '2026-01-01'),
  ('CPF',         array['salarie'],             '{}'::jsonb,                               100, 'Selon solde CPF disponible', '2026-01-01');
