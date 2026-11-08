---
id: 27
title: "Pin the Supabase CLI in CI"
epic: "Operability"
status: todo
created: 2026-11-08T01:08:23+00:00
---

# Master Controller Sprint Definition — Sprint 27

**Epic:** Operability
**Sprint Objective:** CI runs one exact, deliberately chosen Supabase CLI version, the
same one the project uses locally, and every CI command that should reach the hosted
project names that target explicitly. A CLI release can then never silently retarget
a step again.

### Context

On 8 Nov 2026, CI run `42431766772` failed in `migrate`, so no deploy fired. `supabase
link` succeeded, then `supabase db push` printed `Target: local stack
(127.0.0.1:54322) · default; pass --remote for retro-psychic` and failed with
`ECONNREFUSED`. Both CI jobs install the CLI with `supabase/setup-cli@v1` and
`version: latest` (`ci.yml` lines 48 and 81). A newer CLI changed `db push`'s
default target, and CI picked up the change with nobody committing anything. The last
green run before that was 13 Oct (`38392859832`). Supabase was not paused.

Two related facts. **Local and CI already run different CLIs:** the project's
devDependency is pinned at `supabase` **2.114.0** in `package-lock.json`, but CI
ignores it. And the same failing run warns that `auth.email.enable_signup` and
`auth.sms.enable_signup` in `supabase/config.toml` are deprecated and "will be
removed in v4". That's another way an unpinned CLI can break CI later.

**Prior record, checked per planning rule 11:** no sprint file (open or closed), no
`docs/` finding, and no commit message mentions pinning the CLI or the CLI's default
target. The CLI version the 13 Oct green run used **can't be recovered**:
`gh run view 38392859832 --log` came back empty. So which version to pin and which
flags it accepts are **measured in this sprint**, not assumed.

### Requirements

1. **CI uses one exact CLI version, defined in one place.** No `version: latest`, and
   no floating range in either job. Both `rls-tests` and `migrate` use the same
   version. That version is the same one the project uses locally (`package-lock.json`'s
   `supabase`, currently 2.114.0), so `npx supabase` and CI never disagree. How to get
   there is Dev Team's call, e.g. an exact `version:` matching the lockfile, or running
   the lockfile's CLI in CI. **But it must not be possible for the two to drift apart
   without a commit that changes the version.** If Dev Team finds a reason to pick a
   version other than 2.114.0, update the lockfile to match and record the reason in
   the handoff.
2. **Every command that should reach the hosted project names its target
   explicitly:** `db push` and the drift check (`db diff`). Use flags that the
   **pinned** version actually accepts. **Measure them before relying on them**:
   record the pinned version's `supabase db push --help` and `supabase db diff
   --help` output in the handoff. Don't carry over flag names from Pipeman's report
   or from the newer CLI's error message; `--remote` comes from a newer version, and
   2.114.0 may not have it.
3. **The drift check must not pass vacuously.** If a CLI change made `db diff` compare
   against the wrong thing (a local stack, or nothing at all), an empty diff would look
   like "no drift" and pass. The CI log for the drift step must show it ran against the
   linked project (a target line, or the CLI's own equivalent statement). If the pinned
   version prints nothing that shows its target, Dev Team adds a step that does, or
   says so in the handoff so QA1 can judge it.
4. **The `rls-tests` job still starts the local stack and passes** on the pinned
   version. It isn't broken today, but it's on the same unpinned install.
5. **Only `.github/workflows/ci.yml` changes**, plus `package.json`/`package-lock.json`
   if R1's chosen approach requires it. No change to `supabase/config.toml`, migrations,
   or app code.

### Acceptance Criteria

**QA1 — static:**
- R1: no `version: latest` or floating range remains in `ci.yml`; both jobs resolve to
  the same exact version; it matches `package-lock.json`'s `supabase` (or the lockfile
  was changed to match, with a reason recorded). Check that nothing lets the two
  diverge without a version-changing commit.
- R2: the flags used appear in the pinned version's `--help` output recorded in the
  handoff. A flag that appears only in a newer version is a FAIL.
- R3: the drift step's evidence of its target is present, or its absence is justified
  in the handoff.
- R5: `git diff --stat` shows only the allowed files.
- Dev Team states what it could and couldn't verify locally. The remote path needs
  GitHub secrets no role holds locally, so **CI is the first place `db push`/`db diff`
  against the project actually run**. That's expected, not a gap: it's what LiveQA's
  gate is for.

**LiveQA — live, after Pipeman pushes:**
- CI is green for the pushed commit, **all three jobs**.
- The `migrate` log shows `db push` and the drift check both targeting the linked
  project, not a local stack. Quote the lines.
- The deploy hook fired, and `/api/health/db` reports `status: "ok"` with `commit.sha`
  equal to the pushed commit.
- The setup step installed the pinned version (quote its log line) in both jobs.

### Out of Scope

- **The `config.toml` deprecation warnings** (`enable_signup` → `enabled`). Pinning
  makes them harmless for now. Dealing with them is part of a future, deliberate CLI
  upgrade, not this fix.
- **Upgrading the CLI.** This sprint chooses a version and pins it. Moving to a newer
  one later is its own sprint, deliberately chosen.
- **The Node 20 deprecation warning** on `actions/checkout@v4`, `setup-node@v4` and
  `supabase/setup-cli@v1`. It's a warning, not a failure; a separate change.
- **Re-enabling horoscopes.** The user is doing that separately with a dashboard
  redeploy; it doesn't depend on CI.

### Dependencies

- **Blocked by:** nothing.
- **Blocks:** every CI-driven deploy. Until this lands, a push to `main` can't deploy.
  The two undeployed record commits (`b21c606`, `98bdfac`) go out with this sprint's
  push.
- **External:** Supabase unpaused when Pipeman pushes; the existing GitHub secrets
  (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`).

### Human Prerequisites

- **Supabase unpaused when Pipeman pushes.** It was `ok` on 7 Nov. If `/api/health/db`
  reports otherwise, the user restores the project first. A pause would fail
  `migrate` too, and look like this sprint's fix not working.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** not assigned. One workflow file; it doesn't split.

### Risks & Mitigations

- **The flag gets copied from the newer CLI's error message and doesn't exist on the
  pinned version.** — R2 requires the pinned version's own `--help`; QA1 fails a flag
  that isn't in it.
- **The drift check silently stops checking anything.** — R3 plus LiveQA quoting the
  target line. This is the quiet failure; a failing `db push` is at least loud.
- **Choosing 2.114.0 brings back some other old behaviour.** — The lockfile already
  runs 2.114.0 locally, and the 13 Oct green run was very likely on that version or
  newer. If the remote steps misbehave in CI, that's a LiveQA FAIL and a cheap
  reship: one workflow file.
- **A future CLI upgrade breaks things the same way.** — R1 makes any upgrade a
  deliberate commit that goes through the gates. That's the structural fix; the flag
  in R2 is secondary.
