# Sprint 41 handoff — Front page lands on today in the latest year with an event

## Round 1

**Status:** ready for QA1's gate-1 audit.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (41 test files, 510 tests).

**Parallel work:** Dev Team 2's sprint 43 doesn't overlap with this sprint. Its own file lists `README.md`, `app/page.tsx` and `lib/events/wikipedia.ts` as not shared, and its commits touch none of them.

### What changed

| Req | Where | How |
|---|---|---|
| R1 | `lib/date-page/front-door.ts` (new) | `frontDoorDateFromYears(years, today)` is pure. It returns the largest year ≤ today's UTC year whose `linkableEventDate(year, today)` (Sprint 39's helper, which calls `parseDatePageParam`) is non-null, as `YYYY-MM-DD`. The feed's order doesn't matter. |
| R2 | `lib/events/wikipedia.ts` | The year rule behind `matchedYear` is now one exported function, `entryMatchesDateYear(entryYear, isoDate)`. `fetchDayEvents` filters with it, and the selector requires it of every candidate, so the chosen date is matched by the same rule rather than by two rules agreeing. |
| R3 | `front-door.ts` | Returns `today` for a `null` feed, an empty feed, or no qualifying year. Nothing on the path throws: `fetchDayEventYears` catches and logs like `fetchDayEvents`, and the selection only calls `linkableEventDate`, which returns null rather than throwing for bad input. |
| R4 | `app/page.tsx` | `await connection()` is still first, and `redirect()` is unchanged. The build's route table shows `ƒ /` ([build-route-table.txt](sprint-41/build-route-table.txt)), and a real request gets `307` with `Cache-Control: private, no-cache, no-store` ([front-door-live.txt](sprint-41/front-door-live.txt)). |
| R5 | `lib/events/wikipedia.ts` | New `fetchDayEventYears(isoDate)` reads the existing private `fetchSelectedEntries`, so the fetch, timeout, User-Agent and month/day cache are the same code, not copies. `grep -rn "fetch(" app lib` (excluding tests) finds only `wikipedia.ts:60` and the OpenAI call. A test shows the front door and the landed page together make one request. |
| R6 | `app/page.tsx` | Imports only `front-door`, `params` and Next's helpers. `app/page.test.ts` asserts the only outbound request is the Wikipedia feed. |
| R7 | `README.md` | The route list and "Local setup"'s paragraph about `/` both describe the year choice and the fallback. "Local setup" also described `/` as landing on today, so I updated it to match R7's acceptance criterion, "the README's text matches the behaviour". |

### Tests added (R8)

- **`lib/date-page/front-door.test.ts`:**
  - **R1:** `[1650, 1801, 1999, 2019]` with today `2026-11-24` lands on `2019-11-24`. The feed's order doesn't matter, and today's own year is allowed.
  - **Years skipped:** 2027 and 2050 (later than today, though inside 1700–2100); years before 1700 (1699 skipped, 1700 taken); BC, fractional and NaN years.
  - **29 February, leap current year (2028):** lands on the latest leap year, skipping 2025, 2027 and 1900. It falls back to today when no listed year is a leap year.
  - **29 February, non-leap current year:** today can never be 29 February then. The test shows `utcToday` going from `2027-02-28T23:59:59.999Z` to `2027-03-01`, and that a 28 February feed listing 2024 still lands on a 28 February.
  - **R3 fallbacks:**
    - The pure selector, with `null`, `[]`, only years before 1700, and only future years.
    - The real feed path, with a rejected fetch, a 503, a body with no `selected`, and an empty feed. Each lands on today, and none throws.
  - **R2:** a single fixture runs through `frontDoorDate` and then `fetchDayEvents(chosen)`. The result is `matchedYear: true`, the events are exactly the 2019 entries, and only one `fetch` call is made. A fallback date gives `matchedYear: false`, so its page shows Sprint 39's message.
  - **Clock:** the clock is passed in through `utcToday(now)`. One test asks the feed for the right UTC day either side of midnight. Another shows that across New Year, a year that was "later than today" stops being skipped.
- **`lib/events/wikipedia.test.ts`:**
  - `entryMatchesDateYear` is true only for the date's own year.
  - `fetchDayEventYears`:
    - returns the years in feed order, from the same URL with the same User-Agent and an abort signal;
    - shares the cache with `fetchDayEvents` in both directions;
    - returns null and logs for a rejected fetch, a non-2xx response or a missing `selected`, and caches none of them;
    - returns `[]` for an empty feed.
- **`app/page.test.ts`:** `/` itself, with `connection` and `redirect` replaced by spies. It shows `connection` is called before `redirect` to `/date/2019-11-24`, and the only request is the Wikipedia feed. An unreachable feed redirects to today.
- **Mutation check:** I broke each rule in `front-door.ts` in turn: no cap at today's year, first year instead of largest, no date-page validation, no fallback, and not using the shared feed. Each change fails the tests (vitest exit 1).

### Manual checks

All of these ran on 24 Nov 2026 between 03:05 and 03:07 UTC, so "today" was `2026-11-24`.

- **Live Wikipedia:** I ran the production build (`next start`). [front-door-live.txt](sprint-41/front-door-live.txt)
  - `/` gave `307`, `location: /date/2023-11-24`.
  - A second request 4 s later gave the same result, with `no-store` and no `age` header.
- **The feed itself:** I fetched the feed's exact URL with the project's User-Agent. Its years are `2023, 2009, …, 1643, 1542, 1221`, so the largest in 1700–2026 is 2023. [feed-11-24-years.txt](sprint-41/feed-11-24-years.txt)
- **The landed page:** I used `next dev`, with the Supabase API replaced by Sprint 39's local stand-in (no saved rows).
  - `/date/2023-11-24` returned `200`, labelled "this exact date", and offered "Reveal the horoscope".
  - It showed neither of Sprint 39's messages. [landed-page.txt](sprint-41/landed-page.txt)
  - With no `.env.local`, the production build's date page returns 500, as the README says, which is why this check used `next dev`.
- **Wikipedia unreachable (R3):** I ran the production build inside `unshare -rn`, a network namespace with only loopback.
  - `curl https://api.wikimedia.org/` failed with exit 6 (couldn't resolve the host).
  - `/` gave `307`, `location: /date/2026-11-24`. [front-door-offline.txt](sprint-41/front-door-offline.txt)
  - This is a different technique from blocking at the resolver, but it has the same effect for the app.

### Known limitations

- **The cache is per server instance, as it was before.** On Vercel, `/` and the page it redirects to may run on different instances. Then the second instance fetches the feed once more, which is the cost the page already had. R5 asks only that the cache be shared, and it is.
- **Two cold requests at the same moment** each fetch the feed. There's no in-flight dedupe, the same as `fetchDayEvents` today.
- **A slow front door:** with a cold cache, `/` waits on Wikipedia for up to the existing 5 s timeout, as the sprint's risks section says. Locally the first response was immediate. LiveQA will measure it live.
- **I left one README passage alone:** "The deployed-commit observable…" (around line 353) still says `/` goes "to today's date page since Sprint 28". It's a history of why the SHA moved, not a description of today's route, so I didn't change it. Tell me if you'd rather it said more.

### Questions for QA1

1. In "Local setup", I updated the paragraph about `/` as well as the route list R7 names. R7's acceptance criterion asks that the README match the behaviour, and that paragraph would otherwise be wrong. Is that the right reading of the scope?
2. A non-leap current year can't have 29 February as today, so I covered that case with the midnight boundary from 28 February to 1 March. Does that satisfy R8's 29 February bullet as you read it?
