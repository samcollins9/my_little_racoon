---
id: 47
title: "Day-by-day navigation, a random reading link, and no future dates"
epic: "Date pages (PRD v3)"
status: todo
created: 2026-11-25T14:25:35+00:00
---

# Master Controller Sprint Definition — Sprint 47

**Epic:** Date pages (PRD v3)
**Sprint Objective:** Previous/Next move one calendar day at a time. A "Discover random reading" link sits beside the date picker. No page, picker or write path accepts a date after today (UTC): Reloy predicts only the past.

### Context

On 25 Nov 2026 the user set a general rule: future dates are blocked, because "Reloy predicts only the past". Today the site accepts any date up to 2100-12-31 (`parseDatePageParam`, `assertDateInSupportedRange`), and the picker's `max` is that same limit. The user also asked to replace "Previous reading" and "Next reading", which jump between written readings through `get_adjacent_reading_dates`, with "Previous day" and "Next day", one calendar day either side of the page's date. Jumping between written readings moves to a new "Discover random reading" link beside the picker. It picks from the 20 most recently written readings, which `get_recent_reading_dates` returns.

The user's decisions, 25 Nov 2026:
- A future date's URL **redirects to today**.
- On today's page, "Next day" is **shown disabled**, with "Reloy predicts only the past."

