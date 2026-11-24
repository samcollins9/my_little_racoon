---
id: 41
title: "Front page lands on today in the latest year with an event"
epic: "Date pages (PRD v3)"
status: todo
created: 2026-11-24T00:27:12+00:00
---

# Master Controller Sprint Definition — Sprint 41

**Epic:** Date pages (PRD v3)
**Sprint Objective:** `/` lands on today's month and day, in the most recent year that has a Wikipedia event on that day, so the front door is a date where a horoscope can be written.

### Context

Since Sprint 39, a horoscope can only be written for a date whose events come from that exact year. `/` redirects to today (UTC), and the current year rarely has an event yet, so the front page usually opens on "we can't write an accurate horoscope for this date." Sprint 39 named this as a later decision. On 23 Nov 2026 the user chose to keep the "on this day" idea and pick the year instead: land on today's month and day, in the latest year that has an event on it.

This amends PRD v3 decision 4 for `/` only. "Today" still means the UTC date, and only the year changes. `/date/<today>` itself is unchanged and stays reachable through the date picker.

### Requirements

1. **Where `/` lands.** `/` redirects to `/date/<Y>-<MM>-<DD>`, where `MM-DD` is today's UTC month and day and `Y` is the **largest** year that meets all three conditions:
   - an entry in Wikipedia's "On this day" feed for that month and day carries that year (the same feed `fetchDayEvents` uses);
   - it is no later than today's UTC year;
   - `/date/<Y>-<MM>-<DD>` passes `parseDatePageParam`, meaning the date page supports it (1700 to 2100 today, and a real date).
2. **It's writable by construction.** The chosen date's own `fetchDayEvents` result is `matchedYear: true`, because the entry that gave the year is in the same feed. A unit test asserts that the year selection and `fetchDayEvents`' own year matching agree, using the same fixture.
3. **Fallback.** If the feed can't be fetched, returns no entries, or has no year that meets the conditions, `/` redirects to `/date/<today>` exactly as it does now. That page then shows Sprint 39's own message. `/` never errors and never 404s.
4. **Still per request.** `/` stays dynamic, is never prerendered or cached, and answers 307 (temporary), never 308. Sprint 28's reasoning on this still holds.
5. **No new outbound budget.** It reuses `lib/events/wikipedia.ts`' existing fetch, its timeout, User-Agent, and in-memory cache per month and day. It doesn't add a second client or another network call when the page it redirects to then fetches the same day. Sharing the cached entries is enough. Whether to add a public helper or extend an existing one is Dev Team's choice.
6. **Writes nothing.** Like every render, `/` writes nothing to the database (PRD v3, decision 3).
7. **README.** The "Running the built app locally" route list describes the new `/` behaviour, and its fallback.
8. **Tests.** Unit tests cover:
   - picking the largest qualifying year;
   - skipping a year later than today's (if the feed ever contains one);
   - skipping years before 1700;
   - 29 February, in a leap and a non-leap current year;
   - each fallback in Requirement 3.

   The clock is passed in, as `utcToday` already does, so the midnight boundary is tested too.
9. **Handoff.** The handoff follows CLAUDE.md's committed-handoff standard: `docs/handoffs/sprint-41.md`, with `npm run verify`'s final line and `exit=0`.

### Acceptance Criteria

- **R1:**
  - A test with a fixture feed (years such as 1650, 1801, 1999, 2019) and today in 2026 lands on 2019.
  - A fixture whose only years are before 1700 falls back to today.
- **R2:** A test runs the same fixture through both the selector and `fetchDayEvents`' matching, and asserts `matchedYear: true` for the chosen date.
- **R3:** Tests cover a `null` or failed feed, an empty feed, and no qualifying year, and each redirects to today. QA1 confirms there's no path that throws past `/`.
- **R4:** `connection()`, or its equivalent, is still in place. `npm run build`'s route table shows `/` as dynamic. The redirect is `redirect()`'s 307.
- **R5:** Grep finds no new `fetch(` to Wikipedia outside `lib/events/wikipedia.ts`. The timeout and User-Agent constants are reused, not copied.
- **R6:** QA1 confirms that nothing on `/`'s path calls Supabase.
- **R7:** The README's text matches the behaviour.
- **R8:** The named tests exist, and `npm run verify` ends with `VERIFY PASS … exit=0`.
- **R9:** QA1 reads `docs/handoffs/sprint-41.md` at the audited commit.

**LiveQA (the deployed app):**
1. `curl -sI https://my-little-racoon.vercel.app/` gives a 307, with a `location` of `/date/<Y>-<today's MM-DD>`.
2. **Check the year.** Use the exact URL `fetchSelectedEntries` uses in `lib/events/wikipedia.ts`, with the project's User-Agent. Confirm that Y is the largest year in today's feed that is no later than today's year and falls within 1700–2100.
3. Open the landed page and check:
   - its events are labelled "this exact date";
   - the reading section shows the write option, or a saved horoscope, never Sprint 39's "can't write" message;
   - don't write a horoscope just to test it.
4. **Fallback (Requirement 3).** Run a local production build (`npm run build && npm run start`) with Wikipedia unreachable, for example by blocking `api.wikimedia.org` at the resolver, the same technique as Sprint 39's step 4. Confirm that `/` gives a 307 to `/date/<today>`. Record what was attempted.
5. Load `/` twice, several seconds apart, and confirm neither response is a cached copy (the `cache-control` and `age` headers).
6. If the test runs within an hour of midnight UTC, check `/` again after midnight UTC to see that the month and day move on. If not, record that this was covered by Requirement 8's clock tests.

### Out of Scope

- **Changing `/date/<today>`.** It stays as Sprint 39 left it.
- **Marking or suggesting matched dates in the picker or navigation.** That's a separate idea, if it's wanted.
- **Visitor-local "today".** That's still out of scope for PRD v3.
- **The older matched horoscope hidden behind a newer unmatched one.** That's Sprint 39's open item, handled separately; see `docs/decisions.md`.

### Dependencies

- **Blocks:** nothing.
- **Blocked by:** Sprint 40, which also edits `README.md`. Run Sprint 40 first.
- **External:** Wikipedia's "On this day" feed, which is already a dependency. The front door now waits on it, up to the existing five-second timeout, when the cache is cold.

### Human Prerequisites

None.

### Team Assignments

- **Dev Team 1:** all of it, after Sprint 40.
- **Dev Team 2:** not assigned. It shares `README.md` with Sprint 40, and `lib/events/wikipedia.ts` with anything else.

### Risks & Mitigations

- **A slow front door.** A cold cache plus a slow Wikipedia can delay the first load by up to five seconds. — Requirement 5 reuses the existing cache, and the page this redirects to then hits the same warm cache. If this proves noticeable live, LiveQA reports the timing it measured, and a shorter timeout for `/` alone becomes a follow-up decision. It isn't guessed at here.
- **The year changes during the day.** The landing year can shift if Wikipedia edits the feed, or between server instances. — That's acceptable: every year chosen qualifies, and `/` is a 307, so nothing caches it.
- **The feed lists a year that the matching logic disagrees with.** — Requirement 2's shared-fixture test ties the two together. If they ever diverge, the landed page shows Sprint 39's message rather than an invalid horoscope.
