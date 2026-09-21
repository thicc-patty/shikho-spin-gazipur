BEGIN;
-- School class captured at registration. Entries created by the original GPA5
-- campaign predate this step and were all class eleven students.
ALTER TABLE alo.entries ADD COLUMN IF NOT EXISTS class_level text NOT NULL DEFAULT 'c11';
ALTER TABLE alo.entries ALTER COLUMN class_level DROP DEFAULT;
ALTER TABLE alo.entries DROP CONSTRAINT IF EXISTS alo_entries_class_level;
ALTER TABLE alo.entries ADD CONSTRAINT alo_entries_class_level
 CHECK (class_level IN ('c6','c7','c8','c9','c10','c11'));
COMMIT;
