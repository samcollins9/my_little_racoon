---
id: 25
title: "Database outage handling"
epic: "Operability"
status: done
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

**Amended after LiveQA round 1 (FAIL, 27 Sep 2026, verdict commit `5a874f9`).** R1 was
done properly and recorded one real paused state: during Dev Team's pause (~19:59Z) the
project stopped resolving in DNS, and `supabase-js` came back with `status: 0` and an
empty `code`. The classifier was built on exactly that shape. During LiveQA's pause
(~20:53Z–21:01Z), production's own `/api/health/db` reported
`"Project paused. Please unpause the project before proceeding."`, which means that
time Supabase **answered with an HTTP response** rather than failing to resolve. The
classifier didn't recognise it, and all three outage paths behaved exactly as they did
before this sprint. **A paused project is not one shape.** Why the two pauses differed
(time since pausing, DNS caching, something on Supabase's side) is unconfirmed, and
this sprint no longer depends on knowing. The amendments below make an unrecognised
error count as unavailable by default. Which errors count as *not an outage* is now an
explicit list taken from recordings, instead of which errors count as *an outage*.

### Requirements

1. **Measure before building.** With the project actually paused, Dev Team records the
   exact `{ data, error }` that `supabase-js` returns, for both the `get_reading_by_id`
   RPC and the `readings` insert, along with what `/api/health/db` reports. Record the
   observations in a findings doc under `docs/` — raw error objects, `supabase-js`
   version, date. Also record a local run against an unreachable URL (a different
   failure mode: DNS or connection refused). If the paused shape differs from the
   unreachable one, both must classify as unavailable.

   **R1b (added round 1).** The findings doc is corrected: finding 1 ("a paused
   project stops resolving in DNS") becomes "one of at least two paused states
   observed", and it cites LiveQA's round-1 evidence (the health endpoint's
   `"Project paused…"` message, its time window, and that nothing else about that
   response was captured). During the retest pause, Dev Team runs the same measurement
   script **before** LiveQA begins. If it records a new shape, that shape goes into
   the findings doc and LiveQA's notes (see Acceptance Criteria). It is **not** a
   precondition for the fix, which no longer depends on it.
2. **One shared classifier** in `lib/supabase/` decides whether a Supabase error means
   *the database is unavailable* or something else. It is used by every call site
   below and not reimplemented at each one. Its unit tests use fixtures copied from
   R1's **recorded** error objects, not hand-invented ones, and cover at least: the
   paused shape, a network failure, a malformed-uuid error (Postgres `22P02`), and an
   empty result.

   **The rule, amended round 1: only the listed shapes count as "not an outage";
   every other error counts as unavailable.**
   - *Reading lookup (RPC):* an empty result and a `22P02` malformed-id error are
     *not found*. **Every other error is unavailable.**
   - *Reading insert:* an error carrying a Postgres SQLSTATE in class `22` (data
     exception) or class `23` (integrity constraint, e.g. the recorded `23502`) keeps
     the generic save message. **Every other error is unavailable.**
   - The unit tests add one case, clearly labelled synthetic, for an error shape
     matching no recording (non-zero HTTP status, no SQLSTATE). It must classify as
     unavailable. That is the only hand-built fixture allowed, because it tests the
     default branch; it makes no claim about what Supabase actually sends.
   - **Cost, accepted deliberately:** a real server-side bug in the RPC now shows
     "temporarily unavailable" with a 5xx, not a 404. For a server fault that is the
     honest status, and R8 logs it.
3. **`/reading/[id]`, database unavailable:** shows a "temporarily unavailable" state
   that does not say or imply the reading is missing, with an HTTP **5xx** status,
   not 404 and not 200. It does not echo the requested id.
4. **`/reading/[id]`, not-found stays exactly as it is:** a malformed id and a
   well-formed id that doesn't exist both still return the same 404 as today. This is
   Sprint 10's uniformity property, preserved. **During an outage (amended round
   1),** the real reading, `/reading/abc`, and a random uuid all return the **same**
   unavailable 5xx response. Uniformity holds because every request looks the same
   during an outage, not because any of them is a 404.
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
   it is today — logging every 404 would just log probes. **Amended round 1:** the log
   line includes the **whole** error object (`code`, `message`, `details`, `hint`) and
   the HTTP `status`, not just the message. The next shape nobody has seen yet should
   end up in the logs in full; this round's didn't.
