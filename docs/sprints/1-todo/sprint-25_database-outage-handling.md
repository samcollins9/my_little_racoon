---
id: 25
title: "Database outage handling"
epic: "Operability"
status: todo
created: 2026-09-27T19:03:31+00:00
---

# Master Controller Sprint Definition — Sprint 25

**Epic:** Operability
**Sprint Objective:** When the database is unreachable — most often because Supabase
has paused the project for inactivity — the app says so, instead of reporting a
save failure the visitor caused or a reading that doesn't exist.

### Context

Supabase's free tier has paused this project twice in three weeks. Both times the
app misdescribed the outage. On `/chart`, "See the full reading" fails its insert and
shows `"Save failed, try again."`, which invites a retry that can't work and suggests
the visitor did something wrong. On `/reading/[id]`, *any* RPC error goes to
`notFound()`, so every previously shared link looks **deleted** rather than
temporarily unavailable. The horoscope action's load failure redirects back to that
same page, which then 404s as well.

Sprint 10 made not-found uniform on purpose: a missing id and a malformed id must be
indistinguishable from outside. **That property stays.** An outage is not a fact
about any particular id — it is the same for every request — so reporting it reveals
nothing about which readings exist. This sprint separates the database being *down*
from a reading being *absent*, and nothing else.

**Prior record, checked per planning rule 11:** no sprint file (open or closed), no
`docs/` finding, no CHANGELOG, no tag annotation, and no commit message in this repo
records how `supabase-js` actually responds to a paused project. Pipeman's report
from 27 Sep says only that the CI migrate job failed while paused, and that came from
the Supabase CLI, which is a different client. So the error shape is **genuinely
unmeasured here**, and R1 measures it before anything is built on top of it.

### Requirements

1. **Measure before building.** With the project actually paused, Dev Team records the
   exact `{ data, error }` that `supabase-js` returns, for both the `get_reading_by_id`
   RPC and the `readings` insert, along with what `/api/health/db` reports. Record the
   observations in a findings doc under `docs/` — raw error objects, `supabase-js`
   version, date. Also record a local run against an unreachable URL (a different
   failure mode: DNS or connection refused). If the paused shape differs from the
   unreachable one, both must classify as unavailable.
2. **One shared classifier** in `lib/supabase/` decides whether a Supabase error means
   *the database is unavailable* or something else. It is used by every call site
   below and not reimplemented at each one. Its unit tests use fixtures copied from
   R1's **recorded** error objects, not hand-invented ones, and cover at least: the
   paused shape, a network failure, a malformed-uuid error (Postgres `22P02`), and an
   empty result.
3. **`/reading/[id]`, database unavailable:** shows a "temporarily unavailable" state
   that does not say or imply the reading is missing, with an HTTP **5xx** status,
   not 404 and not 200. It does not echo the requested id.
4. **`/reading/[id]`, not-found stays exactly as it is:** a malformed id and a
   well-formed id that doesn't exist both still return the same 404 as today. This is
   Sprint 10's uniformity property, preserved.
5. **`/chart` save, database unavailable:** the error says readings can't be saved
   right now because the service is unavailable, and to try again in a few minutes,
   not `"Save failed, try again."` Other insert failures (e.g. a constraint violation)
   keep the current generic message. The cast chart and the date the visitor entered
   are still shown with the error.
6. **Casting a chart still works with the database down.** Step 1 is pure
   computation; nothing in this sprint may make `/chart?date=…` depend on the database.
7. **Horoscope action, database unavailable at load:** `generateReadingHoroscope` no
   longer sends the visitor to a page that then reports the reading as missing. The
   visitor ends up in R3's unavailable state (or an equivalent that says the same
   thing).
8. **Logging:** the unavailable path logs the underlying error server-side
   (`console.error`, the Sprint 18 R6 convention). The not-found path stays silent, as
   it is today — logging every 404 would just log probes.
