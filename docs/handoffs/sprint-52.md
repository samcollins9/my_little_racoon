# Sprint 52 handoff — Date page order: day links on top, picker below the reading

## Round 1

**Status:** ready for QA1's gate-1 audit.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (54 test files, 604 tests).

**Sprint file:** I re-read it at this commit. It's unchanged since `/sprint-start` (`4a061b7`): `git log 4a061b7..HEAD` on the file is empty. I built from the amended version: day links above the date band (R1), plus R10 and R11.

### What changed

| Req | Where | How |
|---|---|---|
| R1 | `app/reading/[id]/ReadingView.tsx`, `app/date/[date]/page.tsx`, `DateNavigation.tsx`, `date.module.css`, `reading.module.css` (comment) | `ReadingView`'s `belowDateBand` slot became **`aboveDateBand`**. It renders right after `<SiteBanner>`, before the date band, in the same `.flowSlot` wrapper. The date page passes only `<DateNavigation …/>` to it, including Sprint 47's disabled Next day. Nothing renders between the date band and the body any more. `/reading/[id]` never passed this prop, so nothing changes there (R6). |
| R2, R4 | `DatePicker.tsx`, `page.tsx`, `RandomReading.tsx` (deleted) | `DatePicker` is now the **one** "Another date" panel. It renders once, at the start of `afterBody`, so after the body and before "Notable dates", on every layout, with no `desktopOnly` or `mobileOnly`. In order it holds the label, the date input, Go, then a span with "or" and the random link. The GET form to `/date`, `min`, `max = today` and `required` are unchanged. The random link's markup moved inline from `RandomReading.tsx`, unchanged. `RandomReading.tsx`, Sprint 47's phone-only bottom copy (`RandomReadingSection`), its `.randomSection` CSS, and the desktop copy's `desktopOnly` wrapper are all gone. `loadRandomReadingDate` is still called once per request (`page.tsx:99`), and its date reaches only `DatePicker`. |
| R3 | `date.module.css` | See "R1 and R3 spacing" below. |
| R5 | — | DOM order is banner, day links, date band, body, "Another date", phone "Notable dates", then desktop "Notable dates". Each "Notable dates" copy shows at one width only. `grep -rnE "^\s*order\s*:\|column-reverse\|row-reverse" app --include=*.css` gives `exit=1`. |
| R6 | — | `/reading/[id]`'s page and render tests are unchanged. The only `/reading` test edits are R10's two message strings in `accuracy-pages.test.ts`, which its unmatched-reading cases quote. |
| R8 | `README.md` | The Sprint 47 paragraph's navigation description is replaced by "The date page, top to bottom (Sprint 52)", which lists R5's order. |
| R10 | `lib/date-page/accuracy.ts` | The two "unmatched" strings are now exactly `Pick a different date, or choose one of the years listed under "What happened" to go to that date instead.` and `Pick a different date.` The lead sentences and the lookup-failed message are unchanged. |
| R11 | `NotableDates.tsx` | `HEADING = "Notable dates"`, the one constant both copies use. The `aria-labelledby` ids (`notable-dates-panel-heading`, `notable-dates-section-heading`) already contained no "other". |

### R1 and R3 spacing: what was reused and what was adjusted

**Day links (R1):**
- **Kept:** `.flowSlot` (`padding: 14px 40px`, `10px 24px` on phones, and `border-bottom: 1px solid var(--om-rule)`), unchanged and placed under the banner. The banner's own bottom rule sits above it, the strip's rule sits below it, and then the date band.
- **Adjusted:** `.dateNav` lost `margin-top: 14px`, `padding-top: 12px` and `border-top`. They only separated the day links from the picker row above them, which is gone. Without the change there'd be a doubled gap and a second rule under the banner. `.dateNav` keeps `min-width: 0`.
- The day links' own styles (`.adjacent*`) are untouched.

**"Another date" panel (R3):**
- **Reused, no new visual treatment:** `.picker`, `.pickerLabel`, `.pickerInput`, `.pickerButton`, `.pickerLink` and `.pickerOr` are all unchanged at desktop width. The panel's section spacing is `.anotherDate { padding: 14px 40px; border-top: 1px solid var(--om-rule) }` (`10px 24px` on phones). Those are `.flowSlot`'s values, where the picker used to live. The rule is on top because the panel now follows the body instead of preceding it. "Notable dates" keeps its own top rule, so there's one rule between the two panels.
- **Phones only (≤900px), adjusted for R3's limits:**
  - `.anotherDate .pickerControls { display: contents }`. Without it, the label sat alone on its own line, because the controls block (input, Go and the "or"+link span) was too wide to fit beside it. With it, the input, Go and the span wrap as items of the form's row: label, input and Go fit on one line at 390px, and "or Discover random reading", one non-wrapping span, drops to the next. On phones the input-to-Go gap becomes the form's 16px instead of 10px; desktop doesn't change.
  - `.pickerInput, .pickerButton { min-height: 44px }`: every control clears 44px.
  - `.pickerLink { box-sizing: border-box; display: inline-flex; align-items: center }`, because an `<a>` is content-box. My first build measured the link at 64px tall with its label stuck at the top. Now it's 44px with the label centred, matching the `<button>`.