9. **Unchanged:** `/api/health/db` behaviour, every string in `lib/llm/`, Sprint 24's
   labels and flow indicator, and the `"Try again"` retry on horoscope generation
   failure.

### Acceptance Criteria

**QA1 — static:**
- R1: the findings doc exists and contains raw recorded error objects, the
  `supabase-js` version, and a date; it isn't a paraphrase. R2's fixtures match what
  that doc recorded. R1b: finding 1 is corrected and cites LiveQA's round-1 evidence.
- R2: exactly one classifier; every changed call site imports it. No call site keeps
  its own ad-hoc `error.message.includes(...)`. **The classifier's default branch is
  "unavailable":** check that the only ways to get "not an outage" are the listed
  shapes (empty result or `22P02` for the RPC; SQLSTATE class `22`/`23` for the
  insert). The synthetic unknown-shape test exists and is labelled synthetic. No
  message text is matched, including `"Project paused"`.
- R3/R4 (amended round 1): trace `page.tsx`. Only an empty result and a `22P02` reach
  `notFound()`; every other RPC error takes the unavailable path. The unavailable
  output contains nothing derived from the id.
- R5: a constraint-violation error still produces the old generic message.
- R6: no new database call on the GET path of `/chart`.
- R8: `console.error` on the unavailable paths only, logging the whole error object
  and the HTTP status.
- R9: `lib/llm/` and `app/api/health/db/route.ts` untouched; `generate.test.ts`
  passes unmodified.
- Build, lint, typecheck, and the full test suite are clean.

**LiveQA — live, on production, with the project paused (Human Prerequisites):**
- Before pausing: note a real reading URL and confirm a nonsense URL (`/reading/abc`)
  and a well-formed missing one (a random uuid) both return 404.
- While paused (start only after Dev Team's R1b probe run is done):
  - the real reading URL returns 5xx with the unavailable message, not 404 (`curl -i`
    for the status, a browser for the page);
  - `/reading/abc` and a random uuid return the **same** unavailable 5xx as the real
    reading (R4, amended). Record the status and body of all three;
  - record what `/api/health/db`'s `error` field says, so the round-2 pause's shape is
    on record next to round 1's;
  - casting a chart on `/chart` still works (R6);
  - "See the full reading" shows R5's message;
  - `/api/health/db` reports `down`.
- After restore: the real reading loads normally, both 404 cases still 404, and a
  full chart → reading → horoscope run succeeds.
- R8, live: **try it before recording it as untestable.** Once the user has logged in
  the Vercel CLI (Human Prerequisites), run `vercel logs` for the production
  deployment over the pause window and confirm each unavailable request logged the
  whole error object and a status. Record the logged paused shape verbatim; it's the
  first full capture of a paused response as the deployed runtime sees it. If the
  logs still can't be reached, record exactly what you tried and what failed.

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
- **Added round 1: a third pause, for the round-2 retest.** It happens after the fix is
  reshipped. Dev Team 1 runs its R1b probe first, then LiveQA tests. Same outage terms
  as above.
- **Added round 1: log in to the Vercel CLI** (`vercel login`) on this machine before
  the retest. The CLI is installed but currently logged out (checked 27 Sep:
  `vercel whoami` → "Logged out"). That's why R8 couldn't be checked live in round 1.
  If you'd rather not log the CLI in, read the function logs for the pause window in
  the Vercel dashboard yourself and give LiveQA what they show.

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
  instead of a connection failure). — R1 measured it. **This happened anyway in round 1:**
  a second pause produced a different shape from the first. Mitigation now: the
  classifier treats unknown errors as unavailable (R2, amended), and R8 logs every
  unknown shape in full.
- **Treating unknown errors as unavailable hides a real bug behind "temporarily
  unavailable".** — Accepted: it gets a 5xx, which is correct for a server fault, and
  R8 logs the full object. Neither 404 case can be affected, because both are on the
  explicit list and tested from recordings.
- **The 5xx doesn't survive rendering** (streaming commits a 200 before the error).
  — LiveQA checks the real status code with `curl -i`, not the page text.
- **The restore takes longer than expected** and leaves production down. — The user
  controls the timing; no role continues until `/api/health/db` is `ok`.
