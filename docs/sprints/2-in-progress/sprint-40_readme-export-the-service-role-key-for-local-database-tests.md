---
id: 40
title: "README: export the service role key for local database tests"
epic: "Developer docs"
status: in_progress
created: 2026-11-24T00:27:12+00:00
---

# Master Controller Sprint Definition — Sprint 40

**Epic:** Developer docs
**Sprint Objective:** Following the README's own steps runs the database policy tests locally, exactly as CI does.

### Context

Since Sprint 28's R12, the RLS suites create their test rows with the service role client (`supabase/tests/clients.ts`). CI exports `SUPABASE_SERVICE_ROLE_KEY` from the local stack for this (`.github/workflows/ci.yml`, the "Export local stack URL/anon key/service role key" step). The README's local instructions never caught up:
- The Tier 2 recipe under "Local validation" (around line 220) keeps only `NEXT_PUBLIC_SUPABASE_*` variables, so the service role key is filtered out.
- "Running the policy tests" (around line 142) gives a two-command recipe with no export at all.

Anyone following either recipe gets a failing run. This came up during Sprint 38 and was confirmed by Master Controller against `ci.yml` on 23 Nov 2026.

This can't use the fast lane, because `README.md` isn't a component or style file.

### Requirements

1. **Tier 2 recipe.** The recipe under "Local validation" exports `SUPABASE_SERVICE_ROLE_KEY`, alongside the two existing variables, using the same `--override-name` mapping as CI (`auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY`). The prose after it names all three variables, and the description of CI's step uses that step's current name.
2. **The policy-tests section.** "Running the policy tests" either includes the same export, or points to the Tier 2 recipe as the one to use, instead of offering a two-command recipe that can't work. Either is acceptable; there must not be two different working recipes.
3. **Why the shell, and which key.** *(Amended 24 Nov 2026, after Dev Team 1 found the first version contradicted "Local setup", which correctly puts the **local** stack's key in `.env.local` for the app. Master Controller's error: the project's rule is about **production's** key, not the local demo key.)*
   - **Policy tests:** the recipe says the key is exported into the shell because Vitest doesn't load `.env.local`. A key that is already in `.env.local` doesn't reach the tests.
   - **Which key:** both the recipe and "Local setup" say plainly that the key used locally is the local stack's well-known demo key, printed by `npx supabase start`. **Production's** service role key is never put in `.env.local`, or anywhere else on a developer machine.
   - **Allowed edit to "Local setup":** one sentence there (around lines 88–90) is in scope to say this. Its existing instruction to copy the local key into `.env.local` stays, because the app needs it there (`lib/supabase/admin.ts`).
4. **Docs only.** No file other than `README.md` changes, apart from the committed handoff (`docs/handoffs/sprint-40.md`, per CLAUDE.md).
5. **Evidence.** The handoff records a real run of the corrected recipe: `npx supabase start`, the export, `npm run test:rls` with its exit code (`exit=0`), and `npx supabase stop`. Each exit code is read directly, never through a pipe, as the CLAUDE.md standard requires. It also records `npm run verify`'s final line with `exit=0`. *(Amended 24 Nov 2026: the run includes Requirement 6's `npx supabase db reset`, straight after `start`.)*

*Requirements 6–8 were added on 24 Nov 2026, after Dev Team 1's first evidence run. The cause it found: `supabase start` restored an August database volume, holding 8 of 12 migrations. `start` applies migrations only when it creates a fresh database, and the recipe's own `stop` keeps the volume. So the recipe tested an out-of-date schema on any machine that had run it before. The user chose the reset fix in Dev Team 1's session.*

6. **Reset after start.** The Tier 2 recipe runs `npx supabase db reset` immediately after `npx supabase start`, so every migration is applied to a fresh local database, matching CI's always-fresh stack. A sentence beside it says that this **deletes all local data** in the local stack.
7. **No stale "start applies every migration" claims.** Every README statement that `supabase start` applies the migrations is corrected to say what actually happens: `start` applies them only when it creates a new database, and `db reset` reapplies them all. There are two known instances at commit `2ddb696`:
   - "Local setup", around lines 96–97: "`supabase start` applies every migration in `supabase/migrations/` to the local database automatically."
   - "What only CI can check", around line 310: "Tier 2's `supabase start` applies the same migrations to a…"

   Correcting these is in scope. That widens Requirement 3's one-sentence allowance for "Local setup" to this correction as well.
