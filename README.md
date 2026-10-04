# Retroactive Horoscope

A Next.js + TypeScript app deployed on Vercel, with a Supabase database
migrated by CI, row level security policies proven by an automated test
suite, and migrations guaranteed to land before the code depending on
them serves traffic. This repository is the full deployment-lifecycle
exercise (Sprints 1–10) — see `docs/ROADMAP_v1.md` for the plan and
`docs/RUNBOOK.md` for rollback and incident procedures.

`/chart` enters a past date and computes geocentric planetary positions
for it, via an adapter around `astronomy-engine` (`lib/ephemeris/`) with
no place/houses/angles input — see the Sprint 6 file for why. Saving a
reading there stores it anonymously and returns a `/reading/[id]` link —
that link is the only access control (Sprint 10); there's no listing
route and no way to enumerate what's been saved.

`lib/ephemeris/aspects.ts`, `balance.ts`, `moon-phase.ts`, and `julian-day.ts`
(Sprint 12) compute Ptolemaic aspects, element/modality balance, and moon
phase. A UI calling them was built (Sprint 13), reverted ahead of a
data-model revision (Sprint 14, not because the code was wrong), then
finally given a caller by `lib/chart/model.ts`'s `composeChart` (Sprint
15) and `/reading/[id]` (Sprint 18) — the gap between "tested" and "used"
was deliberate, not neglect.

`readings.events` (Sprint 16) and `readings.horoscope` (Sprint 17) are
both **anon-writable by anyone holding a reading id** — `set_reading_horoscope`
is granted to `anon` the same way insert is, and there's no owner concept
to check against (Sprint 4). Treat both columns as untrusted content, the
same trust level as any other public form submission. `/reading/[id]`
(Sprint 18) is the one place that renders them, and it does so two ways
worth keeping in mind before changing that code:

- Both render as escaped text only — never `dangerouslySetInnerHTML`,
  never a markdown renderer that permits raw HTML, never `innerHTML`.
  `horoscope`'s paragraphs are produced by splitting on newlines and
  mapping each to a `<p>` as JSX text content (`app/reading/[id]/display.ts`),
  which stays escaped without needing a markdown library at all — reaching
  for one to get the same paragraph rendering is what turns a shared link
  into stored XSS.
- Any external URL from `events` (`sourceUrl`) is scheme-checked
  (`isSafeExternalUrl`, requiring `https://`) before it's ever allowed
  into an `href`. This is a separate guard from escaping, not a redundant
  one: React's default escaping protects text content, not a `javascript:`
  URL sitting in an attribute.

`readings.place_name`/`latitude`/`longitude`/`timezone` are vestigial:
Sprint 2 added them before Sprint 6 dropped place and geocoding entirely.
They're nullable rather than dropped (Sprint 10 relaxed rather than
removed them — see that migration), knowingly left behind rather than
forgotten. Nothing in this app populates them.

There is no authentication in this app. It's a fully public, anonymous
tool — the Supabase anon key ships in the client bundle by design, and RLS
policies (not a login wall) are what stand between that key and the data.

## Local setup

Use Node 22 (pinned in `.nvmrc` and `package.json` `engines`).

```bash
nvm use        # or otherwise ensure Node 22.x
npm install
npm run dev    # http://localhost:3000
```

`/` redirects straight to `/chart` (Sprint 11) — there's no page of its
own. `/chart` itself needs no environment variables to render the date
form; saving a reading does, same as `/reading/[id]` — see `.env.example`.

`/api/health/db` does need Supabase configured. For local development:

```bash
npx supabase start   # requires Docker; prints local URL + anon/service keys
```

Copy the printed `API URL`, `anon key`, and `service_role key` into a
`.env.local` (gitignored) as `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` — see
`.env.example` for the full list, each marked public or secret.
`supabase start` applies every migration in `supabase/migrations/` to the
local database automatically.

## Authoring a migration

```bash
npx supabase migration new <short_description>
```

creates a new timestamped, empty file under `supabase/migrations/`. Write
plain SQL DDL in it — no schema changes belong anywhere else in the repo.
End it with an insert recording its own filename as the version, matching
every migration before it:

```sql
insert into public.schema_migrations (version) values ('<the file's own timestamp_description>');
```

That table is this repo's own migration ledger (see the comment at the top
of the first migration for why), and it's what `/api/health/db` reports
from. Run `npx supabase db reset` to rebuild your local database from
scratch and confirm the migration applies cleanly before committing it.

## Row level security

`readings` has RLS enabled with exactly three rules for the `anon` role,
all in `supabase/migrations/20260816134147_readings_rls_policies.sql`:

- **Insert: allowed.** Anyone can create a reading. There's no owner to
  check against — this is a public, anonymous tool.
- **Select: denied on the table, allowed by id via a function.** There is
  no SELECT policy on `readings` itself, so a direct `select * from
  readings` always returns nothing, no matter how it's filtered — RLS
  can't tell a filtered query from an unfiltered one, so a policy that
  *looks* like "readable by id" would actually make the whole table
  listable. Instead, `get_reading_by_id(reading_id uuid)` is a
  `security definer` function that takes the id as an explicit argument
  and returns just that row. A reading is reachable by its own id and by
  nothing else. One consequence: since there's no SELECT policy, an
  `insert ... returning *` can't return the new row either — the id has
  to be generated by the client and included in the insert, not read back
  afterward. See the test file for the pattern.
