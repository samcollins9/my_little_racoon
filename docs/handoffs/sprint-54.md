# Sprint 54 handoff — Other-years heading, Pick a different date label, message line break

## Round 1

**Status:** ready for QA1's gate-1 audit.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (55 test files, 622 tests).

**Sprint file:** I re-read it at this commit. It's unchanged since `/sprint-start` (`31606bc`): `git log 31606bc..HEAD` on the file is empty. The centring quick fix it depends on (`f3cccc4`) is committed and with Pipeman, so this sprint's screenshots show the centred panel.

### What changed

| Req | Where | How |
|---|---|---|
| R1 | `app/reading/[id]/display.ts` `eventsHeading(events, eventDate)`; `ReadingView.tsx` | In `eventsPlacement`'s `"below"` case, it returns `` `Other years with ${day} ${month} events` ``, with the day and month taken from `formatLongDate(eventDate)` (no leading zero, full month name). Otherwise it returns `EVENTS_HEADING` ("What happened"). `ReadingView`'s `<h2>` renders it, so it applies on both routes and both layouts. The status label is unchanged. Outside tests, "What happened" now exists as a string only in `EVENTS_HEADING`. |
| R2 | `lib/date-page/accuracy.ts` `unavailableMessage(availability, eventsHeading)`; `ReadingView.tsx` `HoroscopeUnavailableSection`; both `page.tsx` files | The linkable-years variant quotes the heading it's given: `` `…listed under "${eventsHeading}" to go to that date instead.` `` `HoroscopeUnavailableSection` takes an `eventsHeading` prop, and both pages pass `eventsHeading(events, date)`, the same function `ReadingView` uses for the `<h2>`. So the quoted heading and the shown heading come from one function call with the same inputs, and the text is never typed twice. That variant only appears for unmatched events with at least one linkable year, which is always the `"below"` case. `lib/` still doesn't import from `app/`; the heading is passed in. |
| R3 | `app/date/[date]/DatePicker.tsx` | The `<label htmlFor="date-page-picker">` reads "Pick a different date". `grep -rn "Another date" app lib` gives `exit=1`. Sprint 52's test titles and one comment that named "Another date" now say "picker panel". |
| R4 | `ReadingView.tsx` `HoroscopeUnavailableSection` | `<strong>{lead}</strong><br />{next}`, replacing the `" "` between them. It's still one `<p class="accuracyNote">`, with no CSS changed for it. The probe shows margin `0px` and the same lead weight, size and colour. |

### A layout decision you made during the build (phones only)

"Pick a different date" is much wider than "Another date": about 166px with its letter-spacing, against 91px. At 390px it no longer fit on one row with the date input and Go, so Go dropped to the second line. That would break **Sprint 52's R3**, which requires label, input and Go on one row on phones. I asked you twice:
1. **Wrap the label to two lines:** your first choice, but it measured not to fit. Its wider line, "DIFFERENT DATE", is 106.4px, and the row leaves 104px (a content box of 326, minus the 16px gap, the 140px input, the 16px gap and the 50px Go).
2. **Three lines:** your choice. On phones, `.anotherDate .pickerLabel { max-width: 100px }`, so it reads "PICK A / DIFFERENT / DATE" and label, input and Go share one row at 390px.

On narrower phones (375px and 360px measured) Go still drops to the second line. The label's font, spacing and colour are unchanged, and desktop is unchanged. This is the one CSS change in this sprint (`date.module.css`, phone block), and the rule's comment records it.

### Tests

- **`app/reading/[id]/display.test.ts`, R1:**
  - other years: 2026-07-04 gives "Other years with 4 July events", 2026-11-25 gives "…25 November…", and 1931-03-03 gives "…3 March…" (the single-digit day);
  - matched, unmatched with no events, and null each give "What happened";
  - the heading differs from "What happened" exactly when `eventsPlacement` is `"below"`.
- **`lib/date-page/accuracy.test.ts`, R2, with fixed headings:**
  - R3's message quotes "Other years with 9 May events" for the 9 May fixture;
  - a 4 July case gives the exact R2 string from the sprint file;
  - the no-linkable-years variant ignores the heading ("Pick a different date.").
