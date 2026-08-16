# Retroactive Horoscope — Exercise Roadmap

Supersedes the 29-sprint product roadmap of the same name (15 Aug 2026), which
sequenced astrological depth. That was the wrong axis. See **Objective**.

Derived from `docs/PRD_v1.md` (Draft v1, 15 Aug 2026).
Owner: Master Controller. Status: proposed, not yet instantiated as sprints.

---

## Objective

**Prove an end-to-end deployment lifecycle on Vercel + Supabase, run through the
Fully Completely sprint process, using a thin but real slice of Retroactive
Horoscope as the vehicle.**

The product is the vehicle, not the deliverable. This inverts the sequencing:
what gets ordered first is *lifecycle surface area*, not astrological depth. A
sprint earns its place by forcing a deployment problem into the open, not by
advancing the evidence sheet.

### Definition of done for the exercise

The exercise succeeds when a change of arbitrary size travels from `/sprint-new`
to verified-live-on-production, through all six roles and both gates, with:

- migrations applied by CI, never by hand
- RLS proven by an automated test rather than asserted
- secrets and redirect URLs correct in both preview and production
- a rollback that has actually been rehearsed, not just documented

...and it does that **twice**, with no manual intervention outside the written
procedure. Once is a lucky run. Twice is a lifecycle.

---

## Recorded decisions

| Decision | Choice | Note |
|---|---|---|
| Objective | Deployment-lifecycle exercise; product is the vehicle | User, 15 Aug 2026 |
| Scope | Walking skeleton + one thin vertical slice, 10 sprints | User, 15 Aug 2026 |
| Hosting | Vercel | User, 15 Aug 2026 |
| Data, auth | Supabase (Postgres, Auth) | User, 15 Aug 2026 |
| Stack | Next.js + TypeScript, end to end | Follows from Vercel + Supabase |
| Ephemeris | `astronomy-engine` (MIT, TypeScript) | **Reverses** the earlier Swiss Ephemeris AGPL decision |
| Authentication | **None.** Public site, no accounts | User, 16 Aug 2026 — exercise only; `docs/PRD_v1.md` keeps its single-practitioner intent for a later build |
| Persistence | Anonymous readings, retrievable by unguessable id | User, 16 Aug 2026 — keeps Supabase genuinely exercised |
| Repo | App lives in this repo, beside the workflow tooling | User, 15 Aug 2026 |

### On the reversed ephemeris decision

The earlier call was Swiss Ephemeris under AGPL. Moving to Vercel + Supabase made
that expensive in two ways at once: `pyswisseph` is a C extension needing a second
runtime in a project whose whole point is proving *one* deployment lifecycle
cleanly, and AGPL on a hosted service still carries source-disclosure for the
entire service.

`astronomy-engine` is MIT, pure TypeScript, no data files, and accurate far beyond
what astrological work needs. It supplies positions only — houses, aspects and
dignities are ordinary math written on top, which is *desirable* here: real domain
code with no native dependency. The AGPL obligation disappears entirely.

The earlier Moshier choice — analytic, no `.se1` files, no volume — was already
pointing this way and ports across unchanged.

Keep it behind a thin adapter interface anyway. If precision ever needs to become
Swiss Ephemeris, that should be a dependency swap, not a rewrite.

---

## Two constraints carried forward from the full PRD

A thin slice is allowed to omit features. It is not allowed to foreclose them.
Two of the PRD's requirements are nearly free to honour now and expensive to
retrofit, so they bind even though the features they serve are out of scope:

1. **The scorer must not accept event text at all** (§7.3). The full product
   requires that it be *architecturally impossible* for event text to reach the
   scorer in blind mode, "not merely conditionally skipped." Build a scorer taking
   a context object containing event text and then filtering it, and the
   requirement is violated before blind mode is ever built — retrofitting means
   rewriting the scorer. Blind mode is out of scope; this constraint is not.

2. **Houses and angles are nullable in the chart model** (§7.1). When time is
   unknown they are absent, not defaulted to noon and filtered downstream. Free in
   S6, expensive after anything consumes the model.

Everything else in the PRD is deferred without prejudice.

---

## Epic A — Deployment Lifecycle

The walking skeleton. Each sprint exists to force a specific deployment problem
into the open, and is done when that problem is solved and proven.

- **S1 — Next.js on Vercel, deployed from main.** Repo scaffold inside this
  checkout, TypeScript, lint, test harness, CI on push, live production URL
  serving a real page. Deliberately trivial in content: the deliverable is the
  pipeline. Also updates `.gitignore` for `node_modules`, `.next`, `.env*.local`,
  `.vercel`.