- **Update/delete: denied outright.** No policy for either, so both are
  no-ops against every row.

`tables_without_rls()` is a second function, callable by anon, that
queries the Postgres catalogue for any `public` table with RLS disabled.
It exists so RLS coverage is enforced against tables that don't exist
yet, not just the ones this sprint happens to touch.

### Running the policy tests

```bash
npx supabase start        # requires Docker
npm run test:rls
```

`npm run test` (the default suite) does **not** include these — they need
a live Postgres + PostgREST behind them, not just Node. `npm run test:rls`
uses `vitest.rls.config.ts` to target only `supabase/tests/`. Every test in
there uses the anon client exclusively; none of them use the service role
key, since that bypasses RLS and would make the suite pass no matter what
the policies actually say.

## Local validation

What you can run on your own machine to check a change before pushing, what
each step needs, and what only CI can check. Every command below was run with
no `.env.local` present on 4 October 2026 (Sprint 26), and the results
described are what those runs showed. Times are rough figures from those runs.

### Tier 1: CI's `build` job, locally

No Docker, no `.env.local`, no Supabase. These are the steps of
`.github/workflows/ci.yml`'s `build` job, in the same order:

```bash
npm ci              # clean install from package-lock.json (~10s)
npm run lint        # eslint (~2s)
npm run typecheck   # tsc --noEmit (~2s)
npm run test        # vitest run (~1s)
npm run build       # next build, the same command Vercel runs (~5s)
```

**Network:** `lint`, `typecheck` and `test` need none; they also pass with
networking switched off. `npm ci` needs the npm registry. `npm run build` needs
Google Fonts: `next/font/google` (`app/layout.tsx`) downloads both typefaces at
build time, and the build fails without a connection.

**What passing shows:** the code lints, type-checks, passes the unit tests,
and compiles as a production build. **What it doesn't:** `npm run test`
excludes `supabase/tests/**` (`vitest.config.ts`), so nothing in tier 1 touches
a database. The RLS policies and the save/retrieve path are tier 2. Nothing
here checks the deployed app.

### Tier 2: CI's `rls-tests` job, locally

Needs Docker running. This is the local equivalent of CI's `rls-tests` job:

```bash
npx supabase start   # local stack; applies every migration (~30-90s)
export $(npx supabase status -o env \
  --override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
  --override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY \
  | grep '^NEXT_PUBLIC_SUPABASE_' | tr -d '"')
npm run test:rls     # vitest run --config vitest.rls.config.ts (~2s)
npx supabase stop    # when you're done
```

