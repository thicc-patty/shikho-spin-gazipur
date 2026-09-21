BEGIN;
-- Each phone now gets three spins and keeps the best result, so the entry
-- tracks how many have been used. Entries made before this had exactly one.
ALTER TABLE alo.entries ADD COLUMN IF NOT EXISTS spins integer NOT NULL DEFAULT 0;
UPDATE alo.entries SET spins=1 WHERE prize_id IS NOT NULL AND spins=0;
COMMIT;
