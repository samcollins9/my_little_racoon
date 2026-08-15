---
id: 4
title: "RLS policies proven by test"
epic: "Deployment Lifecycle"
status: todo
created: 2026-08-15T20:07:45+00:00
---

# Master Controller Sprint Definition — Sprint 4

**Epic:** Deployment Lifecycle
**Sprint Objective:** Write owner-only row level security policies for `readings` and prove them with an automated test suite that runs in CI, including a test that fails if any future table ships without RLS enabled.

### Context

Supabase's sharpest edge is that a table with RLS disabled is readable by anyone
holding the anon key, and the anon key is in the client bundle by design. That is
not a bug, it is the documented model — which is exactly why it catches people. The
defence that survives contact with a growing schema is not care; it is a test that
fails.

Two tests matter more than the policies themselves. One asserts that a signed-out
client can read nothing. The other enumerates every table in the public schema and
fails if any has RLS disabled — so the sprint protects tables that do not exist
yet, which is the only version of this protection that keeps working.

### Requirements

1. Owner-only policies on `readings` for select, insert, update, and delete,
   matching `auth.uid()` against `user_id`, delivered as a migration.
2. An automated test suite covering, at minimum: a signed-out client reads zero
   rows; user A cannot read, update, or delete user B's rows; the owner can perform
   all four operations on their own rows; an insert cannot set `user_id` to another
   user.
3. A test that enumerates every table in the `public` schema and fails if any has
   row level security disabled.
4. The test suite runs against the local Supabase stack in CI, and failure fails
   the build.
5. All policy tests use anon or authenticated user clients. **No test may use the
   service role key**, which bypasses RLS and would make the entire suite pass
   vacuously.
6. `README.md` documents how to run the policy tests locally and what each class of
   test protects.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: policies are defined in a new timestamped migration, cover all four
  operations, and compare `auth.uid()` to `user_id`. A policy using `true` as its
  condition fails this criterion regardless of intent.
- R2: every listed case is present as a distinct test with a real assertion.
- R3: the all-tables RLS test queries the catalogue rather than listing table names
  by hand — a hardcoded list stops protecting anything the moment a table is added.
- R4: CI runs the suite and fails the build on failure.
- R5: a grep of the test sources shows no reference to the service role key. This
  is the criterion most worth checking directly, because a suite that uses it
  passes every test while proving nothing.
- R6: `README.md` covers both documented items.

**GroundTruth — live, after Pipeman pushes:**

- Signed in on production as the practitioner, the app shows that user's readings
  and no others.
- A direct request to the `readings` REST endpoint using the public anon key,
  unauthenticated, returns zero rows rather than data. **This is the sprint's actual
  proof**, and it must be performed against production rather than inferred from
  the test suite passing.

### Out of Scope

- Preview and branch databases — Sprint 5.
- Rollback — Sprint 5.
- Any UI for creating or listing readings — Sprints 9 and 10. This sprint's live
  verification may use directly-inserted rows.
- Roles, permissions, sharing, or any policy expressing anything other than
  ownership.
- Performance tuning of policies or indexes.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Sprint 10, which persists readings under these policies. Nothing may
  write user data before this sprint closes.
- **Blocked by:** Sprint 3. Policies need real users to be tested against.
- **External:** None. Everything in this sprint is code, migrations, and tests.

### Risks & Mitigations

- **Tests run with the service role key and pass vacuously.** The most dangerous
  outcome available here: a green suite that proves nothing, which is worse than no
  suite because it ends the conversation. — R5, checked by QA1 as a direct grep.
- **The all-tables test hardcodes a list.** It passes today and silently stops
  protecting anything the first time a table is added. — R3 requires a catalogue
  query.
- **A permissive policy added to unblock development.** A `using (true)` policy
  makes symptoms disappear and looks like a working policy in a diff read quickly.
  — Named in R1's acceptance criterion as an automatic failure.
- **Policies correct locally, absent in production.** They arrive by migration
  through the Sprint 2 pipeline, so this is only a risk if someone applies them by
  hand. — Sprint 2's drift check catches it; GroundTruth's anon-key check catches it
  from the outside.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned.
