---
id: 39
title: "Only write horoscopes for dates with matched events"
epic: "Date pages (PRD v3)"
status: in_progress
created: 2026-11-23T21:28:37+00:00
---

# Master Controller Sprint Definition — Sprint 39

**Epic:** Date pages (PRD v3)
**Sprint Objective:** A horoscope is only ever written or shown for a date whose events happened in that exact year; for any other date, the page explains why and sends the visitor to a date that works.

### Context

`fetchDayEvents` (`lib/events/wikipedia.ts`) asks Wikipedia for everything that happened on a month and day, then keeps the events from the requested year. When none match, it sets `matchedYear: false` and falls back to the first five events from *other* years. A horoscope written from that fallback pairs one year's sky with another year's events. The user has ruled that it isn't astrologically valid. Sprint 30 already removed those dates from navigation, but the page still offers to write one, and still shows any that were saved before.

The decisions, made by the user on 23 Nov 2026 and recorded in `docs/decisions.md`:
- **No writing.** A horoscope can't be written for an unmatched date, and the server refuses as well as the page hiding the button.
- **No showing old ones.** A horoscope saved earlier from unmatched events isn't shown. The rows are never deleted or changed (PRD v3, decision 2).
- **Lookup outage.** If the Wikipedia lookup fails, nothing can be written; the page says to try again later. It doesn't say to pick another date, because the date may be fine.

The way out for the visitor: each other-year event's year becomes a link to the same month and day in that year. That date will normally match, because its events come from the same Wikipedia list.

