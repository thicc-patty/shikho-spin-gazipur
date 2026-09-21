BEGIN;
-- Every analytics POST counts a session's rows to enforce its cap, and this is
-- the fastest growing table in the schema.
CREATE INDEX IF NOT EXISTS alo_analytics_session ON alo.analytics(session_id);
COMMIT;
