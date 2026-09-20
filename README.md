# Shikho Wheel Spin Template

Private internal starter for a Bengali, mobile-first event spin-wheel campaign. It includes the public participant journey, staff operations screen, prize inventory, PostgreSQL migrations, CRM outbox and test suite. Treat this repository as a foundation: give each new campaign its own database schema, CRM form values, credentials and deployment.

## Security boundary

No live credentials, database exports, participant data, CRM records or deployment tokens belong in this repository. The committed `.env.example` is intentionally blank. Keep actual values only in a local `.env.local` file and in the deployment provider's encrypted environment-variable settings.

The included `.gitignore` blocks `.env*` while allowing only `.env.example`, as well as deployment folders, build output, browser reports and test artefacts. Before pushing any change, review `git status` and staged files.

## Prerequisites

- Node.js 20 or later
- A PostgreSQL database that is isolated for this campaign
- A CRM API account and a campaign-specific custom-form option, if CRM delivery is required
- A deployment project, such as Vercel, with its own environment variables

## Local setup

```sh
git clone <your-private-repository-url>
cd shikho-wheel-spin-template
cp .env.example .env.local
npm ci
npm run db:migrate
npm run dev
```

The local app is served at `http://localhost:3300`.

Populate `.env.local` from the deployment or campaign owner. Do not use `NEXT_PUBLIC_*` for any secret.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Server-side PostgreSQL connection for this campaign |
| `ALO_OPS_KEY` | Operations-screen sign-in secret |
| `ALO_SESSION_SECRET` | Secret used to sign staff sessions |
| `CRM_API_BASE_URL` | CRM API base URL |
| `CRM_TOKEN` | Server-only CRM API token |
| `CRON_SECRET` | Secret protecting the CRM retry endpoint |
| `TURNSTILE_SITE_KEY` | Optional public Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Optional server-side Cloudflare Turnstile secret |

`ALO_TEST_URL` and `ALO_BROWSER` are optional test controls. Leave both unset for the normal local flow.

## Adapt the campaign

1. Replace the Shikho and partner branding in `public/brand/`, metadata in `src/app/layout.tsx`, and visible event copy.
2. Update the campaign rules and prize configuration in `src/lib/game.ts`. Confirm probabilities, discount validity and inventory with the commercial owner before launch.
3. Use `/ops` to create the event. Activating an event makes it the root-URL event without changing the printed QR code. Past entries retain the event that was active when they registered.
4. If CRM delivery is enabled, provision the event's distinct `cf_form_name` option before participants spin. The app derives the submitted value from the event ID, so an event ID such as `my-city` becomes `S26_LGPA5_Spin_My_City`. Confirm that exact option exists in CRM first.
5. Set book and bag caps in `/ops` if stock is finite. Empty means uncapped; zero disables that prize.
6. Run the verification suite against a non-production database before launch.

The current code carries the original campaign's domain terminology and data schema under `alo`. Rename those only as a deliberate migration, not by an unreviewed find-and-replace.

## CRM delivery model

Registration creates a durable `lead.upsert` job and a completed spin creates a `spin.completed` job in the database outbox. The retry endpoint processes pending jobs every five minutes. This separation avoids losing a participant result if the CRM is unavailable.

For every new event, provision the campaign's CRM form option once through `/ops` before going live. The submitted event contains the exact prize key in `cf_result` and the campaign-specific form value in `cf_form_name`. Do not reuse an old city's value for a new event.

## Verification

```sh
npm test
npm run lint
npm run build
npm run test:api
npm run test:browser
```

The API and browser suites create isolated test records, then clean them up. They require the local server, `.env.local` and a non-production database. Browser testing uses Playwright Chromium; install it once with:

```sh
npx playwright install chromium
```

Do not run the tests against a live campaign. If testing CRM behaviour, use an approved QA lead and a dedicated QA form value.

## Deployment checklist

1. Create a new private deployment project from this repository.
2. Add the production values as encrypted environment variables in the deployment provider. Do not copy `.env.local` into the repository or build logs.
3. Point `DATABASE_URL` to the isolated production campaign database and run `npm run db:migrate` once.
4. Configure the CRM retry schedule to call `/api/cron/crm` every five minutes with `CRON_SECRET`.
5. Provision and activate the event in `/ops`, then confirm the CRM form value, a test spin, retry status and prize inventory.
6. Use the `/demo` route for stakeholder walkthroughs. It does not create live registrations, prizes or CRM jobs.

## Reference material

- `PRODUCT.md` describes the original campaign rules and operational decisions.
- `DESIGN.md` describes the interaction and visual system.
- `sql/` contains the database migrations.
- `tests/` captures the expected public, CRM and operations behaviour.

This repository is internal and proprietary. Do not make it public or share its source, assets, database structure or campaign rules outside the authorised team.