**Terms used below:**
- **Unmatched date:** the events payload exists and `matchedYear` is `false`.
- **Failed lookup:** the payload is `null`, meaning the Wikipedia fetch failed. This is a different case from an unmatched date.
- **Linkable year:** a year Y where `/date/<Y padded to 4 digits>-<MM>-<DD>` (with the page's own month and day) passes `parseDatePageParam`. That means it's a real calendar date (29 February only in a leap year) within the supported range, currently 1700-01-01 to 2100-12-31 (`lib/ephemeris/adapter.ts`).

### Requirements

**What happened (the events column)**

1. **Linked years.** On the date page, when the date is unmatched, the year in column 1 of each event row is a link to `/date/<YYYY>-<MM>-<DD>`: that event's year with the page's month and day. Years that can't be linked stay plain text, unchanged from today. On a matched date, years stay plain text, because every one of them is the page's own year. The link uses `datePagePath`; the path shape isn't spelled out a second time anywhere.
2. **Empty-list label.** When an unmatched date has zero events, the empty label no longer says "showing notable happenings on this day across history instead", because there are none. It says: **"No recorded events for this day."** The other `eventsLabel` texts stay as they are.

**The reading**

3. **Message for an unmatched date with linkable events.** When the date is unmatched and at least one of its events has a linkable year, the reading section shows this instead of any write button, reveal step or saved horoscope:
   > **We have no recorded events for this exact date, so we can't write an accurate horoscope for it.** Pick a different date above, or choose one of the years listed under "What happened" to go to that date instead.
4. **Message for an unmatched date with nothing to link to.** When the date is unmatched and either has zero events, or none of its events has a linkable year (for example, every fallback event is before 1700), the reading section shows:
   > **We have no recorded events for this exact date, so we can't write an accurate horoscope for it.** Pick a different date above.
5. **Message for a failed lookup.** When the lookup failed, the reading section shows:
   > **The events for this date couldn't be loaded, so the horoscope can't be written right now.** Try again in a few minutes.
6. **Precedence.** The three messages above override every other state of the reading section: the write button, the reveal step, a saved horoscope, the disabled state (`HOROSCOPE_ENABLED` off), and the saved-horoscopes-unavailable state. None of them depends on the database. Each keeps the section's "The reading" heading and status-label pattern (the status label's text is Dev Team's choice). They render without client-side JavaScript, like the rest of the page.
7. **Old horoscopes are hidden.** A horoscope saved on a row whose stored `events` are unmatched or `null` is never shown on the date page. Where several readings exist for a date, a matched reading with a horoscope may still be shown under PRD v3's "newest with a horoscope wins" rule, applied only among matched rows. If none exists, the page behaves as if nothing was saved: events come from a fresh lookup, and Requirements 3–6 apply to that lookup.
   - Whether this filtering happens in `get_reading_by_date` (via a migration) or in the app is Dev Team's choice. If it's a migration, it's additive, and CI's `migrate` job applies it on the push to main, as before.
   - Whichever route is chosen, **rendering still writes nothing** (PRD v3, decision 3).

**The server refuses**

8. **Refusal on the date page.** `castHoroscopeForDate` (`lib/date-page/cast.ts`) refuses when the events it fetches at write time are unmatched or `null`. It refuses **before inserting any row**, so a refused attempt writes nothing at all. The visitor is redirected to the date page with an error message, using the existing failure path. Whatever the refused attempt shows, Requirements 3–5's message wins (Requirement 6). The check runs on the server's own fetch and never trusts anything the form sends.
9. **Refusal on `/reading/[id]`.** `generateReadingHoroscope` (`app/reading/[id]/actions.ts`) refuses to generate for a row whose stored `events` are unmatched or `null`, before any OpenAI call. Putting the check in the shared `generateAndPersistHoroscope` is acceptable if that covers both routes. Where the check lives is Dev Team's choice; the requirement is that both write paths refuse.
10. **`/reading/[id]` shows the same accuracy messages.** On `/reading/[id]`, a row whose stored `events` are unmatched or `null` shows the message from Requirement 3, 4 or 5, chosen by those requirements' own rules, applied to the row's stored events. It doesn't show its saved horoscope or a generate button. Event years on that page are linked under Requirement 1's rule, using the row's own month and day.

**Record and checks**

11. **Tests.** Unit tests cover:
    - the linkable-year rule, including a year before 1700, a year after 2100, 29 February in a non-leap year, and years under 1000, which need padding;
    - the message choice for each case in Requirements 3–5, including "unmatched, every event before 1700";
    - both server refusals, asserting that no insert and no generate call happens.
12. **Handoff.** The handoff follows CLAUDE.md's committed-handoff standard (`docs/handoffs/sprint-39.md`, including the `npm run verify` line with `exit=0`). It includes before-and-after screenshots of an unmatched date at desktop width, and at 390×844, committed under `docs/handoffs/sprint-39/`.

### Acceptance Criteria

- **R1:**
  - In a test or a rendered check on an unmatched date, linkable years are `<a href="/date/…">` with the page's month and day, and unlinkable years have no anchor.
  - On a matched date, the year column contains no links.
  - Grep finds no second hand-built `/date/` path in the change.
- **R2:** For an unmatched payload with an empty event list, `eventsLabel` returns exactly "No recorded events for this day." The other two labels are unchanged; this is checked against their current text.
- **R3–R5:** The rendered text matches the quoted wording exactly, apart from markup. Each message is selected by the case its requirement names, and in no other case.
- **R6:**
  - With `HOROSCOPE_ENABLED` off, an unmatched date still shows Requirement 3's or 4's message, not the disabled panel.
  - With the database lookup failing, an unmatched date still shows its message.
  - The page source contains no `<form>` posting to `castHoroscope` on an unmatched date or a failed lookup.
- **R7:** For a date whose only saved horoscope sits on an unmatched row, no horoscope text appears anywhere in the page. QA1 confirms that nothing on the render path writes.
- **R8:** A test drives `castHoroscopeForDate` with an unmatched payload and with `null`, and asserts that no insert, no generate call and no update happens, and that the result is a failure.
- **R9:** A test asserts that the `/reading/[id]` path makes no OpenAI client call for an unmatched row or a `null`-events row.
- **R10:** The same checks as R1, R3–R6 and R7, run against `/reading/[id]` for an unmatched row.
- **R11:** The listed cases exist as named tests, and `npm run verify` ends with `VERIFY PASS … exit=0`.
- **R12:** QA1 reads `docs/handoffs/sprint-39.md` at the audited commit, as the standard says.

**LiveQA (the deployed app):**
1. Open an unmatched date with linkable events, such as `/date/2031-05-09` or any other future date, and check:
   - Requirement 3's message appears, with no write button.
   - The linkable years are links and the others aren't.
2. Follow one year link. It should arrive at that `/date/<year>-05-09` page with `matchedYear` true; its events are labelled "this exact date". The write option should be present if `HOROSCOPE_ENABLED` is on.
   - **Don't write a horoscope on production just to test.** The user decides whether one is written.
3. Find a date whose fallback events are all before 1700, or whose event list is empty, to show Requirement 4's message. Try likely candidates and record which dates were tried. If real data has no such date, record that, along with what was tried; the unit tests from Requirement 11 then carry this case.
4. **Failed lookup (Requirement 5).** Attempt this against a local production build (`npm run build && npm run start`) with Wikipedia unreachable. For example, block `api.wikimedia.org` at the resolver, or run with a proxy that refuses it. Record what was attempted and what was seen. The deployed app can't be made to lose Wikipedia, so this local run is the live evidence for this case.
5. Open the unmatched date(s) with saved horoscopes that the user supplied (see Human Prerequisites). Check that no horoscope text appears and that Requirement 3's or 4's message does.
6. Repeat step 5 through `/reading/<id>` for the same row(s), if the user supplied an id.
7. Check at 390×844 that the message and the linked years read correctly, with no horizontal scroll.
8. Send a hand-built POST to the date page's cast action for an unmatched date, if LiveQA can construct one without writing a horoscope. Check that it refuses and that no row is created; the user can confirm by running the row count. Record whether this was attempted.

### Out of Scope

- **Today's date as the landing page.** `/` still goes to today's date (UTC), even though the current year will usually be unmatched and the front door will usually show Requirement 3's message. Changing where `/` lands is a product decision for a separate sprint (see Risks).
- **Deleting or changing old unmatched rows.** They stay in the database, hidden (PRD v3, decision 2).
- **Julian and Gregorian calendar dates.** Wikipedia gives some 18th-century dates in the old (Julian) calendar, while the chart uses the modern one. The 1700 lower limit leaves this narrow, and it isn't addressed here.
- **Other ways to find a matched date,** such as suggesting the nearest one or marking matched days in the picker. They can follow later.
- **Navigation.** Sprint 30 already filters it to matched rows; it doesn't change.

### Dependencies

- **Blocks:** nothing currently planned.
- **Blocked by:** the fast-lane halo and long-word fix to `app/reading/[id]/reading.module.css`, which is assigned to Dev Team 1. Land it first, or build on top of it; any link styling this sprint adds is likely to touch the same file.
- **External:** Wikipedia's "On this day" feed, which is already a dependency. The year links assume the target date's event list contains the same event under its own year. That's normally true because the list is the same, but Wikipedia editors can change it.

### Human Prerequisites

- **The user supplies one or two unmatched dates that have a saved horoscope, and a reading id for at least one of them, for LiveQA's steps 5–6.** LiveQA has no database credentials. Run this in the Supabase SQL editor:
  `select id, event_date from readings where horoscope is not null and (events is null or (events->>'matchedYear')::boolean = false) order by event_date limit 5;`
  If it returns no rows, say so; steps 5–6 are then covered by QA1's audit and the tests alone, and LiveQA records that.

### Team Assignments

- **Dev Team 1:** all of it, after the fast-lane fix.
- **Dev Team 2:** not assigned. This touches the shared reading view, the cast path and the generate path, so there's nothing independent to split off.

### Risks & Mitigations

- **The landing page usually becomes non-writable.** Today's UTC date rarely matches. That's intended (accuracy over convenience), and the message offers a way out. It still changes the first impression of the site; the user should decide later whether `/` should land elsewhere. — Named here and under Out of Scope so it's a choice, not a surprise.
- **The refusal comes after the insert.** `castHoroscopeForDate` currently inserts before it generates, so an unordered check would still leave an orphan row. — Requirement 8 requires the refusal before the insert, and the Requirement 8 acceptance test asserts that no insert happens.
- **Hiding is enforced in the page only.** If the date page hides old horoscopes but the lookup doesn't, a future caller of the lookup could show them again. — Either route is acceptable under Requirement 7. QA1 confirms that every place the date page and `/reading/[id]` render a horoscope applies the rule.
- **A link can lead to another unmatched date.** This happens if Wikipedia's list has changed since the event was fetched, or if the event appears under a different year. — The target page then shows its own Requirement 3 or 4 message, so the visitor is never stranded. LiveQA's step 2 checks the normal case.
