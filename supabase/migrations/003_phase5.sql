-- ══════════════════════════════════════════════════════════════
-- Phase 5 — Tunnel de conversion MOJO Lead Engine
-- ══════════════════════════════════════════════════════════════

-- Statut commercial sur contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lastname text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status text DEFAULT 'NEW'
  CHECK (status IN ('NEW','DIAGNOSTIC_COMPLETED','REPORT_SENT','APPOINTMENT_CLICKED','CONTACTED','QUALIFIED','CLIENT','LOST'));
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now();
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS segment_metier text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS parcours_id text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS parcours_match_type text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS recommended_program_1 text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS recommended_program_2 text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS recommended_program_3 text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source_lead text DEFAULT 'mojo-scan';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS marketing_consent_date timestamptz;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS marketing_consent_source text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS brevo_synced_at timestamptz;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS brevo_contact_id text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS diagnostic_count int DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_diagnostic_at timestamptz;

-- Events analytics funnel
CREATE TABLE IF NOT EXISTS funnel_events (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id   text,
  diagnostic_id uuid REFERENCES diagnostics(id),
  contact_id   uuid REFERENCES contacts(id),
  event_type   text NOT NULL CHECK (event_type IN (
    'diagnostic_started','company_identified','diagnostic_completed',
    'teaser_viewed','lead_captured','report_viewed','report_emailed',
    'calendly_clicked','brevo_synced'
  )),
  properties   jsonb,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fe_diagnostic_idx ON funnel_events(diagnostic_id);
CREATE INDEX IF NOT EXISTS fe_event_idx ON funnel_events(event_type, created_at);

-- Email queue (idempotence + retry)
CREATE TABLE IF NOT EXISTS email_queue (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  diagnostic_id uuid REFERENCES diagnostics(id),
  contact_id    uuid REFERENCES contacts(id),
  email_type    text NOT NULL CHECK (email_type IN ('diagnostic','marketing')),
  to_email      text NOT NULL,
  status        text DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  attempts      int DEFAULT 0,
  last_attempt  timestamptz,
  sent_at       timestamptz,
  error_message text,
  idempotency_key text UNIQUE,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS eq_status_idx ON email_queue(status, created_at);

-- Droits
GRANT ALL ON funnel_events TO anon, authenticated, service_role;
GRANT ALL ON email_queue TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE funnel_events_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE email_queue_id_seq TO service_role;
