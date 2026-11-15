---
id: 28
title: "Date page: today by default, chart and events, cast on demand"
epic: "Date pages"
status: in_progress
created: 2026-11-15T21:02:26+00:00
---

# Master Controller Sprint Definition — Sprint 28

**Epic:** Date pages. The app is addressed by **date** instead of by an unguessable
reading link. `/` opens on today. Every date has a page that shows its chart and its
Wikipedia events straight away, plus whichever horoscope has already been written for
that date. A new horoscope is written only when someone asks for one. The epic runs
three sprints: 28 (this sprint) builds the date page and the landing default, plus a
date picker. 29 lists and links to dates that already have a horoscope. 30 is
reserved for whatever 28 and 29 teach us.

**Sprint Objective:** `/` lands on today's date page (UTC). It shows the chart and
Wikipedia events with no click needed, shows the newest saved horoscope for that date
if one exists, and never writes a horoscope automatically. A date picker on the page
navigates straight to any other supported date.

### Context

Today it takes three steps to see a reading: pick a date on `/chart`, save, then open
`/reading/[id]`. The user wants that page's layout and content as the front door, for
today, with no clicks. For example, if today were 11 Nov 2012 the landing page should
look like
`https://my-little-racoon-o5qtyxdnt-bent-metal.vercel.app/reading/a6e6324c-52e6-4374-a86a-7ed58e0f7e11`.
Any other date should be one picker step away.

**This sprint deliberately reverses a Sprint 4 decision, and the user chose to (15 Nov
2026).** Since Sprint 4 a reading has been reachable only by its unguessable id. There
is no select policy on `readings`, and `get_reading_by_id` is the only read path (see
`20260816134147_readings_rls_policies.sql`). PRD v1 line 149 listed "searchable by
date" as future scope. Readings hold no personal data: a date, computed positions,
public Wikipedia events and generated text. The user decided:
- (a) readings become findable **by date**;
- (b) when a date has several readings, show the **newest one with a horoscope**;
- (c) viewing a date **writes nothing**, and a row is written only when someone casts;
- (d) "today" means the **UTC** date.

These decisions are recorded in `docs/decisions.md`. What does *not* change: the table
still has no select policy, anon still cannot list the table (Sprint 4's enumeration
test stays and must still pass), and every existing `/reading/[id]` link keeps working
exactly as it does now.

**Prior record checked (planning rule 11).** Sprint 4's file and migration hold the
enumeration rationale. PRD v1 holds the "searchable by date" note. No closed sprint,
`docs/` finding, CHANGELOG entry or tag has measured anything this sprint relies on.

### Requirements

1. **Date-addressed route.** `/date/YYYY-MM-DD` (Dev Team may pick a different
   path, but name it in the handoff) renders a page with the same layout and content
   as the current `/reading/[id]` page: date band, constellation, positions and
   balance, Wikipedia events, and the horoscope panel. Reuse the existing components
   and display helpers rather than forking them.
   - A malformed date returns the same 404 an unknown reading id gets.
   - A date outside the engine's supported range (1700-01-01 to 2100-12-31,
     `lib/ephemeris/adapter.ts`) also returns that 404.
2. **`/` lands on today (UTC).** `/` sends the visitor to the date page for the
   current **UTC** date. The `next.config.ts` static redirect to `/chart` is replaced.
   The date must be worked out **per request**, never at build time or from a cached
   response, so the landing page still points at the right day after midnight UTC
   without a redeploy.
3. **The date page writes nothing on view.** If no saved reading with a horoscope
   exists for the date, the chart is computed from the date, the same way `/chart`
   does it now (`calculationInstantForDate` and `computePositions`), and events come
   from `fetchDayEvents`. Loading, reloading or crawling a date page must not insert,
   update or call OpenAI, under any circumstances.
