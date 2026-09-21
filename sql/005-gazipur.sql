BEGIN;
-- Gazipur campaign event, made the root-URL event for this deployment.
-- The date is provisional: confirm it in /ops before the event goes live.
-- Re-running this file re-activates Gazipur, so change the active event in /ops, not here.
SELECT pg_advisory_xact_lock(260910);
UPDATE alo.events SET active=false WHERE active=true;
INSERT INTO alo.events(id,city,name,date,active)
 VALUES('gazipur','গাজীপুর','প্রথম আলো GPA5 সংবর্ধনা ২০২৬','2026-09-26',true)
 ON CONFLICT(id) DO UPDATE SET city=excluded.city,name=excluded.name,active=true;
COMMIT;