### Tests (R7)

- **New:** `app/date/[date]/page-order.test.ts`, through the real `DatePage`:
  - landmark DOM order is banner, day links, date band, body, Another date, phone "Notable dates", then desktop "Notable dates", each appearing exactly once;
  - **nothing between the date band and the body:** the JD block's `</span></div></div>` runs straight into `<div class="body">`;
  - the day links sit alone in the strip, between `</header>` and the date band;
  - **exactly one date input, and at most one random link:** one when the pool has a date, none when the lookup fails.
- **Updated, Sprint 47's tests of the old positions:**
  - `future-and-days-page.test.ts`: "phones get it at the bottom: one pick, the same href in both copies" is **retired** (R4) and replaced by **"one copy only, inside the one Another date panel after the body"**. It asserts a single `/date/2001-09-11` href, inside `form.picker.anotherDate`, right after the body's closing tags. "With no date to offer, neither copy renders" now asserts no link and no "or", while the panel keeps the picker and Go.
  - `DateNavigation.test.tsx`: the picker-row test expects `class="picker anotherDate"` and `<span class="pickerRandom">` with no `desktopOnly`.
  - `notable-dates-page.test.ts` (Sprints 45/50):
    - the strip test is now "the strip under the banner holds only the day links: no picker, no notable dates";
    - the order test asserts `</section></div></div>${Another date}${phone copy}${desktop panel}</main>`.
  - `events-placement-pages.test.ts` (Sprint 48, R6): the phone order now ends reading/events, then the Another date panel, then Notable dates, where Sprint 47's random section used to be.
- **Updated for R10 and R11:** `lib/date-page/accuracy.test.ts` and `app/reading/[id]/accuracy-pages.test.ts` quote the new strings exactly. `NotableDates.test.tsx` quotes "Notable dates".
- **Greps (unpiped):**
  - `grep -rn "Other notable dates" app lib` gives `exit=1`; the comments that used the old name were reworded to the new one.
  - `grep -rn "date above" app lib` gives `exit=1`.

### Manual check (R9 screenshots)

I built for production with `next build && next start` against Sprint 47's stand-in with Sprint 48's rows, and drove Chrome 156 headless ([cdp52.mjs](sprint-52/cdp52.mjs); results in [report.json](sprint-52/report.json)).

- **1280, `/date/1969-07-20`:**
  - **Order:** on-screen order is banner, day links, date band, body, Another date, Notable dates. The gap from the date band to the body is 0, and the scroll width is 1280.
  - **Panel:** label, input, Go, "or" and the random link all sit on one row, unchanged in size (input 37px tall, Go and the link 34px).
  - **Screenshots:** [desktop-1280-top.png](sprint-52/desktop-1280-top.png) and [desktop-1280-bottom.png](sprint-52/desktop-1280-bottom.png).
- **390, `/date/1969-07-20`:**
  - **Order:** the same, and the scroll width is 390.
  - **Panel:** label, input and Go on one row, then "or Discover random reading" on the next. The input, Go and link are each **44px** tall, and every control lies inside the card.
  - **Screenshots:** [phone-390-top.png](sprint-52/phone-390-top.png) and [phone-390-bottom.png](sprint-52/phone-390-bottom.png).
- **390, today (`/date/2026-11-25`):** the day navigation sits between the banner and the date band, showing "NEXT DAY → Reloy predicts only the past." The scroll width is 390. Screenshot: [phone-390-today-top.png](sprint-52/phone-390-today-top.png). Today's feed is unmatched, so the shot also shows R10's new message.
- **Unmatched date (`/date/1931-03-03`):** the message reads "…Pick a different date, or choose one of the years listed under "What happened" to go to that date instead.", with no "above". The panel directly follows the body.
- **Tab order at 1280, from a fresh load:** banner, day links, chart, reading, picker, Go, random link, Notable dates. The matched date's events have no links, so there's no events stop.
- **The picker from its new place:** I set the date to 1955-12-01 and submitted, and it landed on `/date/1955-12-01`.

### Known limitations

- **Narrower than 390px:** on a phone narrower than about 340px, Go may wrap under the input. R3 sets its limits at 390px, and nothing scrolls sideways either way.
- **Lint:** the same 3 warnings in my Sprint 45/46 probe scripts, still waiting on Master Controller. This sprint adds none.

### Questions for QA1

None.
