BEGIN;
CREATE SCHEMA IF NOT EXISTS alo;
CREATE TABLE IF NOT EXISTS alo.events (
 id text PRIMARY KEY, city text NOT NULL, name text NOT NULL, date text NOT NULL, active boolean NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX IF NOT EXISTS alo_one_active_event ON alo.events(active) WHERE active=true;
INSERT INTO alo.events(id,city,name,date,active) VALUES('chattogram','চট্টগ্রাম','প্রথম আলো GPA5 সংবর্ধনা ২০২৬','2026-09-13',true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS alo.entries (
 id uuid PRIMARY KEY, campaign text NOT NULL, phone text NOT NULL CHECK (phone ~ '^8801[3-9][0-9]{8}$'),
 name text NOT NULL, study_group text NOT NULL, event_id text NOT NULL, event_info jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 prize_id text, prize_code text UNIQUE, won_at timestamptz, expires_at timestamptz,
 redeemed_at timestamptz, draw_entered_at timestamptz,
 UNIQUE(campaign, phone), CHECK ((prize_id IS NULL) = (won_at IS NULL))
);
CREATE TABLE IF NOT EXISTS alo.sessions (
 id uuid PRIMARY KEY, token_hash text UNIQUE NOT NULL, event_id text NOT NULL,
 entry_id uuid REFERENCES alo.entries(id), created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now() + interval '90 days'
);
CREATE TABLE IF NOT EXISTS alo.analytics (
 id uuid PRIMARY KEY, session_id uuid REFERENCES alo.sessions(id), entry_id uuid REFERENCES alo.entries(id),
 event_id text NOT NULL, name text NOT NULL, detail jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alo_analytics_event_time ON alo.analytics(event_id, created_at);
CREATE TABLE IF NOT EXISTS alo.crm_outbox (
 id uuid PRIMARY KEY, entry_id uuid NOT NULL REFERENCES alo.entries(id),
 kind text NOT NULL, payload jsonb NOT NULL, status text NOT NULL DEFAULT 'pending',
 attempts integer NOT NULL DEFAULT 0, last_error text, created_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz
);
CREATE TABLE IF NOT EXISTS alo.inventory (
 event_id text NOT NULL, prize_id text NOT NULL CHECK (prize_id IN ('bag','book')),
 stock_limit integer CHECK(stock_limit >= 0), awarded integer NOT NULL DEFAULT 0,
 PRIMARY KEY(event_id, prize_id)
);
CREATE TABLE IF NOT EXISTS alo.rate_limits (
 key text PRIMARY KEY, bucket timestamptz NOT NULL, count integer NOT NULL
);
ALTER TABLE alo.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE alo.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alo.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE alo.crm_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE alo.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE alo.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE alo.events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA alo FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA alo FROM PUBLIC;
COMMIT;
