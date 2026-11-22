---
id: 30
title: "Date navigation lists exact-date readings only"
epic: "Date pages"
status: todo
created: 2026-11-22T15:22:50+00:00
---

# Master Controller Sprint Definition — Sprint 30

**Epic:** Date pages. The app is addressed by date. Sprint 28 built the date page;
Sprint 29 added previous/next links and a recent-readings list to it.

**Sprint Objective:** The date navigation links only to dates whose displayed
horoscope was written over events from **that exact year**, so every quick link lands
on a page whose "What happened" section reads "this exact date".

### Context

Sprint 29's two lookups (`get_adjacent_reading_dates` and `get_recent_reading_dates`,
migration `20261122142918_reading_date_navigation`) count any date with a saved
horoscope. When Wikipedia has no events for a date's actual year,
`fetchDayEvents` stores `matchedYear: false` and falls back to five events from
other years on the same day. The page then labels them "on this day, other years".
The user wants the quick links to show only the stronger readings: dates where
`readings.events.matchedYear` is `true`, so the page says "What happened" and "this
exact date" (`app/reading/[id]/format.ts:58`).

**There's a subtlety, and it decides the rule.** A date can have several readings
(Sprint 28, decision 2), and the date page shows only the **newest one with a
horoscope** (`get_reading_by_date`). If the filter checked *any* row, a date whose
older reading matched but whose newest one doesn't (for example, its events are
`null` after a Wikipedia outage) would be linked, and the visitor would land on "other
years". So the filter applies to **the row the date page will actually show**, never
to just any row on that date.

**Prior record checked (planning rule 11).**
- `WikipediaEventsPayload` (`lib/events/wikipedia.ts:11`) stores `matchedYear` as a
  JSON boolean.
- `events` is nullable, since Sprint 15's migration; `null` means the fetch failed
  (Sprint 16, R6).
- No closed sprint, `docs/` finding, CHANGELOG entry or tag measures how many
  production readings have `matchedYear: false`.
- Nothing here depends on that count. LiveQA records it (step 1).

### Requirements

1. **One definition of "the row a date shows".** For each `event_date`, the
   *displayed reading* is the row `get_reading_by_date` returns: `horoscope is not
   null`, ordered by `horoscope_generated_at desc nulls last, created_at desc, id
   desc`, first row.
   - A date **qualifies** for navigation only when its displayed reading's `events`
     is non-null and `events->'matchedYear'` is the JSON boolean `true`.
   - A missing key, `null`, `false` or the string `"true"` all fail to qualify.
   - The ordering must not be restated by hand in a way that can drift from
     `get_reading_by_date`. Either share it (for example, a helper function or view
     that anon cannot execute or select), or say in the handoff exactly how drift is
     prevented and tested.
2. **Both Sprint 29 functions filter on R1.**
   - `get_adjacent_reading_dates(date)` returns the nearest *qualifying* date strictly
     before and after the given date.
   - `get_recent_reading_dates()` returns up to 20 *qualifying* dates. The cap is
     applied **after** filtering, so a full list holds 20 qualifying dates, not 20
     minus the excluded ones.
   - Ordering is unchanged: newest generation first. Use the generation time of the
     date's **displayed reading**, consistent with R1.
   - Both keep their names, signatures, `security definer`, pinned `search_path`,
     dates-only return shape and grants (anon and authenticated only, revoked from
     PUBLIC and service_role). Replace them in a new migration, which ends with its
     `schema_migrations` insert.
   - Any helper from R1 is not executable or selectable by anon or authenticated.
3. **The date page itself doesn't change.** A date that doesn't qualify still renders
   in full, with its horoscope and "on this day, other years". It's reachable by the
   picker and by direct URL, and it's only absent from the quick links. When the
   current date doesn't qualify, its own page shows no "current" marker in the recent
   list, because it isn't in it.
4. **No other UI or copy change.** The navigation's layout and labels stay as Sprint
   29 shipped them. If Dev Team thinks a heading should say these are exact-date
   readings, propose it in the handoff; don't build it.