9. **Unchanged:** `/api/health/db` behaviour, every string in `lib/llm/`, Sprint 24's
   labels and flow indicator, and the `"Try again"` retry on horoscope generation
   failure.

### Acceptance Criteria

**QA1 — static:**
- R1: the findings doc exists and contains raw recorded error objects, the
  `supabase-js` version, and a date; it isn't a paraphrase. R2's fixtures match what
  that doc recorded.
- R2: exactly one classifier; every changed call site imports it. No call site keeps
  its own ad-hoc `error.message.includes(...)`.
- R3/R4: trace both paths in `page.tsx`. Malformed id, missing id, and "RPC returned
  an error that isn't an outage" all still reach `notFound()`; only the classifier's
  unavailable verdict takes the new path. The unavailable output contains nothing
  derived from the id.
- R5: a constraint-violation error still produces the old generic message.
- R6: no new database call on the GET path of `/chart`.
- R8: `console.error` on the unavailable paths only.
- R9: `lib/llm/` and `app/api/health/db/route.ts` untouched; `generate.test.ts`
  passes unmodified.
- Build, lint, typecheck, and the full test suite are clean.

**LiveQA — live, on production, with the project paused (Human Prerequisites):**
- Before pausing: note a real reading URL and confirm a nonsense URL (`/reading/abc`)
  and a well-formed missing one (a random uuid) both return 404.
- While paused:
  - the real reading URL returns 5xx with the unavailable message, not 404 (`curl -i`
    for the status, a browser for the page);
  - `/reading/abc` and a random uuid behave as R3/R4 require — record exactly what
    each returns;
  - casting a chart on `/chart` still works (R6);
  - "See the full reading" shows R5's message;
  - `/api/health/db` reports `down`.
- After restore: the real reading loads normally, both 404 cases still 404, and a
  full chart → reading → horoscope run succeeds.

### Out of Scope

- **Preventing the pause** (a keep-alive ping or a paid tier). That's an ops decision
  the user hasn't taken; this sprint makes the outage legible, it doesn't prevent it.
- **The horoscope persist path** (`"Could not save the horoscope, try again."`). The
  database going down *between* the load and the write is rare, and changing it means
  changing the `lib/llm/` strings that tests assert on.
- Retries, backoff, or client-side offline detection.
- `/api/health/db` changes. It already reports `down`; R1 only records what it says.
- Any restyle beyond giving the unavailable state the existing tokens.

### Dependencies

- **Blocked by:** nothing outstanding. The framework 0.2.24 upgrade this sprint was
  written to run under merged 27 Sep 2026 as `f8b122c`.
- **External:** Supabase dashboard access (Human Prerequisites).
- **Blocks:** nothing.

### Human Prerequisites

- **The user pauses and later restores the production Supabase project, from the
  Supabase dashboard, twice:** once during the build, when Dev Team asks, so R1 can
  measure the real failure; and once during LiveQA's pass. No role here has dashboard
  access. There are no preview deployments (dropped in Sprint 5), so **this is a
  deliberate production outage** of a few minutes each time. That's acceptable only
  because the app has no users (Sprint 5's own premise), and the user schedules it.
  After each restore, `/api/health/db` must return `status: "ok"` before the
  requesting role continues.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** not assigned. The classifier, both routes, and the action all
  share one module, so the work doesn't split.

### Risks & Mitigations

- **Over-broad classification** hides a real bug as "unavailable", or turns a
  malformed-id error into a 5xx and breaks Sprint 10's uniformity. — R2 fixtures come
  from real recordings; R4 is a separate QA1 trace and a LiveQA check both before and
  during the pause.
- **The paused response differs from what anyone expects** (e.g. an HTTP error page
  instead of a connection failure). — R1 measures it before any code depends on it.
- **The 5xx doesn't survive rendering** (streaming commits a 200 before the error).
  — LiveQA checks the real status code with `curl -i`, not the page text.
- **The restore takes longer than expected** and leaves production down. — The user
  controls the timing; no role continues until `/api/health/db` is `ok`.
