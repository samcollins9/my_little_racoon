---
id: 5
title: "Preview environments and rehearsed rollback"
epic: "Deployment Lifecycle"
status: todo
created: 2026-08-15T20:07:45+00:00
---

# Master Controller Sprint Definition — Sprint 5

**Epic:** Deployment Lifecycle
**Sprint Objective:** Give preview deployments a database that is not production, guarantee that migrations land before the code that depends on them, and rehearse a real production rollback so the procedure is known to work rather than merely written down.

### Context

This sprint closes the three deferrals Epic A has been carrying: which database
previews talk to, the unordered race between the Vercel deploy and the migration
job, and rollback. Each was deferred deliberately, because each needs the others to
be answerable — rollback is meaningless without knowing what previews touch, and
ordering is untestable without a non-production environment to get it wrong in.

The rollback requirement is the one most likely to be quietly softened into
documentation. It is not satisfied by a written procedure. It is satisfied by
having performed a rollback on production and observed the result. A procedure
nobody has executed is a hypothesis.

### Requirements

1. Preview deployments use a database that is **not** production. Default to a
   dedicated staging Supabase project; use Supabase database branching instead if
   the account plan supports it. Record the choice and its reason in the README.
2. Preview deployments receive their own environment variables — Supabase URL,
   anon key, and service role key for the non-production database — with no path by
   which a preview can reach production data.
3. Migrations are applied to the target database **before** the deployment that
   depends on them serves traffic, for both preview and production. This closes
   the race named in Sprint 2.
4. Migrations follow expand-then-contract: a migration must leave the schema
   compatible with the immediately previous application version, so that rolling
   the app back does not break it against newer schema. Documented as a standing
   rule, not just applied once.
5. A rehearsed production rollback: deploy a change, roll it back, and confirm the
   live application returns to the prior version. The commit SHA on the page from
   Sprint 1 is the observable.
6. A runbook in the repository covering: rolling back an application deploy,
   handling a migration that must be undone (forward-fix, not reverse-migrate), and
   how to tell which of the two a given incident needs.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: committed configuration shows previews pointing at a non-production database,
  and the README records which option was chosen and why.
- R2: preview environment variables are separate from production, and no production
  credential appears in preview configuration.
- R3: the pipeline orders migration before traffic — the deployment is gated on
  migration success rather than merely running alongside it.
- R4: the expand-then-contract rule is documented as a standing constraint on all
  future migrations, and this sprint's migrations, if any, obey it.
- R6: the runbook covers all three items, including the distinction between an app
  rollback and a forward-fix migration.

**GroundTruth — live, after Pipeman pushes:**

- A preview deployment loads, and its data is visibly not production's.
- Production still serves correctly after the preview exists — previews have not
  disturbed it.
- A rollback is performed on production and the commit SHA displayed on the page
  returns to the prior value. **This is the sprint's actual proof**, and it must be
  an executed rollback, not a described one.

### Out of Scope

- Automated rollback triggers, health-check-driven rollback, or canary deploys.
- Seeding previews with realistic data. An empty non-production database satisfies
  this sprint.
- Backup and restore policy for production data. Related, genuinely important, and
  a different concern from deploy rollback — it belongs to whatever follows this
  exercise.
- Multiple long-lived environments beyond preview and production.
- Any product feature. This sprint adds no user-facing behaviour.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Epic B. Every sprint after this one is verified against previews, so
  the topology has to be settled before domain work starts producing changes worth
  previewing.
- **Blocked by:** Sprint 4. Rolling back across a schema change is only meaningful
  once policies exist to be rolled back over.
- **External:** A second Supabase project, or database branching enabled on the
  account. Preview environment variables set in Vercel. Both are account-level
  actions the user performs.

### Risks & Mitigations

- **Previews point at production.** The path of least resistance, since the
  variables are already set, and it means a preview branch can write to or destroy
  real data. — R1 and R2, with R2 checked as an explicit absence of production
  credentials in preview configuration.
- **Rollback is written but never performed.** The requirement is easy to satisfy on
  paper and the gap only appears during an incident. — R5 and GroundTruth's third
  criterion both demand an executed rollback with an observable result.
- **App rollback breaks against newer schema.** Rolling the application back while
  the database moves only forward is the standard way a rollback makes an incident
  worse. — R4's expand-then-contract rule, documented as standing rather than
  applied once.
- **Ordering fixed for production, left racing for preview.** The race is easier to
  see in production and easier to ignore in preview, where it produces confusing
  intermittent failures. — R3 covers both explicitly.
- **Staging project drifts from production.** Two projects configured by hand
  diverge, and previews stop predicting anything. — Both are migrated by the same
  pipeline from the same files; Sprint 2's drift check applies to each.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned. This sprint is the last of Epic A's sequential chain;
  parallel work becomes possible in Epic B.
