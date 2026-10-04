---
id: 26
title: "README local validation section"
epic: "Operability"
status: todo
created: 2026-10-04T21:31:34+00:00
---

# Master Controller Sprint Definition — Sprint 26

**Epic:** Operability
**Sprint Objective:** One README section, `## Local validation`, that tells anyone
with a fresh clone exactly what they can run locally to validate the codebase, what
each command needs, and what only CI can check. Every command in it has been
actually run, not assumed. Shipping it also confirms the pipeline end to end.

### Context

The user asked for a small change to commit and push as a pipeline check. A README
edit fails the fast lane's second criterion (the changed file must be a
`.tsx`/`.jsx`/`.css` component or style file), so it gets this sprint. The extra
process isn't wasted: a "how to validate locally" section is a list of claims that
commands work, so QA1 checks those claims against the code, and LiveQA follows the
section on a fresh clone.

The README already has pieces of this in three places: `## Local setup`,
`### Running the policy tests`, and a five-line `## CI commands` list. This sprint
**folds `## CI commands` into the new section** and leaves the other two where they
are, linking to them, so there's only one list of validation commands to keep
current. Two facts surveyed on 4 Oct shape the content:
- Docker Desktop is installed but not running on this machine. The RLS tests need
  it (`supabase start`).
- `.env.local` currently holds **production** Supabase values from Sprint 25. A
  local `npm run dev` with that file writes real rows to production, and nothing in
  the README says so. That was the source of confusion during Sprint 25.

### Requirements

1. **A `## Local validation` section in `README.md` replaces `## CI commands`.**
   The old heading and its code block are gone. Nothing else in the README links to
   `#ci-commands`; Dev Team confirms that before deleting the heading.
2. **Tier 1 — no network, no Docker, no `.env.local`:** `npm ci`, then `npm run
   lint`, `npm run typecheck`, `npm run test`, `npm run build`, listed in the same
   order as `.github/workflows/ci.yml`'s `build` job and described as the local
   equivalent of that job. The section says plainly what passing them shows and what
   it doesn't.
3. **Tier 2 — needs Docker:** `npx supabase start`, then `npm run test:rls`,
   described as the local equivalent of CI's `rls-tests` job. It links to the
   existing `### Running the policy tests` section, not repeating it.
4. **Running the built app locally:** `npm run build && npm run start`, and what you
   can check without any environment variables. State what `/chart` does with no
   env and what `/api/health/db` returns locally. Write down exactly what the
   commands showed when run; don't guess.
5. **What only CI can validate:** CI's `migrate` job (`supabase db push` against the
   linked project, the schema-drift check, and the deploy hook) can't be run
   locally, and the section says so and why: it needs the project's secrets.
6. **Which `.env.local` is which.** One short paragraph: a `.env.local` pointing at
   **local** Docker Supabase (from `## Local setup`) is the normal one. A
   `.env.local` holding **production** values means `npm run dev` reads and writes
   production data, so use one only deliberately, and delete it afterwards.
7. **Every command in the section has been run on this machine during the build,
   and the results are reported** in Dev Team's handoff to QA1: each command, pass
   or fail, and how long it roughly took. **Tier 1 and item 4 are run with
   `.env.local` moved aside**, because a fresh clone has no `.env.local`, and a
   pass that depended on it would be a false claim. Move it back afterwards (or
   delete it, see Out of Scope). **Tier 2:** try to start Docker Desktop first. If
   the RLS suite still can't be run, report what was tried and what failed, and the
   section must not claim tier 2 was verified.
8. **Only `README.md` changes**, apart from sprint bookkeeping. No version bump (this
   sprint publishes nothing).

### Acceptance Criteria

**QA1 — static:**
- R1: `## CI commands` is gone; `## Local validation` exists; `grep -rn
  "ci-commands"` across the repo finds nothing.
- R2/R3: every script named exists in `package.json` with the stated meaning; the
  tier 1 order matches `ci.yml`'s `build` job step by step; tier 2 matches the
  `rls-tests` job. Any statement about what a command checks agrees with the
  config (e.g. `vitest.config.ts` excluding `supabase/tests/**`).
- R4: whatever the section says `/chart` and `/api/health/db` do with no env agrees
  with the code (`lib/supabase/config.ts`, the health route's `misconfigured` branch,
  `lib/deployed-commit.ts`'s local marker) **and** with Dev Team's reported output.
  If the two disagree, that's a FAIL.
- R5: the CI-only list matches the `migrate` job's real steps.
- R7: Dev Team's report covers every command in the section, says tier 1 ran with
  `.env.local` moved aside, and gives an honest tier 2 outcome.
- R8: `git diff --stat` against the sprint's base shows `README.md` and sprint
  bookkeeping only.

**LiveQA — live, after Pipeman pushes:**
- **The pipeline check the user asked for:** CI is green for the pushed commit,
  including the `migrate` job. If `migrate` fails, check `/api/health/db` before
  anything else, since a paused Supabase looks exactly like a broken pipeline.
  `/api/health/db` reports `status: "ok"` with `commit.sha` equal to the pushed
  commit.
- **The README, followed literally:** `git clone` from origin into a throwaway
  directory with no `.env.local`, and run the tier 1 commands exactly as written,
  copied from the rendered README on GitHub, not from memory. Every one passes. Run
  item 4 from the same clone, and confirm what the section says about `/chart` and
  `/api/health/db` is what you see.
- Tier 2 is not part of the live gate (it depends on Docker being up). Record
  whether you ran it.

### Out of Scope

- **Changing the fast-lane criteria to cover docs-only changes.** This sprint exists
  partly because they don't. Whether they should is a separate decision for the
  user, about the framework's own rules, not something to decide inside a README
  sprint.
- Any change to `package.json` scripts, CI, or config. If a command doesn't work as
  documented, the README says what actually happens; fixing the command is another
  sprint.
- Deleting the current production `.env.local`. That's housekeeping for the user;
  R6 only documents the risk.
- Rewriting `## Local setup`, `### Running the policy tests`, or anything else in the
  README.

### Dependencies

- **Blocked by:** nothing.
- **Blocks:** nothing.
- **External:** Supabase must be unpaused for CI's `migrate` job (it was `ok` on
  4 Oct).

### Human Prerequisites

- **Docker Desktop running**, for tier 2 only. It's installed but wasn't running on
  4 Oct. Dev Team tries to start it first; only if that fails does it ask the user.
  If it still can't run, R7's "what was tried" applies. This doesn't block the
  sprint.
- **Supabase unpaused when Pipeman pushes.** If `/api/health/db` reports
  `down`/paused, the user restores the project before Pipeman pushes.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** not assigned. One file; it doesn't split.

### Risks & Mitigations

- **The README documents what a command *should* do rather than what it does.** —
  R7 requires actually running each command; QA1 cross-checks claims against code
  and the run report; LiveQA follows the section on a fresh clone.
- **A tier 1 pass that quietly depended on the production `.env.local`.** — R7
  requires running with it moved aside; LiveQA's fresh clone has none.
- **CI's `migrate` fails because Supabase paused, and it gets mistaken for a broken
  pipeline.** — Human Prerequisites; LiveQA checks `/api/health/db` first.
- **Scope creep into fixing commands or restructuring the README.** — Out of Scope
  names both; R8 limits the diff to one file.