4. **Lookup of the saved horoscope for a date.** A new migration adds a
   `security definer` function, with `search_path` pinned, the same shape as
   `get_reading_by_id`. It takes a date as an explicit argument and returns **at most
   one** row: the reading for that `event_date` with a non-null `horoscope` and the
   latest `horoscope_generated_at`. It returns nothing when no such row exists.
   - No select policy is added to `readings`.
   - Nothing in this sprint can return more than one row per call.
   - Anon gets execute on this function only.
   - The migration ends with its `schema_migrations` insert, per the project's
     migration convention.
   - **When the lookup returns a row,** the page renders that row's stored
     positions, events and horoscope, exactly as `/reading/[id]` does for its row.
     It does not re-fetch events next to an old horoscope.
5. **Cast on demand.** If there is no saved horoscope and `isHoroscopeEnabled()` is
   true, the page shows the **Write the horoscope** action. Submitting it:
   - inserts a reading for that date (positions and events, as `saveReading` does);
   - generates and persists the horoscope through the existing
     `generateAndPersistHoroscope`;
   - returns the visitor to the **date page**, which now shows the horoscope.

   When generation is disabled, the page shows the existing disabled note, has no
   form, and the action itself refuses without inserting anything. Failure handling
   follows the existing patterns:
   - A generation failure returns to the date page with the existing error message.
   - A database outage is classified with `lib/supabase/availability.ts` (Sprint 25's
     allowlist), never with a new ad-hoc check.
   - A row left without a horoscope after a failed generation is acceptable. The R4
     lookup never shows it.
6. **Lookup outage degrades, it doesn't blank the front door.** If the R4 lookup is
   classified as unavailable, the date page still renders the chart and events, which
   don't need the database. In place of the horoscope panel it shows a plain notice
   that saved horoscopes can't be loaded right now, with no cast action. The outage
   is logged in full, the same way R8 of Sprint 25 does it.
7. **Date picker.** The date page has a date input with min and max set to the
   supported range, prefilled with the page's own date. Submitting it lands on that
   date's page. It works as a plain form submit with no client-side JavaScript
   required, the same way the `/chart` form works now. An invalid or out-of-range
   value lands on the R1 404 or a clear message, never a 500.
