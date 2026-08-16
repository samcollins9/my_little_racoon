---
id: 5
title: "Preview environments and rehearsed rollback"
epic: "Deployment Lifecycle"
status: done
created: 2026-08-15T20:07:45+00:00
---

# Master Controller Sprint Definition — Sprint 5

**Epic:** Deployment Lifecycle
**Sprint Objective:** Guarantee that migrations land before the code depending on them serves traffic, and rehearse a real production rollback.

> **Re-scoped 16 Aug 2026.** This sprint originally required previews to use a
> database that is *not* production. On a free Supabase plan, with a public tool
> holding only test data, that requirement costs more than it protects. Previews now
> share production, as a documented exception. See Context — the reasoning belongs
> in the record, not just in a chat log.


> **Previews dropped 16 Aug 2026, after GroundTruth round 2.** The sprint title
> still names them; there is no rename command and hand-editing the registry is
> forbidden, so this note is the correction. What happened, plainly: a branch was
> pushed, CI ran clean, and Vercel created no preview deployment. The cause was not
> diagnosed. What *was* established is that the production deploy path and automatic
> previews are in tension — `vercel.json`'s `git.deploymentEnabled.main = false`
> plus a deploy hook exists to order migrations before traffic (R3), and loosening
> it to obtain previews risks reintroducing the Sprint 2 race. Faced with that
> trade, migration ordering was kept and previews were given up. This was a
> discovery, not a plan; recording it as a choice would flatter it.
>
> **Consequences, stated so they are visible rather than inferred:** there is no
> pre-production environment. Changes are reviewed locally or on production, which
> is acceptable only because this app has no users. Anyone reviving previews must
> verify `deploymentEnabled` is still in effect in the same pass — R3 and previews
> are one piece of work, not two.

### Context

Two of this sprint's three original deferrals still matter and are unproven:
migrations racing the deploy that depends on them, and a rollback nobody has ever
performed. Those stay, and the rollback requirement is the one most likely to be
quietly softened into documentation. It is not satisfied by a written procedure. It
is satisfied by having performed a rollback on production and observed the result.
A procedure nobody has executed is a hypothesis.

The third deferral — preview database isolation — is being consciously given up.
The `readings` table holds test rows anyone can create through a public form: no
accounts, no personal data, nothing whose exposure or corruption matters. Isolation
would cost a second Supabase project, a second variable set, CI targeting logic,
and a second schema free to drift — and it would make preview deployments show
empty states precisely when they are about to be used to review a redesign.

That trade removes a safety layer, which makes the remaining one load-bearing. The
real hazard was never previews *reading* production; it was a migration reaching
production from an unreviewed branch. Sprint 2 gated the migration job to `main`.
That gate is now the only thing standing there, so this sprint proves it holds
rather than assuming it.

### Requirements

1. ~~Preview deployments share the production Supabase database.~~ **Moot as of
   16 Aug 2026** — there are no preview deployments, so nothing shares anything.
   The reasoning is retained in the README as a recorded decision, because it
   becomes live again the moment previews are revived.
2. The migration job **cannot** run from any ref other than `main`. Verified by a
   check that fails if the workflow's branch condition is removed or widened, not by
   reading the condition and believing it.
3. Migrations are applied to production **before** the deployment depending on them
   serves traffic. This closes the race named in Sprint 2 and never fixed.
4. Migrations follow expand-then-contract: a migration must leave the schema
   compatible with the immediately previous application version, so rolling the app
   back does not break it against newer schema. Documented as a standing rule for
   all future migrations, not merely applied once here.
5. A rehearsed production rollback: deploy a change, roll it back, confirm the live
   application returns to the prior version. The commit SHA on the page from
   Sprint 1 is the observable.
6. A runbook in the repository covering: rolling back an application deploy;
   handling a migration that must be undone, which is a forward-fix rather than a
   reverse migration; how to tell which of the two a given incident needs; and the
   shared-database exception with its consequences for preview deployments.
### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: the exception is documented in `README.md` with its reasoning and its exit
  conditions. A bare statement that previews use production, with no reasoning,
  fails — the point is that a later reader can tell this was decided rather than
  overlooked.
- R2: **the criterion that matters most in this sprint.** The main-only restriction
  on the migration job is enforced and covered by a check that fails if it is
  widened. With previews now sharing production, this is the only remaining barrier
  between an unreviewed branch and the production schema.
- R3: the pipeline orders migration before traffic — the deployment is gated on
  migration success rather than merely running alongside it.
- R4: expand-then-contract is documented as a standing constraint on all future
  migrations.
- R6: the runbook covers all four items, including the distinction between an app
  rollback and a forward-fix migration.

**GroundTruth — live, after Pipeman pushes:**

- Production serves correctly by anonymous fetch at the shipped commit.
- A rollback is performed on production and the commit SHA displayed on the page
  returns to its prior value. **This is the sprint's actual proof**, and it must be
  an executed rollback, not a described one.

### Out of Scope

- Preview database isolation. Given up deliberately — see Context. Not deferred to a
  later sprint in this exercise; it is a decision to revisit if the product acquires
  real users.
- Automated rollback triggers, health-check-driven rollback, canary deploys.
- Backup and restore policy for production data. Genuinely important, a different
  concern from deploy rollback, and outside this exercise.
- Seeding or resetting preview data.
- Any product feature. This sprint adds no user-facing behaviour.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Sprint 6 and Sprint 10, both of which are reviewed against previews.
- **Blocked by:** Sprint 4, complete.
- **External:** None. Dropping the second Supabase project removed this sprint's only
  account-level action.

### Risks & Mitigations

- **The migration gate gets widened.** With the shared database, a migration job
  that can run off a branch would apply unreviewed schema changes directly to
  production. This is the one failure in this sprint with real consequences. — R2,
  enforced by a check that fails rather than by a condition someone reads and trusts.
- **Rollback is written but never performed.** Easy to satisfy on paper, and the gap
  only appears during an incident. — R5 and GroundTruth's third criterion both
  require an executed rollback with an observable result.
- **App rollback breaks against newer schema.** Rolling the application back while
  the database only moves forward is the standard way a rollback makes an incident
  worse. — R4's expand-then-contract rule, standing rather than one-off.
- **Preview writes land in production data.** A direct consequence of R1, accepted
  knowingly: the table holds public test rows and nothing else. — Named in the
  README exception so it is understood rather than discovered.
- **A preview expecting new schema fails against production's.** Expected behaviour
  under R1, not a defect. — Named in the runbook so it is not debugged as a bug.
- **~~Public previews run unreviewed code against the only database.~~** Moot as of
  16 Aug 2026 — no previews exist. Retained because it becomes live again the moment
  previews are revived, and it is the reason reviving them is not purely a
  convenience decision.

### Scope note on what the rollback proves — added 16 Aug 2026

Raised by GroundTruth before the gate, and recorded so no later reader over-reads a
PASS. Sprint 5 shipped **no migration**: the diff from `3648d7a` to `68302d5` is CI
configuration, README, runbook, a guardrail test, and `vercel.json`. Rolling
production back therefore returns the application to exactly the version its schema
was built for, with schema and app version matched throughout.

That makes the rollback safe. It also means it **does not exercise R4's
expand-then-contract rule**. This sprint proves the application rolls back; it does
not prove the schema tolerates being rolled back under. R4 remains a documented
standing constraint on future migrations, verified by QA1 as documentation, and it
has never been tested against a real rollback. Do not cite this PASS as evidence
that it has.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned.
