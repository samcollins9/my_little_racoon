---
id: 29
title: "Browse dates that have readings"
epic: "Date pages"
status: in_progress
created: 2026-11-22T13:44:02+00:00
---

# Master Controller Sprint Definition — Sprint 29

**Epic:** Date pages. The app is addressed by date. `/` opens on today, and every date
page shows its chart, events and newest saved horoscope (Sprint 28). This sprint makes
the dates that already have a horoscope discoverable from that page.

**Sprint Objective:** A date page links to the previous and next dates that have a
saved horoscope, and to a capped list of the most recently written ones. Only dates
are exposed: no horoscope text and no rows.

### Context

Sprint 28 shipped the date page and the picker, but a visitor can find an existing
horoscope only by guessing its date. The user chose (22 Nov 2026), from the options in
`docs/PRD_v3_date_pages.md` §4:
- **previous / next links** on the date page, plus a **capped list of dates**;
- **no previews**;
- **retiring `/chart` stays a separate, later sprint.**

This builds on decision (1) in `docs/decisions.md`, that readings are findable by date,
and on Sprint 28's R12 lockdown: every saved horoscope is server-authored, so listing
them can't surface planted text.

**Prior record checked (planning rule 11).** Sprint 28's file, its two migrations
(`20261115211107_get_reading_by_date`, `20261115212732_readings_server_authored_writes`)
and `docs/decisions.md` define the current access model, and this sprint extends it
in the same shape. No closed sprint, `docs/` finding, CHANGELOG entry or tag records a
measurement this sprint relies on.

### Requirements

1. **Date-only lookup functions.** One new migration adds `security definer` functions
   with a pinned `search_path`, the same shape as `get_reading_by_date`. Each one
   **returns dates only**: no column of `readings` other than `event_date` leaves the
   function. Both consider only rows with `horoscope is not null`.
   - **(a) Adjacent dates.** Given a date, returns the nearest `event_date` strictly
     before it and the nearest strictly after it, each null when there is none. The
     given date itself is never returned, whether or not it has a horoscope.
   - **(b) Recently written.** Returns at most **20** distinct dates, ordered by each
     date's newest `horoscope_generated_at`, most recent first.
     - The cap is fixed inside the function. If Dev Team adds a limit parameter, the
       function clamps it to 20, so no caller can raise it.
     - A date with several readings appears once.
   - Execute is granted to `anon` and `authenticated` only, matching the two existing
     lookup functions.
   - No select policy is added to `readings`.
   - The migration ends with its `schema_migrations` insert.
2. **Previous / next links on the date page.** The date page shows a link to the
   previous date with a reading and one to the next, each labelled with its date in
   the page's existing long-date format. Each link goes to that date's `/date/…` page.
   A side with no such date shows no link; don't render a disabled placeholder that
   reads like a broken link.
3. **Recent readings list on the date page.** The date page shows the R1b dates as
   links to their date pages, labelled in the long-date format. The current page's
   own date, if it's in the list, is marked as current rather than linked. When there
   are no dates at all, the section is omitted.
4. **The page still renders when these lookups fail.**
   - Classify R1's calls with `lib/supabase/availability.ts`, never an ad-hoc check.
   - If either lookup is unavailable, the date page renders exactly as Sprint 28 does,
     with or without its own R6 notice, and simply omits the R2/R3 navigation. Never
     throw to `error.tsx`, and never blank the chart and events.
   - Log the failure in full, the same way Sprint 25's R8 does.
   - If Sprint 28's horoscope lookup and these lookups both fail, the visitor sees
     Sprint 28's notice once, not a second one.
5. **Still write-free and still fresh.** The GET render of a date page performs no
   insert or update and makes no OpenAI call (Sprint 28 R3 holds). After a cast, a
   reload of any date page shows the new date in its prev/next links and in the
   recent list. Nothing is statically cached.
6. **Placement fits phone and desktop.** The navigation sits with the date picker, or
   directly under it, so finding another date happens in one place. At about 390px it
   lays out without horizontal scroll. Exact layout and wording are Dev Team's call.
7. **`/reading/[id]` and `/chart` are unchanged.** The new navigation is on the date
   page only.
8. **Tests.**
   - In `supabase/tests/`, with rows seeded through the service-role client (R12 of
     Sprint 28):
     - R1a:
       - returns the right neighbours;
       - ignores rows without a horoscope;
       - excludes the given date itself;
       - returns null on each side at the edges;
       - is correct when a neighbouring date has several readings.
     - R1b:
       - returns at most 20 dates even when more than 20 exist;
       - has no duplicate dates;
       - is ordered by newest generation;
       - ignores rows without a horoscope.
     - Both: the result shape contains no column other than a date.
     - Anon still cannot select from or insert into `readings` directly. Sprint 4's
       and Sprint 28's existing tests pass unchanged.
   - Unit tests cover the navigation's data shaping: no previous or next, current date
     inside the recent list, an empty list, and the lookup-unavailable path.
   - `lib/readings-access-guardrail.ts` passes unchanged.