The `export` line (bash) is CI's own "Export local stack URL/anon key" step.
The tests read `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
from the environment, and Vitest does not load `.env.local`. Without that
line, every test fails with `Supabase client requires NEXT_PUBLIC_SUPABASE_URL
and NEXT_PUBLIC_SUPABASE_ANON_KEY`. The two-command recipe under
[Running the policy tests](#running-the-policy-tests) leaves this step out. It
is the same suite; see that section for what the tests cover.

### Running the built app locally

```bash
npm run build && npm run start   # http://localhost:3000
```

With no `.env.local`, this is what each route does:

- `/` redirects (307) to `/chart`.
- `/chart` renders the date form, and casting a chart
  (`/chart?date=1969-07-20`) shows the positions. Step 1 is pure computation
  and needs no environment.
- **See the full reading** fails. The server action needs Supabase, it returns
  500, and the browser shows Next's generic "This page couldn't load" error.
- `/reading/<any id>` returns 500 with the "temporarily unavailable" page.
- `/api/health/db` returns 503 with `"status":"misconfigured"`, the error
  `Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and
  SUPABASE_SERVICE_ROLE_KEY`, and `"commit":{"sha":"local-dev", ...,
  "isLocal":true}`. `local-dev` marks a build without
  `VERCEL_GIT_COMMIT_SHA`, i.e. not a Vercel deployment.

Saving and reading need a `.env.local`; read the next paragraph before
creating one.

### Which `.env.local` is which

A `.env.local` pointing at the **local** Docker stack (the values
`npx supabase start` prints, per [Local setup](#local-setup)) is the normal
one. A `.env.local` holding the **production** project's URL and keys means
`npm run dev` and `npm run start` read and write the production database:
every reading you save is a real production row. Use one only deliberately,
and delete it afterwards.

### What only CI can check

CI's `migrate` job, which runs only on pushes to `main`, after `build` and
`rls-tests` pass:

1. `supabase link` to the production project.
2. `supabase db push`, which applies any new migrations to production.
3. The schema-drift check (`supabase db diff --linked`).
4. The Vercel deploy hook, which starts the production deployment.

None of it can run locally. Every step needs the project's secrets
(`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`,
`VERCEL_DEPLOY_HOOK_URL`), which exist only in GitHub Actions, and every step
acts on production. Tier 2's `supabase start` applies the same migrations to a
fresh local database. That shows they apply cleanly from scratch, not that
they apply on top of production's current state or that production hasn't
drifted.

## Path to production

1. Push (or merge a PR) to `main`.
2. GitHub Actions runs install, lint, typecheck, test, and build (`build`
   job) on every push and pull request. A separate `rls-tests` job does
   the same for the RLS policy suite (see above) — also on every push and
   PR, not just `main`, since it needs no production secrets.
3. **Only on push to `main`**, and only after both `build` and `rls-tests`
   pass (`needs: [build, rls-tests]`), the `migrate` job runs: links to
   the production Supabase project, runs `supabase db push` (applies any
   migration in `supabase/migrations/` not yet applied there — a failing
   migration fails the job), then a schema drift check (fails the job if
   the remote schema no longer matches what the migrations describe,
   which usually means someone edited the Supabase dashboard directly
   instead of writing a migration).
4. **Only after that succeeds**, `migrate`'s last step calls a Vercel
   Deploy Hook, which is what actually starts the production build and
   deployment. Vercel's own automatic git-triggered deploy is disabled for
   `main` (`vercel.json`'s `git.deploymentEnabled.main: false`) precisely
   so this is the *only* path a production deployment can start from —
   this closes the race named in Sprint 2 and left open through Sprint 4:
   code could reach production before, or without, its migration.
5. Vercel builds using the same Node version and build command as CI.
6. `/api/health/db` on production reports connectivity, the latest applied
   migration version (from `public.schema_migrations`), and the deployed
   commit SHA (full and short) read from `VERCEL_GIT_COMMIT_SHA` via
   `lib/deployed-commit.ts` — that's how you confirm which commit and
   which migration are live.

**The deployed-commit observable lives at `/api/health/db`, not on any
page.** It used to be `/`'s own content (Sprint 1), but Sprint 11 sends
`/` straight to `/chart` (see below), and a page nobody renders can't
display anything. Moving the SHA into the health endpoint — already
GroundTruth's other observable, and not a design surface — means a future
UI change can't silently take the observable down with it the way
redirecting `/` almost did the first time. `lib/deployed-commit.ts` itself
didn't move; only what reads it did.

### One-time setup for the deploy hook (external, dashboard)

`migrate`'s last step reads `secrets.VERCEL_DEPLOY_HOOK_URL`, which has to
be created once in the Vercel dashboard: Project Settings → Git → Deploy
Hooks, create one targeting the `main` branch, then add its URL as a
GitHub Actions repository secret of that exact name. Until this is done,
the `migrate` job's last step fails — which is the correct failure mode
(loud, not a silent no-deploy) given `main`'s automatic git deploy is now
off.

### Preview deployments

Only `main`'s automatic deploy is disabled. Every other branch still
deploys as a Vercel preview exactly as before, on every push — previews
are not gated on migrations, because previews don't get their own
database (see below) and there is nothing preview-specific for them to
migrate.

## Shared database (deliberate, Sprint 5)

Preview deployments and production share the same Supabase project.
There is no second, preview-only database.

This is a conscious trade, not an oversight. `readings` holds only public
test data anyone can create through a public form — no accounts, nothing
whose exposure or corruption matters at this stage. Isolating previews
would cost a second Supabase project, a second variable set, CI targeting
logic, and a second schema free to drift from the first — and it would
make every preview show an empty table right when it's being used to
review a change.

**Consequences worth knowing:**

- A preview writing bad or test data writes it into the same table
  production reads. Expected, not a bug — see `docs/RUNBOOK.md`.
- A preview built from a branch expecting a schema `main` doesn't have yet
  will fail against production's actual schema. Also expected: previews
  are reviewed against the current production schema, not a schema of
  their own.
- The one thing this depends on holding: **migrations only ever reach this
  shared database through the `migrate` job, which only runs on `main`**.
  A preview branch cannot apply a migration under any circumstance — see
  `lib/ci-guardrails.test.ts`, which fails if that restriction is ever
  loosened. With no database isolation, this is the only remaining
  barrier between an unreviewed branch and production's schema.

**This changes if:** the app gets real user data, more than one
practitioner, or anything with an actual privacy surface. At that point
preview isolation stops being optional and this section needs to be
rewritten, not just amended.

## Migrations: expand, then contract

Standing rule for every migration from here on, not just the ones in this
sprint: a migration must leave the schema **compatible with the
application version currently running**, not just the version being
deployed alongside it.

Concretely: add a new column as nullable (or with a default) before any
code depends on it being required; add a new table before code writes to
it; don't drop a column or table until no deployed version of the app
still reads it. Never combine "add the new shape" and "remove the old
shape" in one migration.

Why: rollback (see `docs/RUNBOOK.md`) rolls back the *application*, not
the database — migrations aren't reverse-migrated as part of a rollback,
they're forward-fixed if they need undoing at all. If a migration already
dropped something the previous app version depends on, rolling the app
back doesn't fix anything; it just moves which version is broken.
