# Runbook

Operational procedures for this repository's deployment pipeline. See
`README.md`'s "Path to production" for how a normal deploy happens; this
covers what to do when one needs to be undone or investigated.

## Rolling back an application deploy

Use this when the *code* is the problem — a bad release, a crash, a
regression — and the previous version needs to serve traffic again right
now.

1. Vercel dashboard → this project → Deployments.
2. Find the last known-good production deployment (cross-check its commit
   SHA against what `/api/health/db` reported before the incident — that
   endpoint is the record of what was live and when, not any page; see
   Sprint 11).
3. Use **Instant Rollback** (the `...` menu on that deployment → Promote
   to Production, or `vercel rollback` via the CLI).
4. Confirm: `curl` (or open) `/api/health/db`, check `commit.sha` matches
   the deployment you rolled back to.

This re-serves a previous build's output — it does not rebuild, and it
does not touch the database. That's exactly why **expand-then-contract**
(see `README.md`) matters: this rollback is only safe if the schema the
old code expects still exists. If a later migration already dropped
something the old code depended on, this rollback will "succeed" and
still be broken — that's not this procedure failing, it's expand-then-
contract having been violated upstream, and the fix belongs there, not
here.

## A migration needs to be undone

**There is no reverse-migration mechanism in this repository, and there
will not be one.** `supabase/migrations/` is an append-only, forward-only
history — see the Sprint 2 migration file's own comment on why encoding a
"drop" of something production never had would write fiction into the
record. Undoing a migration's effect means writing a **new** migration
that does the undoing, not editing or deleting the old one.

### Deciding which procedure an incident needs

Ask first: **is the currently-deployed code broken, or is the schema
wrong?** These are different failures with different fixes, and applying
the wrong one wastes the incident.

- **Code broken, schema fine** → roll back the app (above). Nothing to do
  in `supabase/migrations/`.
- **Schema wrong, code fine** → forward-fix migration (below). Do not roll
  back the app; the currently-deployed code is what expects the schema
  you're about to fix.
- **Both** → forward-fix the schema first (expand-then-contract means the
  currently-deployed code should keep working against the fixed schema),
  confirm the fix, then decide whether the app rollback is still needed.

`/api/health/db`'s reported migration version and commit SHA are the two
observables for telling these apart quickly — both live on the same
endpoint since Sprint 11: if the commit SHA is what you expect but the
app is misbehaving against the data, suspect the schema.

### Writing a forward-fix migration

1. `npx supabase migration new fix_<short_description>`.
2. Write the SQL that corrects the problem — this might literally reverse
   an earlier migration's DDL (e.g. `drop column` for a `add column` that
   shouldn't have shipped), but it is its own new, timestamped, forward
   migration, not an edit to the original.
3. Still expand-then-contract: if anything depends on the broken shape
   between now and this fix landing, the fix has to tolerate that window
   too.
4. Push to `main` through the normal pipeline (`migrate` job: link, push,
   drift check, deploy hook). There is no fast path that skips CI for an
   incident — the drift check and RLS suite are exactly as relevant during
   an incident as they are any other time, arguably more so.

## Shared database: what NOT to debug as a bug

Preview deployments and production share one Supabase project (see
README's "Shared database" section for the full reasoning). Two things
that look like incidents during a preview review are actually expected
behavior:

- **A preview shows data a production user created, or vice versa.**
  Expected. There is one `readings` table. This is the entire tradeoff
  Sprint 5 named explicitly, not a leak.
- **A preview branch fails against the schema because it expects a
  migration that hasn't reached `main` yet.** Expected. Previews are
  reviewed against production's *current* schema, not a schema of their
  own — merge (or otherwise land the migration on `main`) before the
  preview can exercise the new shape.

If an incident during a preview review isn't one of these two shapes,
treat it as a real incident and use the procedures above.