- **`app/reading/[id]/ReadingView.test.tsx`, R2/R4:** `HoroscopeUnavailableSection` renders exactly one `<p class="accuracyNote">`, with the bold lead, one `<br/>`, then the next step quoting the given heading. Both the no-linkable-years and lookup-failed variants have the same structure, with exactly one `<br/>` and no stray characters.
- **`app/reading/[id]/events-placement-pages.test.ts`, R1 on both routes:**
  - The date page on 1931-03-03 shows `>Other years with 3 March events</h2>` and no "What happened" heading. Matched, empty and lookup-failed cases show "What happened".
  - `/reading/[id]` shows "Other years with 20 July events" for a stored other-years row, and "What happened" otherwise.
  - The phone-order test anchors on "Other years with 6 June events".
  - The section order is now found by the events section's class, since the heading text varies.
- **`app/date/[date]/DateNavigation.test.tsx`, R3:** `<label class="pickerLabel" for="date-page-picker">Pick a different date</label>`.
- **`app/reading/[id]/accuracy-pages.test.ts`** (Sprint 39), updated:
  - the R3 message expectation is now per date, `nextR3("9 May")` and so on;
  - the no-linkable message is matched as `</strong><br/>Pick a different date.</p>`;
  - `eventsColumn` anchors on the events section's class rather than its heading text.

### Manual check (R6 screenshots)

I built for production with `next build && next start` against Sprint 47's stand-in with Sprint 48's rows ([cdp54.mjs](sprint-54/cdp54.mjs); results in [report.json](sprint-54/report.json)). The other-years cases use the live Wikipedia feed for those dates, which isn't today's date; today matched on the live feed earlier in this session.

| Page | Width | Heading | Status label | Message |
|---|---|---|---|---|
| `/date/1931-03-03` (other years, live feed) | 1280 / 390 | Other years with 3 March events | on this day, other years | one `<p>`, one `<br>`, next step starts below the lead and quotes "Other years with 3 March events" |
| `/date/1931-09-30` (the long heading) | 1280 / 390 | Other years with 30 September events | on this day, other years | as above, for 30 September; at 390 the heading wraps to two lines inside its section |
| `/date/1969-07-20` (matched) | 1280 / 390 | What happened | this exact date | (none: writable) |
| `/reading/48480000-…-0002` (stored other-years fixture) | 1280 / 390 | Other years with 3 March events | on this day, other years | as for the date page |

- **No sideways scroll anywhere** (the scroll width equals the viewport).
- **The picker label** reads "Pick a different date" on every date page.
- **Screenshots:**
  - other years: [other-years-1280-events-reading.png](sprint-54/other-years-1280-events-reading.png) and [other-years-390-events-reading.png](sprint-54/other-years-390-events-reading.png);
  - the long heading: [long-heading-390-events-reading.png](sprint-54/long-heading-390-events-reading.png) and the 1280 one;
  - matched: [matched-1280-events-reading.png](sprint-54/matched-1280-events-reading.png) and [matched-390-events-reading.png](sprint-54/matched-390-events-reading.png);
  - the picker panel: [picker-panel-1280.png](sprint-54/picker-panel-1280.png) (one centred row) and [picker-panel-390.png](sprint-54/picker-panel-390.png) (the three-line label beside the input and GO, then "OR DISCOVER RANDOM READING" centred below);
  - the reading fixture: `reading-other-years-*.png`.
- **Sprint 52's checks re-run on this build** (its `cdp52.mjs`):
  - page order is unchanged on both layouts, with no sideways scroll;
  - at 390, Go is on the first row with the input, and the input, Go and the random link are each 44px;
  - Tab order is banner, day links, chart, reading, picker, Go, random link, Notable dates;
  - the picker still submits (it lands on `/date/1955-12-01`).

### Known limitations

- **Narrow phones:** on phones narrower than 390px, Go drops to the second line (see the decision above).
- **Pre-existing:** on `/reading/[id]` the message still says "Pick a different date", where there's no picker. I raised this in Sprint 48, and it's with Master Controller. This sprint doesn't change it (R2 only changes which heading is quoted).
- **Lint:** the same 3 warnings in my Sprint 45/46 probe scripts, still waiting on Master Controller. This sprint adds none.

### Questions for QA1

None. The phone-label layout is your decision, made during the build, recorded above.
