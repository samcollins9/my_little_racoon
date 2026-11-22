---
id: 31
title: "Retire /chart and the step flow"
epic: "Date pages"
status: in_progress
created: 2026-11-22T15:22:50+00:00
---

# Master Controller Sprint Definition — Sprint 31

**Epic:** Date pages. The app is addressed by date. `/` opens on today's date page,
which shows the chart and events on load and casts a horoscope on demand (Sprints
28–29).

**Sprint Objective:** Remove the old three-step flow: the `/chart` page, its save
action and the `FlowIndicator`, along with every link and piece of copy that still
points into it. Old bookmarks and old `/reading/[id]` links keep working.

### Context

The date page replaced the "cast, then save, then read" funnel. `/chart` and
`FlowIndicator` were deliberately kept in Sprint 28 ("retire them deliberately once
date pages have proven themselves"). `docs/PRD_v3_date_pages.md` §4 and the user's
choice on 22 Nov 2026 made retiring them a separate sprint. Date pages have now
shipped and passed both gates twice.

What still points into the old flow:
- `app/chart/` (the page, the `saveReading` action, the CSS);
- `app/components/FlowIndicator*`, still rendered on `/reading/[id]`
  (`page.tsx:88`);
- the "Cast a new chart" links to `/chart` in `ReadingPanel.tsx` (around lines 150
  and 154) and in `error.tsx:37`;
- `redirect("/chart")` in `app/reading/[id]/actions.ts:28`;
- the site description in `app/layout.tsx:27`;
- the README's `/chart` sections, and a comment in the health route.

**Prior record checked (planning rule 11).**
- Sprint 11 introduced the `/` → `/chart` redirect and chose a 307 over a 308
  specifically so it could change later. That caching reason applies equally to the
  new `/chart` redirect in R1.
- Sprint 24 introduced the numbered labels and `FlowIndicator`.
- Sprint 28 removed the indicator from the date page and kept it on `/chart` and
  `/reading/[id]`.
- No finding records a measurement this sprint relies on.

### Requirements

1. **`/chart` becomes a redirect, not a 404.** A 307, never a 308 or
   `permanent: true`, for Sprint 11's caching reason.
   - `/chart?date=YYYY-MM-DD` with a valid, in-range date goes to
     `/date/YYYY-MM-DD`.
   - `/chart` with no date, or with an invalid or out-of-range date, goes to `/`,
     which sends the visitor to today.
   - Validation reuses the date page's own parameter validation (`lib/date-page/
     params.ts`), not a copy of it.
2. **The old flow's code is removed.**
   - Delete `app/chart/page.tsx`, `app/chart/actions.ts` (`saveReading`) and
     `app/chart/chart.module.css`.
   - Delete `app/components/FlowIndicator.tsx`, its test and its CSS module.
   - Remove anything that was used **only** by them. The shared `insertReading`
     (`lib/readings/insert.ts`) stays, because the date page's cast action uses it.
   - `grep` for `FlowIndicator`, `saveReading` and `app/chart` across `app/` and
     `lib/` finds nothing.
3. **`/reading/[id]` keeps working, without the step framing.**
   - It renders exactly as now apart from the following: no `FlowIndicator`, and its
     "Cast a new chart" links become a link to **that reading's own date page**
     (`/date/<event_date>`). The wording is Dev Team's, and it must not mention
     steps or "cast a new chart".
   - Its "Write the horoscope" action, for an old reading saved without a horoscope,
     stays as it is.
   - Its 404 uniformity and Sprint 25's outage behaviour are unchanged.
   - `actions.ts`'s missing-id redirect goes to `/`.
4. **The error page points at the front door.** `app/reading/[id]/error.tsx`'s link
   goes to `/`, which works with the database down (Sprint 28, R6). Its wording no
   longer says "chart", and its code comment no longer refers to "step 1".
5. **Copy and docs no longer describe the old flow.**
   - Rewrite `app/layout.tsx`'s site description for the date-page app.
   - Update the README:
     - `/chart` is described as a redirect;
     - the "Local validation" steps (Sprint 26) check `/` and `/date/<date>` instead
       of casting on `/chart`.
   - Update the health route's comment.
   - No user-visible text anywhere still refers to numbered steps, "cast the chart",
     "save this reading" or "see the full reading". `grep` the rendered routes'
     source to confirm.
6. **Nothing else moves.** No database change, no migration, and no change to the
   date page's behaviour or to Sprint 29/30's navigation. Server-authored writes
   (Sprint 28, R12) stay exactly as they are; this sprint only removes one of their
   callers.
7. **Tests.**
   - Unit tests cover R1's redirect targets:
     - a valid date;
     - the boundary dates 1700-01-01 and 2100-12-31;
     - a malformed date;
     - an out-of-range date;
     - no date at all.
   - Remove tests that only exercised deleted code. List them in the handoff. No test
     of surviving code is deleted or weakened.
   - `lib/readings-access-guardrail.ts` and the RLS suite pass unchanged.

### Acceptance Criteria

**QA1 (static):**
- **R1:** the redirect is a 307 and reuses `params.ts`. Trace each R7 input to its
  target.
- **R2:**
  - The listed files are gone and the `grep` comes back empty.
  - `insertReading` remains, and its only remaining callers are the date page's cast
    action and its tests.
- **R3:**
  - The `/reading/[id]` diff is limited to removing the indicator, the link target
    and its label, and the missing-id redirect.
  - The link's `event_date` comes from the stored row, not from user input.
- **R4, R5:** read the diffs of `error.tsx`, `layout.tsx`, the README and the health
  route. Search the source for the R5 phrases.
- **R6:** no files under `supabase/`, `lib/date-page/` or `app/date/` change, except
  as needed for R1's reuse of `params.ts`, which must be an export, not a behaviour
  change.
- **R7:** the tests exist, and removed tests cover only deleted code. `npm test`,
  typecheck, lint and build are green.

**LiveQA (against the deployed app, after Pipeman pushes):**
1. `/chart` lands on today's date page. Check the status in the network panel or with
   `curl -I`: it's a 307, not a 308.
2. `/chart?date=1969-07-20` lands on `/date/1969-07-20`. `/chart?date=garbage` and
   `/chart?date=2200-01-01` land on today.
3. An existing `/reading/[id]` link (for example
   `/reading/5bf3a1f5-b47f-4dfa-9a42-41f18eb24861`):
   - renders with no step indicator;
   - its link back goes to that reading's own date page;
   - no "Step", "1.", "2." or "3." labels or "Cast a new chart" text are visible.
4. The date page and its navigation behave exactly as before.
5. No page reachable from `/` shows numbered steps or old flow copy.
6. Phone width (about 390px): `/reading/[id]` has no horizontal scroll.

### Out of Scope
- **Redirecting `/reading/[id]` to `/date/<date>`.** A reading link shows *that*
  reading, and the date page shows the newest one, so redirecting would change what
  an old link shows. It's kept.
- **Removing `/reading/[id]`'s own "Write the horoscope" action** for old readings
  without one.
- **Any change to the date page or its navigation.** Sprint 30 owns the navigation
  filter.
- **Database or permission changes.**

### Dependencies
- Blocks: none.
- Blocked by: Sprint 28 (done), which provides the date page and `params.ts`.
- **Independent of Sprint 30.** Sprint 30 is a migration plus tests; this sprint is
  `app/` and the README. If they run in parallel, the second one goes to Dev Team 2
  in a `/sprint-worktree`, and the shared risk is only test files under
  `app/date/`. This sprint shouldn't touch those, per R6.
- External: none.

### Human Prerequisites
- None. Supabase only needs to be awake for LiveQA step 3, which reads an existing
  reading.

### Team Assignments
- **Dev Team 1:** the whole sprint, if run after Sprint 30.
- **Dev Team 2:** the whole sprint, if run in parallel with Sprint 30, building in
  `../my_little_raccoon-devteam2-sprint-31` after `/sprint-worktree 31`.

### Risks & Mitigations
- **Old bookmarks or shared `/chart?date=` links break.** R1 redirects them, and
  LiveQA steps 1–2 check it.
- **Deleting `saveReading` takes shared code with it.** R2 names `insertReading` as
  kept, and QA1 checks its callers.
- **A 308 gets cached and can't be undone later.** R1 and LiveQA step 1 require a 307.
- **Leftover old-flow copy.** R5's grep, and LiveQA step 5.
