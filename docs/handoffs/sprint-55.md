# Sprint 55 handoff — Other-years heading reads month first; message shortened

## Round 1

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0`. That's 55 test files and 622 tests. Lint reports 0 errors and 3 warnings, all in earlier sprints' evidence scripts (`docs/handoffs/sprint-45/cdp45-overflow.mjs`, `sprint-45/cdp45.mjs`, `sprint-46/cdp46.mjs`). The same 3 appear with this sprint's changes stashed. They are warnings, not failures, and this sprint doesn't touch those files.

**Sprint file:** I re-read it before committing. It's unchanged since `/sprint-start` (`c29cd6c`).

### What changed

| Req | Files | Change |
|---|---|---|
| R1 | `app/reading/[id]/display.ts` `eventsHeading` | The `"below"` case now returns `` `Other years with events on ${month} ${day}` ``, still from `formatLongDate` (full month name, day with no leading zero). The single function and the `eventsPlacement` rule are unchanged. Every other case still returns `EVENTS_HEADING` ("What happened"). |
| R2 | `lib/date-page/accuracy.ts` `unavailableMessage` | The unmatched case always gives `next: "Pick a different date."`. The lead sentence, the lookup-failed message and Sprint 54's `<br/>` (in `HoroscopeUnavailableSection`) are untouched. |
| R3 | `accuracy.ts`, `ReadingView.tsx`, both `page.tsx` | Removed what is now unused (listed below). |

### Removed (R3)

Removed:
- **`hasLinkableYear`** from `HoroscopeAvailability`'s unmatched case. Only the message read it. The type is now `{ kind: "unmatched" }`.
- **The `eventsHeading` parameter of `unavailableMessage`**, which was only used to build R2's old string.
- **The `eventsHeading` prop of `HoroscopeUnavailableSection`**, which only passed that parameter through. Both pages also no longer import `eventsHeading`. `ReadingView` still uses it for the `<h2>`.
- **The `isoDate` parameter of `horoscopeAvailability`**, which only `hasLinkableYear` read. The sprint file doesn't name it, but nothing reads it once `hasLinkableYear` is gone. Both call sites were updated, and typecheck confirms no other caller exists.
- **Tests of the above:** the `hasLinkableYear` expectations, and the 29 February *availability* case, which asserted only `hasLinkableYear`. 29 February is still covered by the `linkableEventDate` tests ("29 February only in a leap year").

Kept: the year links: `linkableEventDate`, `EventYear`, and their tests.

### Acceptance greps

- `grep -rn "Other years with .* events" app lib` finds nothing (`exit=1`).
- `grep -rn "choose one of the years listed" app lib` finds nothing (`exit=1`).
- `grep -rn hasLinkableYear app lib` finds nothing (`exit=1`).

### Tests (R4)

- **`app/reading/[id]/display.test.ts`:** the heading for both of the sprint's examples ("July 4" and "November 25"), and single-digit days ("March 3", "January 9"). The matched, empty and null cases, and the heading/`eventsPlacement` agreement test, are unchanged.
- **`lib/date-page/accuracy.test.ts`:**
  - All unmatched cases (a linkable year, zero events, every event before 1700) give `{ kind: "unmatched" }` and the full text ending "Pick a different date."
  - A dedicated test sets up one payload with a linkable year and one without, then asserts `next` is exactly "Pick a different date." for both.
- **`app/reading/[id]/ReadingView.test.tsx`:** the unmatched paragraph is exactly `<strong>lead</strong><br/>Pick a different date.</p>`, with nothing after it.
- **`app/reading/[id]/accuracy-pages.test.ts`:** both routes.
  - Every unmatched case asserts `</strong><br/>Pick a different date.</p>`, so nothing can trail it.
  - The linkable-year cases also assert `>Other years with events on May 9</h2>` (date page) and `>Other years with events on March 4</h2>` (`/reading/[id]`).
- **`app/reading/[id]/events-placement-pages.test.ts`:** the heading expectations are now "March 3", "July 20" (stored row, `/reading/[id]`) and "June 6".

### Manual check (R5 screenshots)

I ran a production `next build && next start` against Sprint 47's PostgREST stand-in ([fake47.mjs](sprint-47/fake47.mjs)) with Sprint 48's rows ([rows48.json](sprint-48/rows48.json)). Date pages use the live Wikipedia feed. I drove Chromium headless over CDP with [cdp55.mjs](sprint-55/cdp55.mjs), which is Sprint 54's probe plus a read of the year links. Results are in [report.json](sprint-55/report.json). Checked 26 Nov 2026.

| Page | Width | Heading | Message next step | Year links | Scroll width |
|---|---|---|---|---|---|
| `/date/2026-11-26` (today, unmatched on the live feed) | 1280 / 390 | Other years with events on November 26 | Pick a different date. (one `<p>`, one `<br>`, below the lead) | 5, first `/date/2011-11-26` | 1280 / 390 |
| `/date/1931-03-03` (single-digit day) | 1280 / 390 | Other years with events on March 3 | as above | 5, first `/date/2012-03-03` | 1280 / 390 |
| `/reading/48480000-…-0002` (stored other-years row) | 1280 / 390 | Other years with events on March 3 | as above | 1, `/date/1976-03-03` | 1280 / 390 |
| `/date/1969-07-20` (matched) | 1280 / 390 | What happened | (none: writable) | 0 | 1280 / 390 |

- **Year links still work:** `/date/2011-11-26` and `/date/1976-03-03` return 200, and the first is titled "Retroactive Horoscope 2011-11-26".
- **Wrapping at 390px:** the heading wraps to two lines ("Other years with events / on November 26") beside the status label, with no sideways scroll. At 1280 it also wraps to two lines inside its column.
- **Screenshots** (the sprint's required pair first):
  - [today-unmatched-1280](sprint-55/today-unmatched-1280-events-reading.png), [today-unmatched-390](sprint-55/today-unmatched-390-events-reading.png)
  - [single-digit-day-1280](sprint-55/single-digit-day-1280-events-reading.png), [single-digit-day-390](sprint-55/single-digit-day-390-events-reading.png)
  - [reading-other-years-1280](sprint-55/reading-other-years-1280-events-reading.png), [reading-other-years-390](sprint-55/reading-other-years-390-events-reading.png)
  - [matched-1280](sprint-55/matched-1280-events-reading.png), [matched-390](sprint-55/matched-390-events-reading.png)

### Known limitations

- **Raised before, and with Master Controller since Sprint 48:** on `/reading/[id]` the message says "Pick a different date", but that page has no picker. This sprint makes it the only next step on that route, so the mismatch is now more visible. It's not in this sprint's scope, and I haven't changed it.
- `cdp55.mjs`'s `headingLines` field reads `null`, because the heading's computed line-height isn't numeric. I checked the line count from the screenshots instead.

### Questions for QA1

- Removing `horoscopeAvailability`'s `isoDate` parameter goes slightly past the sprint file's literal list in R3. I read "remove what's now unused" as covering a parameter whose only reader was `hasLinkableYear`. Flag it if you read R3 more narrowly.
