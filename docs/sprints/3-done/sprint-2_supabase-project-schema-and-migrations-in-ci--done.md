---
id: 2
title: "Supabase project, schema, and migrations in CI"
epic: "Deployment Lifecycle"
status: done
created: 2026-08-15T20:04:43+00:00
---

# Master Controller Sprint Definition — Sprint 2

**Epic:** Deployment Lifecycle
**Sprint Objective:** Put the database schema under version control and make CI the only thing that applies it, so that a migration written in the repository reaches production on push and that fact is observable from outside.

### Context

Sprint 1 proved that code reaches production. This sprint proves that *schema*
does, which is the harder half and the one that rots quietly. The failure mode
here is not dramatic: it is someone making a change in the Supabase dashboard
because it is faster, and the repository slowly ceasing to describe the running
system. By the time that matters, nobody can tell which is correct. R6's drift
check exists to make the habit enforceable rather than aspirational.

Two boundaries get drawn this sprint and both are load-bearing for everything
after. The first is the key boundary: the anon key is public by design and belongs
in the client, the service role key bypasses RLS entirely and must never leave the
server. The second is that `readings` ships with RLS **enabled and no policies** —
the deny-all default. Sprint 4 writes the real policies and the tests that prove
them; this sprint's job is to ensure there is never a window in which the table
exists and is reachable. A table that is public because nobody got to RLS yet is
exactly the outcome this ordering prevents.

### Requirements

1. A Supabase project provisioned and connected through environment variables:
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as public values,
   `SUPABASE_SERVICE_ROLE_KEY` as a server-only secret.
2. Supabase CLI added as a dev dependency with `supabase/config.toml` committed,
   and a working local stack (`supabase start`) that applies the repository's
   migrations to a local database.
3. All migrations live in `supabase/migrations/`, timestamped and ordered, in
   version control. No schema DDL exists anywhere else in the repository.
4. The first migration creates a `readings` table — `id`, `event_date`,
   `event_time` (nullable), `place_name`, `latitude`, `longitude`, `timezone`,
   `created_at` — with **row level security enabled and zero policies defined**.
5. CI applies migrations to the production Supabase project on push to `main`, and
   fails the build if a migration fails. The workflow reads exactly these GitHub
   Actions secret names, which are already set: `SUPABASE_ACCESS_TOKEN`,
   `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`.
6. CI runs a schema drift check that fails if the remote schema does not match the
   migrations in the repository.
7. A server-side `/api/health/db` route reporting database connectivity and the
   latest applied migration version, using the service role key. It returns a
   status payload rather than a 500 when the schema is absent or behind.
8. `SUPABASE_SERVICE_ROLE_KEY` never reaches the client bundle: not
   `NEXT_PUBLIC_`-prefixed, and referenced only from server-only modules.
9. `.env.example` updated with every new variable, each marked public or secret.
   `README.md` updated with local setup, how to author a migration, and how a
   migration reaches production.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R2/R3: `supabase/config.toml` and at least one timestamped migration are
  committed under `supabase/migrations/`, and no `CREATE TABLE`, `ALTER TABLE`, or
  equivalent DDL appears anywhere outside that directory.
- R4: the migration creates `readings` with the listed columns, contains
  `enable row level security`, and defines **no** policy. A policy appearing in
  this sprint is a scope violation, not a bonus.
- R5: the CI workflow applies migrations, is gated to `main`, and fails the job on
  migration error rather than continuing.
- R6: a drift-check step exists and fails the job on mismatch.
- R7: the health route is server-only, and its error handling returns a status
  payload on a missing or outdated schema rather than throwing.
- R8: `SUPABASE_SERVICE_ROLE_KEY` is not `NEXT_PUBLIC_`-prefixed, and a grep of the
  diff shows it referenced only in server-only modules — never in a client
  component, and never in shared code a client component imports.
- R9: `.env.example` lists every new variable with a public/secret marking and no
  real values; no key, token, or connection string appears anywhere in the diff.
  `README.md` covers all three documented items.

**GroundTruth — live, after Pipeman pushes:**

- The commit SHA displayed on the page has changed from Sprint 1's deployed commit
  `53bc88c`, with no manual intervention. **Inherited from Sprint 1's amendment.**
  A push to `main` rebuilding and redeploying production is the code half of the
  pipeline proof; this sprint's ship is the first second push, so it is verified
  here rather than manufactured there.
- `/api/health/db` on production reports the database as connected.
- The migration version it reports matches the newest file in
  `supabase/migrations/`.
- A trivial second migration, committed and pushed, changes the reported version
  with no manual database work of any kind. **This is the sprint's actual proof** —
  the rest describes a repository, this describes schema that deploys itself.

### Out of Scope

- Authentication — Sprint 3. `readings` deliberately ships **without** a `user_id`
  column; adding it in Sprint 3 is a wanted demonstration that the migration chain
  evolves a live schema, not an omission to be helpfully pre-empted.
- RLS *policies* and the RLS test suite — Sprint 4. This sprint enables RLS and
  stops there.
- Preview and branch databases — Sprint 5.
- Guaranteed ordering between the Vercel deploy and the migration job — Sprint 5.
  R7's graceful degradation is the interim answer, not a fix.
- Migration rollback procedure — Sprint 5.
- Any UI that reads or writes `readings` — Sprints 9 and 10.
- Astrology and domain columns beyond the minimal set in R4. Later migrations add
  them; that is what migrations are for.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Sprint 3, Sprint 4, and everything downstream. No data work is
  possible until schema deploys.
- **Blocked by:** Sprint 1 complete. This sprint extends that CI workflow and that
  application; starting before it lands means building against a moving target.
- **External:** All complete as of 15 Aug 2026 — the Supabase project exists, the
  GitHub Actions secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` and
  `SUPABASE_PROJECT_REF` are set, and `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel
  for both Production and Preview. **Use these names exactly.** They were configured
  before the workflow was written, so a workflow referencing a different spelling
  fails with what looks like an authentication error rather than a naming one.
  Neither Dev Team nor QA1 can see these settings to check them.

### Risks & Mitigations

- **The service role key reaches the client bundle.** By far the worst outcome
  available in this sprint: it bypasses RLS entirely, so it hands every future
  policy's protection to anyone who opens devtools. — R8, plus QA1 grepping the
  diff as a named check rather than forming a general impression.
- **Deploy and migration race.** Vercel deploys on push and CI migrates on push;
  nothing orders them, so the app can be live against a schema that does not exist
  yet. — R7 requires the health route to report rather than crash. The real
  ordering guarantee is Sprint 5's work. Named here so it is a known deferral
  rather than a surprise.
- **Schema drift from dashboard edits.** The dashboard is faster in the moment and
  that is exactly why it wins. Once the repo and the database disagree, neither can
  be trusted. — R6's drift check, failing the build, so the fast path stops working.
- **Someone adds a permissive policy to "make it work".** With RLS on and no
  policies, nothing can read the table, which looks broken to anyone who does not
  know that is intended. — Stated as the intended end state in R4 and in the
  acceptance criterion, and nothing in this sprint needs to read the table.
- **CI secrets not configured before first push.** The migration job fails on its
  first run and looks like a code defect. — Named as an external dependency above
  and called out at handoff.
- **`supabase start` requires Docker.** A machine without it cannot run the local
  stack. — Document the remote-development alternative in the README, but keep the
  local stack as the default path.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned. Epic A remains strictly sequential — Sprint 3 needs
  this schema, Sprint 4 needs Sprint 3's users. No worktree needed.
