---
id: 40
title: "README: export the service role key for local database tests"
epic: "Developer docs"
status: todo
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
3. **Shell only.** The README says that the key goes into the shell environment, never into `.env.local`. It also says the key exported here is the throwaway local stack's well-known demo key, not production's.
4. **Docs only.** No file other than `README.md` changes, apart from the committed handoff (`docs/handoffs/sprint-40.md`, per CLAUDE.md).
5. **Evidence.** The handoff records a real run of the corrected recipe: `npx supabase start`, the export, `npm run test:rls` with its exit code (`exit=0`), and `npx supabase stop`. Each exit code is read directly, never through a pipe, as the CLAUDE.md standard requires. It also records `npm run verify`'s final line with `exit=0`.

### Acceptance Criteria

- **R1:**
  - The recipe's `--override-name` lines match `ci.yml`'s, character for character, for all three variables.
  - The filter keeps `SUPABASE_SERVICE_ROLE_KEY`, not only variables starting `NEXT_PUBLIC_`.
  - QA1 runs the recipe's export line against `npx supabase status -o env` output, or reasons through it from that command's documented output, and confirms all three variables would be set.
- **R2:** Exactly one complete recipe exists in the README, or the second section links to it. Grep finds no recipe that runs `npm run test:rls` without the export having been done.
- **R3:** The wording is present. Grep finds no instruction to put `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
- **R4:** `git diff --stat` for the sprint touches only `README.md` and `docs/handoffs/`.
- **R5:** The handoff shows `test:rls` with `exit=0`, from a run that followed the README's text as written.

**LiveQA:** in a fresh shell, with no variables set beforehand and no `.env.local`, follow the README's recipe exactly as written, with Docker running. Record each command's exit code. If Docker isn't available, try to start it first (`sudo service docker start`, or Docker Desktop), and record what was tried before reporting it as blocked.

### Out of Scope

- Any change to `ci.yml`, the tests or app code.
- Anything else in the README, such as the "Running the built app locally" route list. Sprint 41 edits that list.

### Dependencies

- **Blocks:** Sprint 41, which also edits `README.md`. Run this one first.
- **Blocked by:** nothing.
- **External:** the Supabase CLI, version pinned in the project. Docker is needed for the evidence run.

### Human Prerequisites

None. Docker runs on this machine, and the stack is local.

### Team Assignments

- **Dev Team 1:** all of it.
- **Dev Team 2:** not assigned. Sprint 41 shares `README.md`, so the two aren't independent.

### Risks & Mitigations

- **The key ends up in `.env.local` after all.** A reader might "fix" their setup by pasting the key into `.env.local`, which the project forbids. — Requirement 3 states the rule where the reader is looking.
- **CI's step changes again.** The README drifts again if CI changes. — The README quotes CI's mapping, and points to the step by name.
