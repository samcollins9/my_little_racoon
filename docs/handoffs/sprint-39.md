# Sprint 39 handoff — Only write horoscopes for dates with matched events

## Round 1

**Status:** ready for QA1's gate-1 audit.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (34 test files, 423 tests).

### What changed

**One rule, one place.** The new file `lib/events/matched.ts` holds the matched-events rule (`hasMatchedEvents`), and every check reads it from there. Only the JSON boolean `true` counts as matched, the same strictness as Sprint 30's SQL predicate, so `"true"`, `null` or a missing key don't. The file also holds the two lead sentences and `unwritableReason()`. Both server refusals use that function. The events status label (`format.ts`) and `eventsLabel` (`display.ts`) now read the same rule, so a label can't say "this exact date" next to the "no recorded events for this exact date" message.

**Page decisions.** The new file `lib/date-page/accuracy.ts` holds the page's decisions, all pure functions:
- `linkableEventDate(year, isoDate)` pads the year to four digits and lets `parseDatePageParam` decide. It rejects negative (BC), fractional and 5-digit years before padding.
- `horoscopeAvailability(events, isoDate)` returns writable, unmatched (with `hasLinkableYear`), or lookupFailed.
- `unavailableMessage()` gives each case's lead and next sentence.

| Req | Where | How |
|---|---|---|
| R1 | `ReadingView.tsx` (`EventYear`), `reading.module.css` | On an unmatched payload, each linkable year is a `next/link` to `datePagePath(target)`. Its accessible name is "Go to 9 May 1976", which still contains the visible year. Years that can't be linked, and every year on a matched date, stay `<span>`s. The phone tap target is 45px tall. |
| R2 | `display.ts` | The unmatched label now reads "No recorded events for this day." It's only ever shown for an empty list. The null and matched labels are unchanged; the existing tests check them. |
| R3–R5 | `HoroscopeUnavailableSection` in `ReadingView.tsx` | The "The reading" heading, a status label ("no exact-date events" or "events unavailable"), then `<strong>`lead`</strong>` and the next sentence. |
| R6 | `app/date/[date]/page.tsx` | The message is checked first, ahead of the outage notice, the write form and the disabled panel. It's decided from `page.events` only, so it needs no database and no JavaScript. |
| R7 | `lib/date-page/load.ts` | `lookupSavedHoroscope` reports a found row whose stored events aren't matched as `none`. The page then does a fresh lookup and applies R3–R6 to it. The guard is app-side; see the approach notes. |
| R8 | `lib/date-page/cast.ts` | Refuses right after the server's own `fetchEvents`, before `insertReading`. The action's existing failure redirect is unchanged. |
| R9 | `lib/llm/generate.ts` | `generateAndPersistHoroscope` refuses before building the prompt. That covers `/reading/[id]`'s action, and it is a second check behind the cast's earlier refusal. |
| R10 | `app/reading/[id]/page.tsx` | The same precedence as the date page, judged on the row's own stored events and `event_date`. The years link using the row's month and day. |

### Approach notes

- **R7 hides old horoscopes in the app, not with a migration. This is my call; please check it.** `get_reading_by_date` returns one row, the newest with a horoscope. Making it skip unmatched rows would mean changing `displayed_readings()`, which also drives Sprint 30's navigation. The sprint puts navigation out of scope. That change would also break several Sprint 28 and Sprint 30 database tests that assert today's behaviour, and those tests can't run here (no Docker).
  - **The cost** is one case: a date whose newest horoscope is unmatched and an older one is matched. That date shows no saved horoscope instead of the older one. R7 says a matched reading "may" still be shown, so I read this as allowed, but `docs/decisions.md` item 2 can be read more strictly.
  - **Why it's rare:** before this sprint, the cast refused to write a second horoscope for a date that already had one. Two rows for one date need either the old `/chart` save path or a race.
  - **If it happens anyway:** the page offers to write a new horoscope when the fresh lookup is matched, and the new row then wins.
  - **Navigation:** it already excludes such dates, so it stays consistent with the page.
- **No migration, so nothing for CI's `migrate` job.**
- **Refusal messages:** the server refusals return the R3 or R5 lead sentence. R6 means the page's own message replaces the reading section anyway, so a visitor never sees the redirect's `?error=` text on an unmatched date.

### Tests added

- `lib/events/matched.test.ts`: matched only for boolean `true`. Not for false, `"true"`, null, a missing key, null events or undefined.
- `lib/date-page/accuracy.test.ts` (R11):
  - **Linkable years:** 1700 and 2100 (both ends of the range), 1699, 2101, 29 February (1900 no, 1901 no, 1904 yes, 2000 yes), years under 1000 (999, 44, 5, which are padded and then out of range), BC, fractional and NaN years.
  - **Message choice:** each of R3, R4 with zero events, R4 with every event before 1700, R4 on 29 February, and R5, each checked against the exact quoted text.
