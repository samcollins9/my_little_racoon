---
id: 36
title: "One verify command with an explicit exit code"
epic: "Operability"
status: done
created: 2026-11-23T03:13:07+00:00
---

# Master Controller Sprint Definition — Sprint 36

**Epic:** Operability. The project's own checks and pipeline should fail loudly and
unmistakably, never quietly.

**Sprint Objective:** One command, `npm run verify`, runs every local check CI's
`build` job runs, stops at the first failure, and ends with a single unambiguous line
that states the result and the exit code.

### Context

Sprint 34 reached Pipeman with a lint error in a new test file. Both Dev Team 1 and
QA1 reported lint as clean, and both have since said why: each read only the last
line of the output and didn't check the exit code. CI's `build` job failed on lint,
which blocked the ship and left `origin/main` on a red commit. Production wasn't
affected, but a full fix loop was spent on something a local command would have
caught.

The user chose, on 23 Nov 2026, a script plus a rule:
- **This sprint** adds the script.
- **Master Controller has already added the rule** to CLAUDE.md's project standards.
  Every handoff quotes the exit code of each check, and QA1 treats a missing or
  non-zero code as a FAIL. Once this sprint ships, that means quoting
  `npm run verify` and its exit code.

**Prior record checked (planning rule 11).** Sprint 26 wrote the README's "Local
validation" section, listing Tier 1 as CI's `build` job steps in order. Sprint 34's
Pipeman report and Dev Team 1's follow-up identify the cause. No measurement of
ESLint's output format is relied on: R2 makes the exit code, not the output text,
the source of truth.

### Requirements

1. **`npm run verify` runs, in order:** lint, typecheck, test and build. These are
   exactly the steps of `.github/workflows/ci.yml`'s `build` job, in CI's own order.
   - If CI's order differs from the one listed here, follow CI's and say so in the
     handoff.
   - It needs no Docker, no `.env.local` and no Supabase, the same as README Tier 1.
2. **It stops at the first failure,** and it exits with that step's non-zero code,
   or 1 if that isn't available.
3. **It ends with one result line,** printed last, on both success and failure:
   - on success: `VERIFY PASS (lint, typecheck, test, build) exit=0`;
   - on failure: `VERIFY FAIL at <step> exit=<n>`.

   Each step's own output streams through unchanged. Nothing is silenced or
   filtered.
4. **No new dependencies.** It's a `package.json` script, or a small Node script under
   `scripts/` that package.json calls. If it's under `scripts/`, use a name that can't
   collide with the framework's own files there (for example
   `scripts/project-verify.js`), and don't modify any framework-installed file.
5. **The README's "Local validation" section** documents `npm run verify` as the way
   to run Tier 1, including the result line and the rule that the exit code is the
   evidence. Fold in the deferred wording nit at about line 207 ("every test fails with…"; first noted at line 192 in Sprint 26) while
   you're in that section, since it's the same section and a docs-only change.
6. **CI is unchanged.** Its separate steps already fail on exit code, and changing CI
   is out of scope.
7. **Tests or evidence for R2–R3.** Show all three of these in the handoff, by tests
   or by recorded runs:
   - a clean tree prints `VERIFY PASS … exit=0`, and `echo $?` shows 0;
   - a deliberately introduced lint error, made in a scratch copy or reverted
     afterwards and **never committed**, prints `VERIFY FAIL at lint exit=<n>` with a
     non-zero `$?`, and typecheck, test and build don't run;
   - a deliberately failing test does the same at `test`.

### Acceptance Criteria

**QA1 (static):**
- **R1:** the step order matches `ci.yml`'s `build` job.
- **R2–R3:** read the script. Failure propagates the exit code, and nothing
  swallows it: no `|| true`, and no pipe into `tail` or `grep` that would replace
  the exit status. The result line prints in both paths.
- **R4:** `package-lock.json` has no dependency changes, and no framework file
  changed.
- **R5:** the README section is updated, and the "every test fails" wording nit is fixed.
- **R7:**
  - The three recorded runs, or tests, are in the handoff, each with its `$?`.
  - `git log` shows no commit containing the deliberate failures.
  - By the new CLAUDE.md rule, the handoff's own evidence is `npm run verify`'s
    result line with `exit=0`.

**LiveQA:** nothing is deployed that changes app behaviour, so the live surface is
the published repository plus CI.
1. From a fresh clone of `origin/main` at the shipped commit, run `npm ci` and then
   `npm run verify`. It ends `VERIFY PASS … exit=0`, and `$?` is 0.
2. In that scratch clone only, introduce a lint error and run it again. You get
   `VERIFY FAIL at lint` with a non-zero `$?`. Discard the clone afterwards.
3. CI's run for the shipped commit is green, and production's `/api/health/db` still
   responds with the new commit after deploy.

### Out of Scope
- **Changing CI** (R6).
- **Running the RLS suite in `verify`.** It needs Docker. That's README Tier 2, which
  stays separate.
- **Editing framework agent files** (`.claude/agents/*`). The rule lives in CLAUDE.md's
  project standards, which is the section meant for project rules.

### Dependencies
- Blocks: none.
- Blocked by: none.
- Independent of Sprint 35, which only changes two strings and their tests.
- External: none.

### Human Prerequisites
- None.

### Team Assignments
- **Dev Team 1:** the whole sprint, or Sprint 35 first and then this one.
- **Dev Team 2:** this sprint, if it runs in parallel with Sprint 35, after
  `/sprint-worktree 36`.

### Risks & Mitigations
- **A deliberate failure from R7 gets committed.** R7 requires a scratch copy or a
  revert, and QA1 checks `git log`.
- **The script hides the exit code** behind a pipe. QA1's R2 check, and LiveQA step 2.
- **The rule gets ignored anyway.** QA1 is now required to FAIL a handoff without an
  exit code, which turns a habit into a check.
