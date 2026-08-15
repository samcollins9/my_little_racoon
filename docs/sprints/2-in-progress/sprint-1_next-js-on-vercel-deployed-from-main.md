---
id: 1
title: "Next.js on Vercel, deployed from main"
epic: "Deployment Lifecycle"
status: in_progress
created: 2026-08-15T19:55:50+00:00
---

# Master Controller Sprint Definition — Sprint 1

**Epic:** Deployment Lifecycle
**Sprint Objective:** Stand up a Next.js + TypeScript application in this repository, with CI and an automatic production deployment on Vercel from `main`, serving a real page that reports the commit it was built from.

### Context

This is the first sprint of an exercise whose deliverable is a *proven deployment
lifecycle*, not a product (see `docs/ROADMAP_v1.md`). The content of this sprint is
deliberately trivial — the pipeline is the artifact. Every sprint after this one
assumes that a push to `main` reaches production without hand-holding, and none of
them can be verified live until that is true.

The deployed-commit marker in R6 is not decoration. GroundTruth's gate records a
`--deployed-commit`, and without a marker on the page there is no way to know
whether the deploy finished or whether an older build is still being tested.
Building it in Sprint 1 is what makes every later sprint's live test trustworthy,
and retrofitting it after several sprints of untrustworthy live tests is the
expensive way to learn this.

### Requirements

1. A Next.js (App Router) + TypeScript application scaffolded at the repository
   root, coexisting with `.claude/`, `scripts/`, `docs/`, and `CLAUDE.md` without
   moving or modifying any of them.
2. Node version pinned in both `.nvmrc` and `package.json` `engines`, set to Node
   22 to match the Vercel runtime.
3. Lint, typecheck, and test harness configured, each exposed as a `package.json`
   script, and all three passing on a clean checkout.
4. A GitHub Actions workflow triggered on push and on pull request, running
   install, lint, typecheck, test, and the production build — using the same build
   command and the same Node version Vercel will use.
5. A Vercel project connected to the `origin` GitHub remote, deploying to
   production automatically on push to `main`.
6. The application serves one real page — not the `create-next-app` starter —
   identifying the product and displaying the deployed commit SHA read from
   `VERCEL_GIT_COMMIT_SHA`, with a documented fallback for local development.
7. `.gitignore` extended with `node_modules/`, `.next/`, `.env*.local`, and
   `.vercel`, preserving every existing entry including `docs/sprints/.locks/`.
8. A committed `.env.example` listing every environment variable the application
   reads, with no real values. No secrets anywhere in the repository.
9. `README.md` documenting local setup, the CI commands, and the path a change
   takes to production.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: the app scaffold is present, and the diff shows no changes under `.claude/`,
  `scripts/`, or to `CLAUDE.md`; the only change under `docs/` is this sprint file
  moving through the lifecycle.
- R2: `.nvmrc` and `package.json` `engines` are both present and both specify
  Node 22. They agree with each other.
- R3: `package.json` exposes lint, typecheck, and test scripts, and at least one
  test file makes a real assertion — a placeholder test that passes unconditionally
  does not satisfy this.
- R4: the workflow triggers on push and pull request; its steps cover install,
  lint, typecheck, test, and build; its build command matches the one Vercel runs;
  its Node version matches `.nvmrc`.
- R6: the page source contains no starter boilerplate; the SHA is read from
  `VERCEL_GIT_COMMIT_SHA` with an explicit fallback branch, and is rendered into
  the page.
- R7: `.gitignore` contains all four new entries and still contains
  `docs/sprints/.locks/`.
- R8: `.env.example` exists; no API key, token, or connection string appears
  anywhere in the diff.
- R9: `README.md` covers local setup, CI commands, and how a change reaches
  production.

**GroundTruth — live, after Pipeman pushes:**

- The production URL loads over HTTPS and serves the real page — not a 404, not
  the starter template.
- The commit SHA displayed on the page matches the SHA Pipeman pushed.
- A subsequent push to `main` changes the SHA displayed on the live page, with no
  manual intervention. **This is the sprint's actual proof** — the other criteria
  describe a repository, this one describes a working lifecycle.

### Out of Scope

- Supabase project, database, and migrations — Sprint 2.
- Authentication — Sprint 3.
- Row Level Security — Sprint 4.
- Preview environment strategy and rollback — Sprint 5. Vercel may enable preview
  deployments by default when the repo is connected; leave that default alone. Do
  not design around it this sprint.
- All astrology and domain code — Sprint 6 onward. No ephemeris dependency, no
  chart model, no factor code.
- Styling systems, component libraries, and design work. Minimal inline styling
  only; a deliberately plain page is the correct outcome here.
- Custom domain. The `.vercel.app` URL is sufficient for the whole exercise.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`. Changes to this repo's own
  tooling follow CLAUDE.md's `## Changes to this repo's own tooling`, not a sprint.

### Dependencies

- **Blocks:** Sprint 2, and by extension every sprint in Epics A and B. Nothing
  downstream can be verified live until this exists.
- **Blocked by:** Nothing. Stack, hosting, data layer, ephemeris library, and repo
  layout are all decided and recorded in `docs/ROADMAP_v1.md`.
- **External:** A Vercel account with access to `github.com/samcollins9/my_little_racoon`.
  The GitHub remote already exists. Connecting Vercel to it is an account-level
  action the user performs — not Dev Team's work, and not something QA1 can verify
  from a diff. R5 cannot be confirmed live until it is done.

### Risks & Mitigations

- **CI passes, Vercel build fails.** The classic divergence, and it wastes the
  whole fix loop when it happens. — R2 and R4 together: identical Node version and
  identical build command in both places, verified by QA1 as a direct comparison
  rather than by inspection of each in isolation.
- **`create-next-app` refuses to scaffold into a non-empty directory, or
  overwrites existing files.** — Scaffold into a temporary directory and merge in,
  then confirm `.claude/`, `scripts/`, `docs/`, and `CLAUDE.md` are byte-identical.
  R1's acceptance criterion is exactly this check.
- **Shipping the starter template.** The sprint "passes" while proving nothing —
  the failure mode where a green pipeline deploys a page nobody wrote. — R6 requires
  a real page, and GroundTruth's third criterion requires the SHA to actually change
  on a second push.
- **Secrets committed while wiring up Vercel.** — R7 and R8; QA1 greps the diff for
  keys, tokens, and connection strings as a named check rather than a general
  impression.
- **Nobody owns the Vercel connection.** It is an account action sitting between
  Dev Team's work and GroundTruth's gate, and it is the kind of step that silently
  stalls a sprint. — Named as an external dependency above, assigned to the user,
  called out at handoff rather than discovered at the gate.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned. Epic A is strictly sequential — auth needs the
  project, RLS needs the schema, previews need a deploy — so there is no genuinely
  independent parallel sprint to run alongside this one. That is the correct
  outcome, not idle capacity, and no worktree is needed.