8. **Copy that no longer fits is removed from the date page.**
   - The "sealed · anyone with the link" line is replaced (Dev Team's wording) or
     dropped.
   - The three-step `FlowIndicator` is not shown on the date page, because the
     chart, save, reading flow it describes no longer happens there.
   - `/chart` and `/reading/[id]` keep their current copy and indicator unchanged.
9. **Existing routes keep working.** `/reading/[id]` behaves exactly as it does now,
   including its 404 uniformity and Sprint 25's outage behaviour. `/chart` stays
   reachable directly and is not removed in this sprint.
10. **Tests.**
    - The R4 function is covered in `supabase/tests/`:
      - it returns exactly one row when several readings with a horoscope exist for
        the date, and that row is the newest;
      - it returns nothing for a date that only has readings without a horoscope;
      - it returns nothing for a date with no readings;
      - anon still cannot select from `readings` directly, and Sprint 4's existing
        tests pass unchanged.
    - Unit tests cover the UTC "today" calculation (including just before and just
      after 00:00 UTC) and date-parameter validation (malformed, out of range,
      boundary dates).
    - `lib/readings-access-guardrail.ts` passes unchanged. If the new code trips it,
      the code is wrong, not the guardrail.
11. **`docs/PRD_v3_date_pages.md` is committed unchanged** as part of this sprint's
    first commit (Master Controller wrote it; the commit wrapper Master Controller
    uses can't commit outside `docs/sprints/` or the decisions log).
12. **Every write to `readings` is server-authored. Anon has no write path at all.**
    *(Amendment, 15 Nov 2026, after Dev Team 1's escalation on build commit
    `647aa43`.)*

    **Why.** Decision (a) puts the newest saved horoscope for today on the front
    page, so anything anon can write there is a public defacement path. Revoking
    anon's column-level INSERT on the three horoscope columns, as Dev Team proposed,
    closes only one of three routes:
    1. A direct insert with arbitrary `horoscope` text and a future
       `horoscope_generated_at`. The column revoke closes this one.
    2. Insert a row with permitted columns only, choosing its id, since anon picks
       the id client-side. Then call `set_reading_horoscope(id, '<any text>', ...)`
       directly. Anon has had EXECUTE on that function since Sprint 17, and it
       writes `horoscope_generated_at = now()`, so that row wins its date. Two
       calls, and the column revoke doesn't stop it.
    3. Insert a row with fabricated `events` (and `positions`). Then submit
       `/reading/[id]`'s existing "Write the horoscope" action with that id.
       The server writes a genuine horoscope over the attacker's content, which
       also gives a prompt-injection channel through `events`. R4 then shows that
       row, fabricated events included, on the date page.

    **The requirement.**
    - **(a)** A new migration revokes INSERT on `public.readings` from `anon` and
      `authenticated`, and drops the `"anon can insert readings"` policy. It also
      revokes EXECUTE on `set_reading_horoscope` from `anon`, `authenticated` and
      `PUBLIC`. Check whether the project's default-privileges migration
      (`20260816125144`) re-grants either one, and neutralise it if so.
    - **(b)** All three server-side writers use the server-only admin client
      (`lib/supabase/admin.ts`, `SUPABASE_SERVICE_ROLE_KEY`):
      - `saveReading` (`/chart`);
      - the date page's cast action;
      - `generateAndPersistHoroscope`'s persist step.

      Every inserted value stays server-computed (date-derived positions, events
      from `fetchDayEvents`), as it is now. No client-supplied value other than
      the date, and for `/reading/[id]` the id, reaches a write.
    - **(c)** The admin client may be imported only from server-only modules: route
      handlers, `"use server"` files, and `lib/` modules imported solely by those.
      Update `admin.ts`'s header comment, which currently says only the health route
      imports it, to say what is now true.
    - **(d)** Reads don't change. Every read stays on the anon client through
      `get_reading_by_id` / `get_reading_by_date`. The service role is used for
      writes only, never to read rows back.
    - **(e)** Tests, in `supabase/tests/`:
      - anon `.insert` into `readings` fails;
      - anon `rpc('set_reading_horoscope', ...)` fails;
      - the R10 `get_reading_by_date` tests seed their rows through the service-role
        client.

      **This deliberately reverses Sprint 4's "can insert a reading" test.** Change
      that test to assert the denial, and say so in its comment. Don't delete it.
    - **(f)** Supersedes Dev Team's column-level-grant proposal. Don't build both.
      With no anon insert at all, a column grant has nothing left to restrict.

### Acceptance Criteria

**QA1 (static):**
- **R1, R7, R9:** read the route, the validation and the picker form.
  - Malformed and out-of-range dates reach `notFound()` (or R7's message), never an
    unhandled throw.
  - `/reading/[id]` is unchanged apart from any extracted shared components, and its
    lookup and 404 path are byte-identical in behaviour.
- **R2:** the redirect or render for `/` computes the date per request. Point to
  what keeps it dynamic: no `force-static`, no build-time constant, and no cached
  redirect that a CDN would hold past midnight. A 307 is acceptable; a 308 or
  `permanent: true` is a FAIL, for Sprint 11's caching reason.
- **R3:** trace every code path the date page's GET render can take. None of them
  reaches `.insert(`, `set_reading_horoscope`, or the OpenAI client. Writes are
  reachable only from the R5 server action.
- **R4:** read the migration.
  - It is `security definer` with a pinned `search_path`, takes a `date`, and returns
    at most one row (`limit 1` or an equivalent shape), ordered by
    `horoscope_generated_at desc` and filtered to `horoscope is not null`.
  - No `create policy ... for select` is added.
  - Execute is granted to anon and authenticated only.
  - It ends with the `schema_migrations` insert.
- **R5:** the action checks `isHoroscopeEnabled()` **before** inserting. Its outage
  path uses `isDatabaseUnavailable`, and it redirects to the date page, not to
  `/reading/[id]`.
- **R6:** the lookup's unavailable branch renders the chart and events, plus the
  notice, rather than throwing to `error.tsx`.
- **R8:** the date page doesn't render `FlowIndicator` or the word "sealed".
- **R10:** the tests exist and assert what R10 lists. `npm test`, lint, build and
  the RLS suite are green in the handoff output.
- **R11:** the PRD file in the diff matches the file Master Controller left (no
  edits).
- **R12:**
  - **Migration.** The new migration revokes anon and authenticated INSERT on
    `readings`, drops the insert policy, and revokes EXECUTE on
    `set_reading_horoscope` from anon, authenticated and PUBLIC. Nothing in the
    default-privileges migration re-grants either one.
  - **Clients.** `grep` shows no `anon.from("readings").insert` and no
    `anon.rpc("set_reading_horoscope"` left anywhere in `app/` or `lib/`. The admin
    client is imported only from server-only modules (R12c).
  - **Inputs.** Trace each of the three writers. No form field other than the date
    (or `/reading/[id]`'s id) reaches an inserted or updated value.
  - **Tests.** The R12e tests exist, and the Sprint 4 test is inverted with a
    comment, not removed.
  - **Re-test all three attacks.** Re-read routes 1–3 in R12 against the final
    code. Each must now fail at the database, not just in the app.

**LiveQA (against the deployed app, after Pipeman pushes):**
1. Open `/` with no path. It lands on today's **UTC** date page, and the date shown
   matches `date -u +%F` at the time of the test. The chart and events are visible
   with no click.
2. On a date with no saved horoscope:
   - the **Write the horoscope** action is visible if generation is enabled in
     production, or the disabled note is if it isn't. Record which.
   - Reload it three times, then confirm **no row was written** for that date. Anon
     can't count rows (there's no select policy), and `/api/health/db` doesn't report
     row counts. Ask the user for the `readings` row count for that `event_date`
     from the Supabase dashboard's table editor, before and after the reloads. If
     that isn't available, record what was tried and rely on QA1's R3 trace. Don't
     report it as verified.
3. Use the picker to go to a date that already has a horoscope, for example the
   date of `/reading/5bf3a1f5-b47f-4dfa-9a42-41f18eb24861`, or one LiveQA creates in
   step 4. The saved horoscope is shown and no cast action appears.
4. **If generation is enabled:** cast on a fresh date. The visitor lands back on the
   date page with the horoscope shown, and a reload still shows it. **If it is
   disabled:** record that step 4 couldn't run, and why. Don't flip the variable
   yourself, because that's a human prerequisite (below).
5. Use the picker with a boundary date (1700-01-01) and with an out-of-range or
   hand-typed malformed URL (`/date/2012-13-45`, `/date/abc`). The boundary date
   renders; the malformed ones give a 404 or a clear message, never a 500.
6. An existing `/reading/[id]` link still renders exactly as before, including its
   flow indicator. `/chart` still works.
7. Phone width (about 390px): the picker and the page lay out without horizontal
   scroll.
8. **R12, against production.** Use the public anon key from the deployed page's
   own bundle (it's public by design). With `curl` or `supabase-js`:
   - attempt an insert into `readings` and a `set_reading_horoscope` RPC call. Both
     must be **denied**. Record the error codes.
   - Then submit `/chart`'s save and confirm it still lands on a new
     `/reading/[id]`. The server-side write path works.

   Don't use any key other than the anon key for this step.

### Out of Scope
- **Listing or linking to dates that have readings.** That is sprint 29, and it needs
  its own decision about what can be listed and how.
- **Visitor-local "today".** The user chose UTC (decision d). Local time needs a
  client step and would be a separate sprint.
- **Merging duplicate readings or adding a unique constraint on `event_date`.** The
  user chose "newest with a horoscope" over enforcing one row per date (decision b).
- **Removing `/chart`, `/reading/[id]` or `FlowIndicator`.** They stay working; a
  later sprint can retire them deliberately once date pages have proven themselves.
- **Regenerating or replacing an existing horoscope** from the date page.
- **Preventing a double-submit second cast.** Two near-simultaneous casts give two
  rows, and R4 shows the newer. That's harmless; see Risks.
- **Keeping Supabase from pausing** (keep-alive or paid tier). This is still the
  user's open decision. R6 just keeps the front door usable while it's paused.

### Dependencies
- Blocks: sprint 29 (browse dates with readings) builds on R4's date lookup and R1's
  route.
- Blocked by: none in the repo. Sprint 27's pinned CLI is what will apply R4's
  migration in CI.
- External: Supabase (the migration is applied by CI's `migrate` job), Wikipedia's
  on-this-day API (already in use), OpenAI (only for LiveQA step 4).

### Human Prerequisites
- **Decide whether horoscope generation should be on in production when LiveQA
  runs.** As of 15 Nov 2026 the live site still reports generation disabled after
  `HOROSCOPE_ENABLED` was changed in Vercel, and that's being investigated separately.
  If it is still disabled at LiveQA time, steps 1–3 and 5–7 still run and step 4 is
  recorded as not run. For a full pass, the user confirms `HOROSCOPE_ENABLED` is
  `true` (or deleted) for **Production** in Vercel and redeploys **before** handing
  off to LiveQA.
- **`SUPABASE_SERVICE_ROLE_KEY` must be set for Production in Vercel** (R12b).
  It's expected to already exist, because `/api/health/db` uses the admin client and
  reports `connected: true` in production. Nobody needs to act unless that changes.
  It must never be prefixed `NEXT_PUBLIC_`.
- Supabase must be awake (not paused) when CI's `migrate` job applies R4's
  migration, and again during LiveQA. If it has paused, the user restores it from the
  Supabase dashboard.

### Team Assignments
- **Dev Team 1:** the whole sprint. The route, the lookup function, the action and
  the picker share files (`app/reading/[id]/*` components, the new route, the
  migration and its tests), so splitting it would mean both teams touching the same
  code.
- **Dev Team 2:** not assigned.

### Risks & Mitigations
- **The date lookup makes every saved horoscope reachable by iterating dates**
  (about 146k calls across 1700–2100). This is accepted under decision (a) and is
  what sprint 29 builds on anyway. The function still returns one row per call, and
  no table-level listing is added, so Sprint 4's enumeration test keeps meaning what
  it says.
- **`/` or a date page being statically cached by Next.js or Vercel**, which would
  give a stale "today" or hide a just-cast horoscope. R2 and QA1's R2 check rule
  this out statically, and LiveQA steps 1 and 4 catch it live.
- **Page views starting to write rows** through a careless refactor of `saveReading`
  into the render path. R3's explicit trace is the guard; LiveQA step 2 is the live
  check.
- **Wikipedia calls on every uncached date view.** `fetchDayEvents` already caches
  by month and day per instance and never throws (Sprint 16), so an outage there
  shows the existing "events unavailable" label rather than an error.
- **A Supabase pause takes down the landing page.** R6 renders the chart and events
  without the database instead.
- **Divergence between `/reading/[id]` and the date page** if components get forked.
  R1 requires reuse, and QA1 checks that the old route behaves the same.
- **Anon-writable content shown on the front page** (R12). All writes move to the
  server, and the database denies anon outright. This is checked statically (QA1)
  and live (LiveQA step 8).
- **Window between CI's `migrate` and the deploy hook** (minutes). The old build
  still writes with anon, so `/chart` saves fail with the outage message during
  that window. This is accepted, because it's the same run and nothing is lost but
  a retry. Don't split this into expand and contract.
- **Rows written before this sprint through the old anon paths** could still hold
  arbitrary text and surface on their date page. No such row is known; exploiting
  this needed the raw RPC. Out of scope for this sprint. If it ever matters, it's a
  one-off review of `horoscope` rows in the Supabase dashboard, not code.