- `lib/date-page/cast.test.ts` (R8): for unmatched events and for `null`, it asserts the result is a failure, the fetch ran for this date, and there was no `from` or `insert`, no `rpc` (so no `set_reading_horoscope`) and no `generate` call. It also checks that a saved horoscope on an unmatched row doesn't short-circuit the refusal. The existing fixtures now use matched events, because the success paths need them.
- `lib/llm/generate.test.ts` (R9): for unmatched events, `"true"` and `null`, it asserts `generateHoroscope` (the OpenAI call) and the writer's `rpc` are never called.
- `app/reading/[id]/accuracy-pages.test.ts`: both real page components rendered on the server, no client JavaScript.
  - **R1:** a linked year has the expected `href` and accessible name; an unlinked year is a `<span>`; a matched date has no links.
  - **R2:** the empty label.
  - **R3, R4, R5:** each message by its case.
  - **R6:** the message still shows with generation disabled and with the database lookup paused. On an unmatched date or a failed lookup the page has no write `<form>` at all; only the date picker's GET form remains.
  - **R7:** an unmatched row and a null-events row both have their horoscope hidden, the events come from the fresh lookup, and a matched saved row is still shown.
  - **R10:** `/reading/[id]` for unmatched, before-1700, null and disabled rows.
  - Every render also asserts no write and no OpenAI call.
- `app/reading/[id]/page-test-support.ts`: render helpers moved out of `reveal-landing.test.ts` so both page-test files share them. `reveal-landing.test.ts` now gets matched events from its Wikipedia stub; Sprint 39 moved its no-events cases to the new file.
- **Mutation check:** I removed each guard in turn (the R7 lookup guard, the R8 cast refusal, the R9 generate refusal, the R6 and R10 page precedence, and the R1 links). Each removal fails its own tests: 2, 3, 3, 8, 4 and 2 tests respectively.

### Screenshots (R12)

**How these were made.** These are the real page components, served by `next dev`. The Supabase API was replaced by a small local stand-in (no Docker here), and the events are **real Wikipedia data**. "Before" is `git archive` of the pre-sprint commit, run with `next dev --webpack`, because Turbopack refuses a symlinked `node_modules`. "After" is this commit. The "N" badge in the corner is the Next.js dev indicator.

**9 May 2031, an unmatched date with linkable years:**

| | Before | After |
|---|---|---|
| Desktop 1440×900 | [before-unmatched-desktop.png](sprint-39/before-unmatched-desktop.png) | [after-unmatched-desktop.png](sprint-39/after-unmatched-desktop.png) |
| Phone 390×844 | [before-unmatched-390.png](sprint-39/before-unmatched-390.png) | [after-unmatched-390.png](sprint-39/after-unmatched-390.png) |
| Phone, JavaScript off | — | [after-unmatched-390-nojs.png](sprint-39/after-unmatched-390-nojs.png) |

- **Measured after:** five linked years. On desktop each link is 31px tall, and on a phone 45px. The page is 390px wide at 390px. There are no write forms. With JavaScript off it's the same.
- **Following a link:** a real click on "2023" lands on `/date/2023-05-09`. That page is labelled "this exact date" and offers "Reveal the horoscope": [after-unmatched-desktop-followed.png](sprint-39/after-unmatched-desktop-followed.png).

**R7 and R10, using stand-in rows:**
- **A saved horoscope on an unmatched row:**
  - The date page: [before](sprint-39/before-saved-unmatched-desktop.png), [after](sprint-39/after-saved-unmatched-desktop.png).
  - Its `/reading/[id]` page at 390px: [before](sprint-39/before-reading-id-390.png), [after](sprint-39/after-reading-id-390.png). After, 1940 and 1869 are links and 1497 is not.
  - The horoscope's text appeared in the page source before. After, it's absent on both routes, checked with curl.
- **A null-events row on `/reading/[id]`:** the R5 message. [after-reading-id-null-events-390.png](sprint-39/after-reading-id-null-events-390.png).

### Known limitations

- **R7's mixed-row case:** see the approach notes.
- **The failed-lookup message (R5) wasn't checked against a real Wikipedia outage.** The unit tests and the rendered-page tests cover it, and so does a null-events row rendered locally. LiveQA's step 4 is the live check.
- **No database tests changed, and nothing touches SQL,** so CI's `rls-tests` job runs exactly as before.

### Questions for QA1

1. Is the app-side R7 guard, with its one-case cost, acceptable under R7's "may"? Or does `docs/decisions.md` item 2 require the older matched row, which would mean a migration and changes to Sprint 30's navigation tests?
2. The lead sentences use straight apostrophes and quotes, exactly as the sprint quotes them. Elsewhere the page's copy uses curly apostrophes (for example, the outage notice's "can’t"). I matched the sprint's text rather than the page's typography.
