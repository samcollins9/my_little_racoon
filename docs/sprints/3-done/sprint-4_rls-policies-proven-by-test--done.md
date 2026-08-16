---
id: 4
title: "RLS policies proven by test"
epic: "Deployment Lifecycle"
status: done
created: 2026-08-15T20:07:45+00:00
---

# Master Controller Sprint Definition — Sprint 4

**Epic:** Deployment Lifecycle
**Sprint Objective:** Write row level security policies for anonymous, link-addressed readings and prove them with an automated test suite in CI, including a test that fails if any future table ships without RLS enabled.

### Context

**Re-scoped 16 Aug 2026.** This sprint originally specified owner-only policies
matching `auth.uid()` against `user_id`. Authentication has been cut from the
exercise, so there is no owner. The sprint survives re-scoped rather than cut,
because removing accounts makes RLS *more* load-bearing, not less.

A public app ships the Supabase anon key in the client bundle — that is the
documented design, not a leak. Without correct policies, anyone who opens devtools
can read, write, and delete every row through the REST API. "Public app, anon key
in the bundle, RLS is the only thing between you and a data breach" is the sharpest
version of the lesson this sprint exists to teach, and it is sharper than the
owner-only version it replaces.

Two tests matter more than the policies. One proves a reading cannot be enumerated
— that the anon role cannot list the table. The other enumerates every table in the
public schema and fails if any has RLS disabled, so the sprint protects tables that
do not exist yet. That is the only version of this protection that keeps working.

### Requirements

1. Policies on `readings`, delivered as a migration, implementing exactly this
   access model for the `anon` role: insert permitted; select permitted **only** for
   a row whose id is supplied explicitly; update and delete denied outright.
2. No policy may permit an unfiltered select. Retrieval is by id only — a reading is
   reachable by its link and by nothing else.
3. Reading ids are unguessable. A sequential or otherwise enumerable id makes every
   policy above cosmetic, since the link *is* the access control.
4. An automated test suite covering, at minimum: an anon client cannot list rows;
   an anon client can retrieve a known id; an anon client cannot update or delete an
   existing row; an anon client can insert; a random unguessed id returns nothing.
5. A test that enumerates every table in the `public` schema and fails if any has
   row level security disabled.
6. The suite runs against the local Supabase stack in CI, and failure fails the build.
7. All tests use the anon client. **No test may use the service role key**, which
   bypasses RLS and would make the entire suite pass vacuously.
8. No trace of the aborted Sprint 3 remains: no `user_id` column, no
   `20260816131120_add_user_id_to_readings.sql`, no session proxy, no sign-in or
   account routes. **Amended 16 Aug 2026 after checking production.** This
   originally required a migration to drop `user_id`. That is wrong here — the
   adding migration never reached production (the live health endpoint reports
   `20260816125144` as the applied version, and commit `0251e99` is on no remote),
   so the file is deleted outright rather than cancelled by a second migration. The
   forward-only rule protects migrations that have been *applied*; encoding a drop
   of a column production never had would write a fiction into the history. Local
   stacks that applied it need `supabase db reset`.
9. `README.md` documents how to run the policy tests and what each class protects.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1/R2: policies are defined in a new timestamped migration. **No policy uses
  `true` as its select condition**, and none permits an unfiltered listing. This
  fails on sight regardless of intent — an unfiltered select makes every other
  requirement here decorative.
- R3: ids are generated from a cryptographically unguessable source. A sequential
  integer or a timestamp-derived id fails this.
- R4: every listed case is present as a distinct test with a real assertion.
- R5: the all-tables test queries the catalogue rather than listing table names by
  hand — a hardcoded list stops protecting anything the moment a table is added.
- R7: **the criterion most worth checking directly.** A grep of the test sources
  shows no reference to the service role key. A suite that uses it passes every
  test while proving nothing, which is worse than no suite because it ends the
  conversation.
- R8: `user_id` is removed by migration, not by editing an existing migration file.
- R9: `README.md` covers both documented items.

**GroundTruth — live, after Pipeman pushes:**

- A request to the `readings` REST endpoint on production, carrying the public anon
  key with no filter, returns zero rows rather than the table. **This is the
  sprint's actual proof**, and it must be performed against production with a real
  anon key rather than inferred from the test suite passing. It also collects the
  deny-all check carried since Sprint 2, which has never been verified live.
- A reading retrieved by its own id succeeds.
- An attempt to update or delete an existing reading with the anon key is refused.

### Out of Scope

- Authentication in any form. Cut from the exercise on 16 Aug 2026; `docs/PRD_v1.md`
  retains it as standing product intent for a later build.
- Preview and branch databases, and rollback — Sprint 5.
- Rate limiting and abuse prevention on the public insert path. Real for a public
  product, out of scope for a proof of concept, and named here so its absence is a
  decision rather than an oversight.
- Any UI for creating or listing readings — Sprints 9 and 10.
- Performance tuning of policies or indexes.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Sprint 10, which persists readings under these policies. Nothing may
  write data before this sprint closes.
- **Blocked by:** removal of Sprint 3's authentication code from `main`. The sprint
  itself is already aborted, but commit `0251e99` still sits unpushed on local
  `main`. Writing policies against a schema that still carries `user_id`, behind a
  proxy that still refreshes sessions, would be writing against a dead concept.
- **External:** The anon key, for GroundTruth's live check. Readable in the Supabase
  dashboard under Settings → API; it cannot be read back from Vercel, where it is
  marked Sensitive.

### Risks & Mitigations

- **Tests run with the service role key and pass vacuously.** The most dangerous
  outcome available here: a green suite that proves nothing. — R7, checked by QA1 as
  a direct grep.
- **A permissive select policy added to unblock development.** With RLS on and no
  working policy, nothing reads, which looks broken to anyone who does not know that
  is intended. `using (true)` makes the symptom vanish and reads like a real policy
  in a diff scanned quickly. — R1's acceptance criterion names it as an automatic
  failure.
- **Enumerable ids.** Every policy here rests on the id being unguessable, because
  the link is the access control. A sequential id means anyone can walk the whole
  table one request at a time while every policy reports correct. — R3.
- **The all-tables test hardcodes a list.** It passes today and silently stops
  protecting anything the first time a table is added. — R5 requires a catalogue query.
- **Policies correct locally, absent in production.** — They arrive by migration
  through Sprint 2's pipeline; the drift check catches divergence, and GroundTruth's
  anon-key check catches it from outside.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned.
