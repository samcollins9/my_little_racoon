---
id: 32
title: "Recently written list sorted by date"
epic: "Date pages"
status: done
created: 2026-11-23T00:36:58+00:00
---

# Master Controller Sprint Definition — Sprint 32

**Epic:** Date pages. The app is addressed by date. Each date page carries
previous/next links and a "Recently written" list of up to 20 exact-date readings
(Sprints 29–30).

**Sprint Objective:** The "Recently written" list shows the same 20 dates as now, in
ascending order of the date displayed (oldest date first) instead of in the order
their horoscopes were written.

### Context

`get_recent_reading_dates()` picks the 20 qualifying dates with the newest generation
and returns them newest-generation first. The page renders them in that order, so
the list reads as random dates. The user chose, on 23 Nov 2026: **keep the same 20
and sort them by date**. That means the selection doesn't change, the heading
"Recently written" stays accurate, and nothing changes in the database.

**Prior record checked (planning rule 11).** Sprint 29's R1b and Sprint 30's R2
define the selection and the cap. No finding records a measurement this sprint
relies on.

### Requirements

1. **Display order: ascending by `event_date`.** The 20 dates shown are exactly the
   ones `get_recent_reading_dates()` returns, rendered oldest first. This applies to
   both the desktop list and the phone layout's collapsed "Recently written (n)"
   list.
2. **Selection unchanged.** No migration, and no change to
   `get_recent_reading_dates()` or `get_adjacent_reading_dates()`. Sort after
   fetching, in the date page's data shaping, not in SQL. The cap still applies to
   "most recently written" before sorting.
3. **Everything else unchanged.** Previous/next links, the current-date marker
   (`aria-current`, not linked), the lookup-unavailable behaviour, labels and layout
   all stay as they are.
4. **Tests.** A unit test feeds dates in generation order, deliberately not date
   order, and asserts the rendered or shaped list comes out in ascending date order.
   It includes dates in different years and different months, and one in the 1700s
   alongside 20th-century dates. Existing navigation tests pass unchanged or are
   updated only for the order.

### Acceptance Criteria

**QA1 (static):**
- **R1:** the sort compares dates correctly, by `YYYY-MM-DD` string or as a date,
  never on the formatted long-date label.
- **R2:** no file under `supabase/` changes, and the sort happens after the RPC
  result is read.
- **R3:** the diff is limited to the date page's navigation shaping and/or
  `DateNavigation.tsx` and their tests.
- **R4:** the test exists with out-of-order input. `npm test`, typecheck, lint and
  build are green.

**LiveQA (against the deployed app, after Pipeman pushes):**
1. On a date page, "Recently written" lists dates oldest-first, both on desktop and in
   the phone layout's collapsed list.
2. The set of dates matches what `get_recent_reading_dates()` returns when called
   with the anon key: same dates, different order.
3. The current date is still marked and not linked. Previous/next links still work.

### Out of Scope
- **Changing which 20 dates appear,** or the heading. The user chose to keep both.
- **Any database change.**
- **The reveal step and the chart tooltips.** Those are Sprints 33 and 34.

### Dependencies
- Blocks: none.
- Blocked by: Sprint 30 (closing) and Sprint 31 (in its live test), which must be
  merged to `main` before this starts.
- Touches only `app/date/[date]/` navigation files and possibly `lib/date-page/`, and
  none of Sprint 33's or 34's files.
- External: none.

### Human Prerequisites
- None.

### Team Assignments
- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** not assigned. If it's run in parallel with Sprint 33 or 34, Dev
  Team 2 takes it after `/sprint-worktree 32`.

### Risks & Mitigations
- **Sorting on the display label** ("11 November 2012") puts dates in alphabetical
  order. QA1's R1 check and the R4 test's mixed months catch it.