5. **Tests** in `supabase/tests/`, seeded through the service-role client:
   - a date whose only reading has `matchedYear: true` is listed and is a neighbour;
   - `false`, `null` events, a missing key, and `"true"` as a string are each
     excluded;
   - **the subtlety:**
     - an older matching row plus a newer non-matching row is excluded;
     - an older non-matching row plus a newer matching row is included;
   - the cap holds 20 qualifying dates when more than 20 qualify and others don't;
   - adjacency skips over a non-qualifying date to the next qualifying one;
   - Sprint 29's existing tests are updated only where their seed data lacked
     `matchedYear: true`. Say which ones in the handoff, and don't weaken their
     assertions;
   - anon cannot execute or select any R1 helper.

### Acceptance Criteria

**QA1 (static):**
- **R1:**
  - The qualifying predicate tests a JSON boolean, for example `(events->'matchedYear')
    = 'true'::jsonb` or `(events->>'matchedYear')::boolean is true` with the string
    case handled. Check it against each case R1 lists.
  - The ordering used to pick the displayed reading is identical to
    `get_reading_by_date`'s, either shared or with drift prevention as described in
    the handoff.
- **R2:**
  - The new migration's `create or replace` keeps both names and signatures.
  - The grants after migration match Sprint 29's exactly; re-check the revokes,
    since a replace can't widen them, but a drop and re-create can.
  - The return types are still dates only.
  - The 20-row cap applies after filtering.
  - Any helper's privileges are revoked from anon, authenticated and PUBLIC.
- **R3, R4:** no diff under `app/` beyond what's needed to keep the existing tests
  green. Ideally there is none.
- **R5:** the tests exist and cover each listed case, both subtlety cases by name.
  Sprint 29 test changes are limited to seed data. `npm test`, typecheck, lint and
  build are green. Pipeman's push report shows CI's `rls-tests` green.

**LiveQA (against the deployed app, after Pipeman pushes):**
1. **Find a non-qualifying date.**
   - From the anon key alone, call `get_reading_by_date` across the Sprint 29 recent
     list's former dates, or use dates LiveQA cast during Sprint 29.
   - Find at least one date whose page shows "on this day, other years". If none
     exists, cast on one: pick a date Wikipedia has nothing for in that year, such as
     an obscure 1700s date. Record the date.
   - Record how many of the dates you checked qualified.
2. That date is **absent** from the recent list and is skipped by previous/next links
   on its neighbours. Its own page still renders, with "other years".
3. Every date linked from the navigation, both previous/next and every entry in the
   recent list, opens on a page whose "What happened" section reads "this exact
   date". Check all of them, up to 20.
4. Calling both functions directly with the anon key still returns dates only.
5. Phone width (about 390px): unchanged from Sprint 29, with no horizontal scroll.

### Out of Scope
- **Changing which reading a date page shows.** It stays newest-with-horoscope
  (Sprint 28, decision 2). This sprint filters the links, not the page.
- **Hiding or deleting other-years readings.** They stay real readings, reachable by
  picker and URL.
- **Re-fetching events** for old readings to upgrade them to `matchedYear: true`.
- **New navigation copy** (R4).
- **Retiring `/chart` and the step flow.** That's Sprint 31, kept separate on the
  user's instruction.

### Dependencies
- Blocks: none.
- Blocked by: Sprint 29 (done).
- **Shares no files with Sprint 31** apart from, possibly, the date page's tests, so
  the two could run in parallel. If they do, Dev Team 2 takes one of them in a
  `/sprint-worktree`. Running them one after the other is simpler, and this one is
  small.
- External: Supabase (CI's `migrate` applies the migration).

### Human Prerequisites
- Supabase must be awake (not paused) when CI's `migrate` job runs and during
  LiveQA.
- Otherwise none.

### Team Assignments
- **Dev Team 1:** the whole sprint. It's one migration and its tests.
- **Dev Team 2:** not assigned. See Dependencies if Sprint 31 runs in parallel.

### Risks & Mitigations
- **A link to a date whose page says "other years",** because the filter looked at
  the wrong row. R1 defines the displayed reading, R5 tests both orderings, and
  LiveQA step 3 checks every link.
- **The ordering drifts from `get_reading_by_date` later.** R1 requires sharing it, or
  a stated and tested drift guard.
- **Grants silently widen** if Dev Team drops and re-creates the functions instead
  of replacing them. QA1's R2 re-check catches it, and so does LiveQA step 4.
- **The navigation looks empty** if few readings qualify. That's the accepted outcome
  of the user's rule. LiveQA's count in step 1 makes it visible.
