BEGIN;
ALTER TABLE alo.entries ADD COLUMN IF NOT EXISTS crm_lead_id bigint;
ALTER TABLE alo.entries ADD COLUMN IF NOT EXISTS crm_prospect_id uuid;
ALTER TABLE alo.events ADD COLUMN IF NOT EXISTS crm_ready_at timestamptz;
ALTER TABLE alo.crm_outbox ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE alo.crm_outbox ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS alo_crm_outbox_entry_kind ON alo.crm_outbox(entry_id,kind);
CREATE INDEX IF NOT EXISTS alo_crm_outbox_pending ON alo.crm_outbox(next_attempt_at) WHERE status='pending';
COMMIT;