"Today" is the UTC date (`utcToday()`, Sprint 28's decision (d)), and today itself is allowed: `/` still lands there (Sprint 44). Sprint 45 removes the app's call to `get_recent_reading_dates` but keeps the SQL function in the database. This sprint calls it again, for a different purpose.

### Requirements

1. **The rule in one place.** One server-side function decides whether an ISO date is after `utcToday()`. Every requirement below uses it, and no other code compares a date with today for this purpose.
2. **Future URLs redirect to today.** `/date/<YYYY-MM-DD>` with a valid date after today gives a 307 to `/date/<today>`. So does `/date?date=<that date>`, the picker's GET target. Nothing is looked up or written first. Invalid dates, and dates outside the engine's range (for example `2024-02-30` or `2101-01-01`), still get the existing 404.
3. **The picker can't choose the future.** The date input's `max` is today's UTC date, worked out on each request. Its `min` stays at the engine's minimum.
4. **No writes for future dates.** `castHoroscopeForDate` (`lib/date-page/cast.ts`) and `generateReadingHoroscope` (`app/reading/[id]/actions.ts`) refuse a future event date before any insert or OpenAI call, as Sprint 39's R8/R9 refusals do. Unit tests show neither the insert nor the generator is called.
5. **Previous day / Next day.** These replace "Previous reading" / "Next reading", in the same place and with the same styling:
   - The labels read "← Previous day" and "Next day →", and each still shows its target date in the long format ("19 July 1969").
   - Each link goes to `datePagePath()` of the page's date minus or plus one calendar day. The date arithmetic is UTC, and handles month ends, year ends and 29 February correctly. Unit tests cover 1969-07-20, 2000-02-28 → 29, 2001-02-28 → 03-01, 1999-12-31 → 2000-01-01, and 2000-03-01 → 02-29.
   - On the engine's first supported date, 1700-01-01, "Previous day" isn't shown.
   - **On today's page**, "Next day" is shown but disabled. It's not a link and not focusable as one, it has `aria-disabled="true"`, and "Reloy predicts only the past." (exactly this wording, set by the user on 25 Nov 2026) is visible text beside or under it, not only a tooltip, so phones see it too.
   - Neither needs the database, so both render even when the database lookups fail.
6. **Discover random reading.** On the date page, a link labelled "Discover random reading" sits on the same row as the picker, after **Go**, with the word "or" between them: `ANOTHER DATE: [date] [GO] or [DISCOVER RANDOM READING]`.
   - It's styled like the Go button: the same border, type, case, padding, and hover and focus colours. It's a link (`<a>`) because it navigates.
   - It wraps onto the next line on narrow screens, with no horizontal scroll at 390px.
   - Its target is `/date/<date>`, chosen at random on the server for each request. It's picked from `get_recent_reading_dates`, leaving out the page's own date and any date after today. Use an injectable random source, as `pickTagline(Math.random)` does, so tests are deterministic.
   - If the lookup fails, or nothing is left after filtering, the link and its "or" don't render. Nothing else on the page changes, and there's no notice of its own.
7. **Retire the adjacent-reading query in the app.** The app stops calling `get_adjacent_reading_dates`. Remove the code, types and tests that only served it. Don't write a migration, so the SQL function stays in the database. The navigation's `aria-label`s describe what each part now holds.
8. **Everything else stays as it is.** Sprint 45's notable-dates list, Sprint 39's messages and year links, the banner, and `/` all stay as they are. All 20 notable dates are in the past, so the redirect never touches them.
9. **README.** Update the README's description of date navigation and the supported range to match: no future dates, day-by-day navigation, and the random link.
10. **Handoff.** Follow CLAUDE.md's committed-handoff standard: `docs/handoffs/sprint-47.md`, with `npm run verify`'s final line including `exit=0`. Include screenshots under `docs/handoffs/sprint-47/`:
    - desktop at ≥1280px, showing the picker row with the random link, and Previous/Next day on an ordinary date;
    - desktop on today's page, showing the disabled "Next day" and its message;
    - a phone at ~390px, showing the random link wrapped.

### Acceptance Criteria

- **R1:** QA1 confirms there's one future-date helper, with tests at the boundary: today is allowed, tomorrow is refused, and `now` is injected.
- **R2:** tests show `/date/<tomorrow>` and `/date?date=<tomorrow>` redirect to `/date/<today>`, and `2024-02-30` and `2101-01-01` still 404. QA1 confirms that the redirect happens before `loadDatePage`.
- **R3:** a test reads the input's `max` as today.
- **R4:** the unit tests described in R4 pass.
- **R5:** the date-arithmetic tests pass. A render test on today's date finds no Next link, an `aria-disabled` element and the message text. A render test on 1700-01-01 finds no Previous link. A test in the "unavailable" case still finds both day links.
- **R6:** tests with a fixed random source pick the expected date, never pick the current or a future date, and render nothing when the lookup fails or the pool is empty. QA1 confirms the link reuses the Go button's style rules rather than copying them.
- **R7:** grep finds no `get_adjacent_reading_dates`, "Previous reading" or "Next reading" in `app/` or `lib/`. `supabase/migrations/` is unchanged.
- **R9 and R10:** QA1 reads `docs/handoffs/sprint-47.md` at the audited commit, finds `VERIFY PASS … exit=0`, and opens all three screenshots.

**LiveQA (the deployed app):**
1. `curl -sI https://my-little-racoon.vercel.app/date/<tomorrow, UTC>` gives a 307 to `/date/<today, UTC>`. So does `/date?date=<tomorrow>`. `/date/2101-01-01` gives 404. Record the UTC time of the check.
2. On `/date/1969-07-20`, "Previous day" goes to 19 July 1969 and "Next day" to 21 July 1969.
3. On today's page, "Next day" is greyed out, doesn't respond to a click or Tab, and shows "Reloy predicts only the past."
4. In the browser's date picker, no date after today can be chosen.
5. Load a date page five times. "Discover random reading" points to a written reading's date each time, never the current page's date. Across the five loads it isn't always the same date, unless the pool holds only one. Follow one, and it shows a saved horoscope.
6. At 390px wide, the random link wraps below the picker with no horizontal scroll, and the day links and notable dates still show.

### Out of Scope

- **Dropping `get_adjacent_reading_dates` from the database.** It needs a hand-applied migration and gains nothing now.
- **Existing readings saved for future dates.** `/reading/[id]` pages for them are unchanged. R4 only stops new horoscopes from being written. The user can check whether any exist with `select id, event_date from readings where event_date > current_date;`. A separate sprint if any matter.
- **The visitor's own timezone.** "Today" stays UTC, as everywhere else on the site.
- **Showing "Discover random reading" on `/reading/[id]`.** That page has no strip (Sprint 31).

### Dependencies

- **Blocks:** nothing.
- **Blocked by:** Sprint 45 has to close first. Both edit `DateNavigation.tsx`, `lib/date-page/navigation.ts` and their tests, and Sprint 45's R7 currently promises Previous/Next unchanged. Sprint 46 is independent.
- **External:** none.

### Human Prerequisites

None.

### Team Assignments

- **Dev Team 1:** all of it, after Sprint 45 closes.
- **Dev Team 2:** not assigned. The work overlaps Sprint 45's files.

### Risks & Mitigations

- **The picker's `max` goes stale over midnight.** A page rendered at 23:59 UTC still says yesterday. — The server's redirect (R2) is the actual guard, and `max` is only a convenience.
- **A future-dated reading in the random pool.** — R6 filters out dates after today.
- **The disabled "Next day" looks like a broken link.** — R5 requires visible message text, not only a greyed style.
- **Two sources of "today".** — R1 has a single helper built on `utcToday()`.
