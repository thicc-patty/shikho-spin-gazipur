BEGIN;
CREATE TABLE IF NOT EXISTS alo.demo_feedback (
 id uuid PRIMARY KEY, event_id text NOT NULL, rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5),
 comment text NOT NULL DEFAULT '', step text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE alo.demo_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON alo.demo_feedback FROM PUBLIC;
COMMIT;