- **S2 — Supabase project, schema, and migrations in CI.** Migration files in
  version control, applied by CI and never by hand, with a working local
  development story. One real table.
- **S3 — ABORTED 16 Aug 2026.** Was Supabase Auth with per-environment redirects.
  Authentication was cut from the exercise: the app is a public tool, anyone picks a
  past date and gets a reading. Its committed code (session proxy, sign-in page,
  `user_id` on `readings`) is removed as part of S4.
- **S4 — RLS policies, proven by test.** Re-scoped for anonymous, link-addressed
  readings: insert permitted, select by explicit id only, no unfiltered listing,
  update and delete denied. Removing accounts makes RLS *more* load-bearing, not
  less — a public app ships the anon key in the client bundle by design, so policies
  are the only thing between a visitor's devtools and the whole table. Includes the
  catalogue-driven test that fails if any future table ships without RLS enabled.
- **S5 — Migration ordering and rehearsed rollback.** Guarantee migrations land
  before the code depending on them serves traffic — the race deferred from S2 —
  enforced by a guardrail test that fails if the main-only gate is widened. Adopt
  expand-then-contract as a standing rule. Rehearse a production rollback; acceptance
  requires it to have been performed, not documented. **Preview environments dropped
  16 Aug 2026**: a pushed branch produced no preview, and the production deploy path
  that closes the S2 race (`deploymentEnabled.main = false` plus a deploy hook) is in
  tension with automatic previews. Migration ordering was kept, previews given up.
  The project therefore has no pre-production environment — acceptable only because
  the app has no users.

## Epic B — Thin Vertical Slice

**Trimmed 16 Aug 2026 from five sprints to two.** The goal is a deployment proof
with simple persistence, and the codebase then goes through a design pass. Chart
mathematics served neither. Sprints 7, 8, and 9 are aborted.

- **S6 — Public reading page.** A past date in, geocentric planetary positions out,
  on a page with no account. Place and geocoding dropped — positions depend only on
  the moment, not the observer — which removes the project's last external API.
  Houses and angles dropped with them, since those are the part that needs a
  location, which retires the time-unknown suppression contract entirely.
- **S10 — Save and retrieve by link.** A reading persisted anonymously and rendered
  at an unguessable URL, under S4's policies. The link is the access control, so the
  sprint rests on unguessable ids and on there being no way to list what exists.

- **S7, S8, S9 — ABORTED.** Aspects and chart view; factor extraction and scoring;
  evidence sheet with pin and dismiss. All real product work, none of it needed to
  prove a deployment lifecycle or to give a design pass something to work on.

---

## Explicitly out of scope

Deferred without prejudice, each one a real part of the product and none of them
needed to answer the deployment question:

- Blind mode lock, timestamp, and audit trail (§7.5, §10) — needs the scorer
  separation, which *is* being preserved
- Signification corpus (§12) — the largest content task in the product
- Draft generation, traceability markers, specificity checker (§7.5, §7.6) —
  gated on five-practitioner validation regardless
- Essential dignity, sect, planetary condition (§7.2)
- Historical calendar and timezone handling (§7.2) — S6 accepts modern dates only
- House systems beyond Whole Sign; sidereal zodiac and ayanamsa
- Informed mode, event categories, category significator weighting
- PDF export, chart wheel rendering, practice branding
- Metrics instrumentation (§9)

If any of these starts appearing in a sprint under "while we're in there," that is
scope creep against an exercise whose value depends on finishing.

---

## Notes on process

**GroundTruth's gate has a real referent here.** A deployed Vercel URL is exactly
what live browser testing assumes, and preview deployments give GroundTruth a
target ahead of production. Worth deciding at S5 whether the gate tests preview
or production, and writing it into the sprint definitions from then on.

**Dev Team 2 has no natural parallel track in Epic A.** The skeleton sprints are
strictly sequential — auth needs the project, RLS needs the schema, previews need
a deploy. Epic B has more room, but overlap on the chart model is high through
S6-S8. Expect this to run mostly single-track, and treat that as correct rather
than as under-utilisation.

**Full sprint definitions are written per sprint as it becomes ready to assign.**
The sprint list is the commitment; the definitions are written just in time. A
detailed acceptance criterion written months ahead of implementation is fiction,
and it invites a team building to a stale spec instead of flagging that it drifted.
