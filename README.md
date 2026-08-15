# Retroactive Horoscope

A Next.js + TypeScript app deployed on Vercel, with a Supabase database
migrated by CI. This repository is currently the deployment-lifecycle
walking skeleton (Sprints 1–2) — see `docs/ROADMAP_v1.md` for the full plan.
The app itself is intentionally minimal right now: the point of these
sprints is a proven path from a push to `main` to a live production
database schema, not product functionality.

## Local setup

Use Node 22 (pinned in `.nvmrc` and `package.json` `engines`).

```bash
nvm use        # or otherwise ensure Node 22.x
npm install
npm run dev    # http://localhost:3000
```

The page at `/` needs no environment variables — see `.env.example` for the
one variable it reads and why it's fine to leave unset locally.

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

## CI commands

Also see `.github/workflows/ci.yml`. Run any of these locally before pushing:

```bash
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run test        # vitest run
npm run build        # next build — the same command Vercel runs
```

## Path to production

1. Push (or merge a PR) to `main`.
2. GitHub Actions runs install, lint, typecheck, test, and build on every
   push and pull request. A red run blocks confidence in the deploy, though
   it does not itself gate the Vercel deployment.
3. Vercel is connected to this repository's `main` branch and deploys to
   production automatically on push, using the same Node version and build
   command as CI.
4. The production page reads `VERCEL_GIT_COMMIT_SHA`, set automatically by
   Vercel, and displays it — that's how you confirm which commit is live.
5. On push to `main` only (never on a pull request), a separate `migrate`
   CI job links to the production Supabase project and runs
   `supabase db push`, which applies any migration in
   `supabase/migrations/` not yet applied there. A failing migration fails
   this job. It then runs a schema drift check that fails the job if the
   remote schema no longer matches what the migrations describe — the
   usual cause is a change made directly in the Supabase dashboard instead
   of through a migration file.
6. `/api/health/db` on production reports connectivity and the latest
   applied migration version, read from `public.schema_migrations` — that's
   how you confirm which migration is live, the same way the homepage's
   commit SHA confirms which code is live.