8. **"Which `.env.local` is which" (around line 288) matches Requirement 3.** Its current text tolerates a `.env.local` holding production's keys "deliberately", which contradicts Requirement 3 and the project's rule. It's rewritten to say three things:
   - A `.env.local` pointing at production may hold **only** the public URL and anon key, never production's service role key or OpenAI key.
   - With only those, the local app can read production but can't save or write horoscopes, because every write needs the service role key (Sprint 28, R12).
   - Delete the file afterwards, as now.

   This settles Dev Team 1's question 2 for QA1: as written, that section does contradict Requirement 3.

### Acceptance Criteria

- **R1:**
  - The recipe's `--override-name` lines match `ci.yml`'s, character for character, for all three variables.
  - The filter keeps `SUPABASE_SERVICE_ROLE_KEY`, not only variables starting `NEXT_PUBLIC_`.
  - QA1 runs the recipe's export line against `npx supabase status -o env` output, or reasons through it from that command's documented output, and confirms all three variables would be set.
- **R2:** Exactly one complete recipe exists in the README, or the second section links to it. Grep finds no recipe that runs `npm run test:rls` without the export having been done.
- **R3:**
  - The policy-test recipe explains the shell export by Vitest not loading `.env.local`.
  - Both the recipe and "Local setup" identify the key as the local stack's demo key, and say that production's key never goes in `.env.local`.
  - Grep finds no instruction anywhere in the README to put **production's** service role key (one from Vercel or the hosted Supabase project) in `.env.local`.
  - "Local setup"'s instruction to copy the local key into `.env.local` is still there.
- **R4:** `git diff --stat` for the sprint touches only `README.md` and `docs/handoffs/`.
- **R5:** The handoff shows `test:rls` with `exit=0`, from a run that followed the README's text as written, including `db reset`.
- **R6:**
  - `db reset` follows `start` in the recipe.
  - The data-loss sentence is present.
  - The evidence log shows `db reset` applying all of the repo's migrations. QA1 counts the files in `supabase/migrations/` at the audited commit and compares.
- **R7:** Grep finds no remaining claim that `start` alone applies every migration. Both named instances are corrected.
- **R8:**
  - The section names the URL and anon key as the only production values allowed in `.env.local`.
  - It says writes fail without the service role key.
  - Grep finds nothing anywhere in the README that tolerates production's service role or OpenAI key in `.env.local`.

**LiveQA:** in a fresh shell, with no variables set beforehand and no `.env.local`, follow the README's recipe exactly as written, with Docker running. Record each command's exit code. Docker comes from Docker Desktop's WSL integration (see Human Prerequisites). Check `docker info` first. If it fails, ask the user to start Docker Desktop with WSL integration on, and record what was tried before reporting it as blocked.

### Out of Scope

- Any change to `ci.yml`, the tests or app code.
- Anything else in the README, apart from what Requirements 3, 6, 7 and 8 name. In particular, the "Running the built app locally" route list is out of scope, because Sprint 41 edits it.

### Dependencies

- **Blocks:** Sprint 41, which also edits `README.md`. Run this one first.
- **Blocked by:** nothing.
- **External:** the Supabase CLI, version pinned in the project. Docker is needed for the evidence run.

### Human Prerequisites

*(Amended 24 Nov 2026. The first version said "None. Docker runs on this machine." Master Controller hadn't checked that. Dev Team 1 found the Docker Desktop CLI installed under `/mnt/c/...`, but `docker info` fails and there's no `/var/run/docker.sock` in this WSL distro.)*
- **The user starts Docker Desktop on Windows, with WSL integration turned on for this distro.** That's under Settings → Resources → WSL integration. Then confirm that `docker info` succeeds from the WSL shell.
- Dev Team needs this for Requirement 5's evidence run, and LiveQA needs it for its own run.
- Dev Team and LiveQA each try `docker info` first and record the result. If it still fails, they name what was tried. That doesn't turn Requirement 5 into an optional requirement: this sprint can't pass its gates without one real `npm run test:rls` run with `exit=0`.

### Team Assignments

- **Dev Team 1:** all of it.
- **Dev Team 2:** not assigned. Sprint 41 shares `README.md`, so the two aren't independent.

### Risks & Mitigations

- **Production's key ends up on a developer machine.** A reader might copy production's key from Vercel when Supabase's local stack is down. — Requirement 3 states, in both places a reader looks, that only the local demo key belongs in `.env.local`.
- **CI's step changes again.** The README drifts again if CI changes. — The README quotes CI's mapping, and points to the step by name.
