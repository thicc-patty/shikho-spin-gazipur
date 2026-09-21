# Handoff — Gazipur campaign

Live, deployed, working. Read this plus `git log` and you have the whole picture.
No secrets here: every credential lives in Vercel environment variables.

## Where it runs

| Thing | Value |
|---|---|
| Live site | `https://shikho-gazipur-spinwin.vercel.app` |
| Stakeholder demo | `/demo?event=gazipur` — same journey, writes nothing |
| Staff screen | `/ops` — key is `ALO_OPS_KEY` in Vercel (type Config, readable there) |
| GitHub | `thicc-patty/shikho-spin-gazipur`, private, branch `main` |
| Vercel | project `shikho-gazipur-spinwin`, team **Shikho** (slug `abidur1`), Hobby plan |
| Database | Neon `neon-green-lever`, connected as `DATABASE_URL` |
| Sheet backup | Google Sheet "Shikho Gazipur Spin", id `1jVt1C0MN4_DnFhSENx7dzS5QP8-qRdRULMciwBoaXzk` |

Deploy = `git push`. Vercel rebuilds in ~30s. Env var changes need a fresh build.

## Still open

1. **Event date is a placeholder** — `2026-09-26`, invented, never confirmed. Not
   displayed anywhere, but stamped into every entry's `event_info` and sent to CRM.
   Fix in `/ops` → Events.
2. **CRM form option `S26_Spin_Gazipur` does not exist yet.** Someone with CRM access
   must create it before `CRM_TOKEN` is set, or every lead delivery fails. The old
   `S26_LGPA5_Spin_*` option no longer matches anything.
3. **`cf_class` codes `C6`–`C10` and their passing years are extrapolated** from the
   template's `C11 → 2028` anchor. Unverified. See `CLASSES` in `src/lib/server/crm.ts`.
4. **Test rows** in Postgres and the Sheet from this build-out. Clear before the event.
5. **The domain is frozen once QR codes print.** Renaming the Vercel project is free
   until then and impossible after.

## What changed from the template, and why

Read the commit messages; they carry the reasoning. Summary:

- **School class step** (`c6`–`c10`) before the study group. Classes 6–8 skip the group
  screen entirely and store `others`; 9–10 choose one. Consent moved to the class screen
  so every path collects it exactly once.
- **Odds**: 20% and 30% carry 99.99% of spins. Weights are parts-per-million so the
  split is exact. Bag, book and 40/50/60 are ~1-in-50,000 each — effectively unwinnable,
  which was a deliberate, confirmed commercial decision. The wheel still shows them.
- **Unlimited spins**, best result kept, one code per phone. A phone that has played
  resumes its own entry rather than being refused, otherwise a student returning after
  a staff reset would be locked out permanently.
- **Staff reset**: any entry holding a prize releases the browser on load, plus an
  explicit পরের শিক্ষার্থী button. Registering without spinning still restores, so nobody
  is stranded mid-registration with their number already taken.
- **No GPA5, no HSC 28 anywhere.** The campaign now spans classes 6–10, who are neither
  GPA5 recipients nor HSC 2028 candidates. This was removed from the page, the gift card,
  the share description, the CRM campaign (`S26_Spin`), the CRM event (`shikho_spin_2026`)
  and the stored event name. Telesales must never read "GPA 5" to a class-6 student.
- **`firstName()`** skips a leading Md / Mohammad / Mst / Mrs, so students are greeted by
  name rather than honorific, and prize codes read `RAFIUL-…` not `MD-…`.
- **Google Sheet mirror** via Apps Script web app, keyed by phone so a re-spin updates the
  row in place. `SHEET_WEBHOOK_URL` unset disables it. Postgres stays the source of truth;
  a failed Sheet write never fails a spin.
- **Analytics batching**: a 20-event flush was 41 queries, now 2, plus an index on
  `alo.analytics(session_id)` which every request counts against.

## Traps that cost real time

- **Bangla literals differ by Unicode normalization.** A typed `ইয়েস!` (য় decomposed) will
  not match the source's precomposed form. Exact-string edits and Playwright
  `getByRole({name})` both fail silently. Match structurally, or pull the literal from
  source, or compare with `.normalize("NFC")`.
- **Vercel's env-var form ignores programmatic input.** Setting `.value` plus input events
  saves an *empty* string while the field displays masked dots. Use the REST API
  (`/api/v10/projects/{project}/env?slug={team}`) instead.
- **`vercel.json` `regions` is Pro-only and Hobby caps cron frequency.** Both are rejected
  at deployment creation: the trigger returns `201 PENDING` and then silently never builds.
  This is why nothing deployed for the first hour. Restore both only on Pro.
- **Migrations were applied by hand** through Vercel's Neon query console, wrapped in a
  single `DO $$ … END $$;` block because that console runs one statement per request.
  `scripts/migrate.mjs` is still the correct path for a fresh database.
- **Apps Script Monaco editor** ignores typed input and mangles brackets; set the file with
  `monaco.editor.getModels()[0].setValue()`.
- Deployment can be forced with the **deploy hook** in Vercel → Settings → Git when the
  GitHub webhook misbehaves.

## Verification

`npm test` (12 unit tests), `npm run lint`, `npm run build` all pass. The browser suites
in `tests/` need a real Postgres — they cannot run against a PGlite stand-in, which
serialises connections and breaks on six parallel queries.