### Acceptance Criteria

**QA1 (static):**
- **R1:**
  - Read the migration.
  - Both functions are `security definer` with a pinned `search_path` and filter
    `horoscope is not null`.
  - Each returns only a date type (or a record of dates). `returns setof
    public.readings`, or any return including another column, is a FAIL.
  - R1a uses strict `<` and `>`.
  - R1b's 20 is enforced inside SQL and can't be raised by any argument.
  - Grants are anon and authenticated only.
  - There is no new policy, and the migration ends with the `schema_migrations`
    insert.
- **R2, R3:** read the components. Links target `/date/YYYY-MM-DD`, an empty side
  renders nothing, and the current date isn't self-linked.
- **R4:** the R1 calls go through `isDatabaseUnavailable` and are logged in full. The
  unavailable path omits the navigation and doesn't throw. Trace the case where both
  Sprint 28's lookup and R1 fail, and confirm there's only one notice.
- **R5:** trace the GET render again. No `.insert(`, no `set_reading_horoscope`, no
  admin client and no OpenAI client. There's no `force-static`, `revalidate` or other
  caching on the route.
- **R7:** the diff doesn't touch `app/reading/[id]/` or `app/chart/` behaviour.
  Shared-component edits are fine if those routes render identically.
- **R8:** the tests exist and assert what R8 lists. `npm test`, typecheck, lint and
  build are green in the handoff. The RLS suite's first real run is CI's `rls-tests`
  job, so Pipeman's push report must show it green.

**LiveQA (against the deployed app, after Pipeman pushes):**
1. **Seed real data if needed.** Production needs at least three dates with
   horoscopes, spread so that one date has both a previous and a next. If fewer
   exist, cast on enough dates through the date page itself to get there. Generation
   is on in production; each cast is one `gpt-4o-mini` call. Record which dates you
   cast.
2. On a middle date, the previous and next links show the right neighbouring dates
   and land on their date pages, which show their saved horoscopes.
3. On the earliest and the latest date with a reading, the outer side shows no link.
4. The recent list shows at most 20 dates, the newest-written first. Every entry
   links to a working date page, and the current date is marked, not linked.
5. **Freshness.** Cast on one more new date, then reload a different date page. The
   new date appears at the top of the recent list and, where it applies, as a
   neighbour.
6. **Dates only.** Call both R1 functions directly with the public anon key from the
   deployed bundle (`curl` or `supabase-js`, anon key only). The responses contain
   dates and nothing else: no horoscope text, ids or events. A direct anon select on
   `readings` is still denied.
7. At phone width (about 390px), the navigation lays out without horizontal scroll.
8. `/reading/[id]` and `/chart` still render as before.

### Out of Scope
- **Horoscope previews in the list.** The user declined them, and they would widen
  the exposed data from dates to text.
- **Pagination or a full index page.** The 20-date cap is the whole listing for now.
- **Marking days inside the date picker.** The native date input can't mark
  individual days; that needs a custom calendar component, a separate decision.
- **Retiring `/chart` and the 3-step indicator.** That's a separate, later sprint, by
  the user's choice.
- **Visitor-local "today", merging duplicates, regenerating a horoscope.** These are
  unchanged from Sprint 28's Out of Scope.

### Dependencies
- Blocks: none planned. A later sprint may retire `/chart`.
- Blocked by: Sprint 28 (done 18 Nov 2026), which provides the date page, the
  date-lookup access model and server-authored writes.
- External: Supabase (CI's `migrate` applies the migration), OpenAI (only for LiveQA
  seeding casts).

### Human Prerequisites
- Supabase must be awake (not paused) when CI's `migrate` job runs and during
  LiveQA. If it has paused, the user restores it from the Supabase dashboard.
- Otherwise none. `HOROSCOPE_ENABLED` is already `true` in production (confirmed
  live, 15 Nov 2026), and LiveQA's seeding casts go through the app itself.

### Team Assignments
- **Dev Team 1:** the whole sprint. It all lives in the date page, its loader and one
  migration.
- **Dev Team 2:** not assigned.

### Risks & Mitigations
- **The list exposes more than dates** through a function returning whole rows, which
  would leak horoscope text. R1 restricts return types, QA1 treats any other column
  as a FAIL, and LiveQA step 6 checks it live.
- **An unbounded list** as readings grow. The cap is fixed in SQL and enforced
  regardless of arguments (R1b, QA1 R1).
- **Navigation failures blanking the front door during a Supabase pause.** R4 omits
  the navigation instead.
- **Extra lookups slowing every date view.** These are two small indexed-or-scanned
  queries on a tiny table. If Dev Team finds this needs an index on
  `(event_date) where horoscope is not null`, it may add one in the same migration and
  say so in the handoff.
- **LiveQA's seeding casts cost money and leave permanent rows.** That's a handful of
  `gpt-4o-mini` calls, and the rows are real readings visible to everyone, which is
  the intended outcome. LiveQA records which dates it cast so they aren't mistaken for
  organic use.
