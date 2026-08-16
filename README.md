# Retroactive Horoscope

A Next.js + TypeScript app deployed on Vercel, with a Supabase database
migrated by CI and Supabase Auth for a single practitioner. This
repository is currently the deployment-lifecycle walking skeleton
(Sprints 1–3) — see `docs/ROADMAP_v1.md` for the full plan. The app itself
is intentionally minimal right now: the point of these sprints is a proven
path from a push to `main` to a live, authenticated production app, not
product functionality.

## Local setup

Use Node 22 (pinned in `.nvmrc` and `package.json` `engines`).

```bash
nvm use        # or otherwise ensure Node 22.x
npm install
npm run dev    # http://localhost:3000
```

The page at `/` needs no environment variables — see `.env.example` for the
one variable it reads and why it's fine to leave unset locally.

`/api/health/db`, `/sign-in`, and `/account` do need Supabase configured.
For local development:

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

## Authentication

Email and password, single practitioner. Sign-up is disabled everywhere
(`supabase/config.toml`'s `[auth]` and `[auth.email]` `enable_signup`, and
the same setting must be turned off for the hosted project in the
dashboard — the CLI's `config.toml` only governs the local stack, it is
not pushed to the hosted project automatically). There is no sign-up
route or form anywhere in this app, by design.

### Creating the practitioner account

Since sign-up is disabled, the one account has to be created directly:

1. Supabase dashboard → Authentication → Users → **Add user**.
2. Create it with **Auto Confirm User** on (email confirmation is disabled
   project-wide anyway — `[auth.email] enable_confirmations = false`).
3. Sign in with those credentials at `/sign-in` in any environment.

### Redirect URLs per environment

Supabase's redirect allowlist (Authentication → URL Configuration in the
dashboard) is a separate, hosted-project setting from
`supabase/config.toml`'s `additional_redirect_urls`, which only applies to
the local stack. Configure all three there:

| Environment | Entry |
|---|---|
| Local | Already set in `supabase/config.toml`; nothing to do in the dashboard. |
| Production | `https://my-little-racoon.vercel.app/**` |
| Preview | `https://my-little-racoon-*.vercel.app/**` |

The preview entry is a wildcard because every Vercel preview deployment
gets a new hostname — but it's scoped to hostnames starting with
`my-little-racoon-`, not a bare `*.vercel.app` or `*`. That's the R5
requirement: it has to cover Vercel's generated pattern without accepting
an arbitrary host. Confirm the exact prefix against this project's actual
Vercel preview URLs before relying on it — Vercel's naming can vary by
team/org configuration.

Auth doesn't get verified against a preview deployment this sprint (see
`docs/ROADMAP_v1.md` Sprint 5); the preview entry above is configured now
because retrofitting a redirect allowlist later is expensive, not because
anything tests it yet.

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
