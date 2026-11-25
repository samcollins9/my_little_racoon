# Sprint 47 handoff — Day-by-day navigation, a random reading link, and no future dates

## Round 1

**Status:** ready for QA1's gate-1 audit.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (48 test files, 561 tests).

### What changed

| Req | Where | How |
|---|---|---|
| R1 | `lib/date-page/params.ts` | `isAfterToday(isoDate, now = new Date())` is `isoDate > utcToday(now)`. It's the only comparison with today for this purpose; everything below calls it. `FUTURE_DATE_MESSAGE` holds the user's wording once. |
| R2 | `app/date/[date]/page.tsx`, `app/date/page.tsx` | After `parseDatePageParam` (so invalid and out-of-range dates still `notFound()`), a future date gets `redirect(datePagePath(today))`, which is a 307. On the date page it comes before `createAnonClient()` and `loadDatePage`. The page reads the clock **once** per request (`now`), and the redirect, the picker's `max`, the day links and the random pick all use that same reading, so they can't disagree across midnight. |
| R3 | `app/date/[date]/DatePicker.tsx` | `max={today}`, passed in by the page from `utcToday(now)`. `min` is still `MIN_SUPPORTED_DATE`. `MAX_SUPPORTED_DATE` is no longer used by the picker. |
| R4 | `lib/date-page/cast.ts`, `app/reading/[id]/actions.ts` | `castHoroscopeForDate` refuses right after the "disabled" check, before the lookup, the events fetch, the insert and generation. `generateReadingHoroscope` refuses after reading the stored row (it needs `event_date`), before `createAdminClient()` and `generateAndPersistHoroscope`. It redirects back to the reading with `?error=Reloy predicts only the past.` |
| R5 | `lib/date-page/navigation.ts` `dayNavigation`, `lib/date-page/params.ts` `addDays`, `DateNavigation.tsx`, `date.module.css` | `addDays` is `Date.UTC(y, m-1, d+days)`. Previous is `parseDatePageParam(addDays(d, -1))`, so it's null on 1700-01-01. Next is `{kind:"future"}` when `isAfterToday(addDays(d, 1))`, otherwise a link. Labels are "← Previous day" / "Next day →", each with its long date, using the same `.adjacent*` classes and placement as before. The disabled Next day is a `<span role="link" aria-disabled="true">` with no `href` and no `tabindex`. The message sits in visible text where the date would be (`.adjacentNote`). Nothing here needs the database. The `<nav>` is labelled "Previous and next day". |
| R6 | `lib/date-page/navigation.ts` `pickRandomReadingDate`, `loadRandomReadingDate`; `DatePicker.tsx`; `date.module.css` | One anon `rpc("get_recent_reading_dates")`, classified `dateLookup`, so a failure is logged in full and returns null. The pure `pickRandomReadingDate(rows, isoDate, random, now)` drops the page's own date and anything after today, then picks with the injected `random`, clamped the same way `pickTagline` is. The page passes `Math.random`, after `connection()`. The link is `className={`${styles.pickerButton} ${styles.pickerLink}`}`: Go's own rule set, plus `.pickerLink`, which adds only `display: inline-block; text-decoration: none` because it's an `<a>`. The "or" is `.pickerOr`. With no date, neither renders. It sits in the existing `.pickerControls` flex row, which already wraps. |
| R7 | `lib/date-page/navigation.ts`, `page-test-support.ts`, tests | `loadDateNavigation`, `shapeDateNavigation`, the `DateNavigation` type and their tests are gone, and the app no longer calls `get_adjacent_reading_dates`. `NAVIGATION_RPCS` (the shared page-test fixture) now answers `get_recent_reading_dates`. `availability.ts`'s classification comment names the new caller. No migration. |
| R8 | — | Notable dates, Sprint 39's messages and year links, the banner and `/` are unchanged. All 20 notable dates are in the past. |
| R9 | `README.md` | A new paragraph, "Which dates, and getting between them (Sprint 47)", after the intro. It covers 1700-01-01 to today (UTC) and the redirect, the picker's `max`, both write paths refusing, the single rule's location, day-by-day links with the disabled Next day, and the random link with its fallback. The README had never described date navigation before. |

### Acceptance greps (re-run after the last change, unpiped)

- R7: `grep -rn "get_adjacent_reading_dates\|Previous reading\|Next reading" app lib` gives no output, `R7 grep exit=1`. It's not disguised. Some comments I'd first written named the retired links and RPC, and so did one regex test asserting the old labels were absent. I found them by running this grep, reworded the comments to describe the history without those strings, and **deleted** that test rather than keep a disguised copy. The exact-label assertions in `DateNavigation.test.tsx` already pin the new labels.
- R7: `git diff --quiet HEAD -- supabase/migrations` gives `exit=0`.

### Tests

- **`lib/date-page/params.test.ts`:**
  - R1: today is allowed and tomorrow refused, with `now` injected. The boundary is 23:59:59.999Z against 00:00:00.000Z, and a non-UTC offset is decided by its UTC date. With no `now`, the real clock is used. The message is exact.
  - R5: `addDays` for 1969-07-20 ±1, 2000-02-28 → 02-29, 2001-02-28 → 03-01, 1999-12-31 → 2000-01-01, 2000-03-01 → 02-29, and also 1900-02-28 → 03-01 (a century non-leap year) and 1700-01-01 → 1699-12-31.
- **`lib/date-page/navigation.test.ts`:**
  - `dayNavigation`: an ordinary date, the R5 arithmetic cases, no previous day on 1700-01-01, today's next day is `future`, yesterday links to today, and the UTC midnight boundary.
  - `pickRandomReadingDate`: a fixed random source picks the expected date; never the page's own date; never a future date; null for an empty pool, a null result, or a pool emptied by filtering; out-of-range and `NaN` random values are handled.
  - `loadRandomReadingDate`: it makes only that RPC, with no argument; a paused lookup gives null and logs "(recent dates)"; an empty result gives null without logging.
- **`lib/date-page/cast.test.ts`:** R4 for tomorrow and for 2100-12-31. Neither the reader lookup, `from`, `insert`, the events fetch nor the generator is called. Today is still written.
- **`app/reading/[id]/actions.test.ts`** (new; this action had no unit test before): R4 for tomorrow and for 2100-12-31. It redirects back with the message, and `createAdminClient` and `generateAndPersistHoroscope` are never called. Today goes on to the generator.
- **`app/date/[date]/DateNavigation.test.tsx`** (new):
  - R5: the ordinary date's links, labels, `rel` and long dates.
  - Today: one link only, and the exact disabled `span` (`role="link"`, `aria-disabled="true"`, the message), with no `tabindex`.
  - 1700-01-01: no Previous.
  - R3: the `max`/`min` the picker renders.
  - R6: Go, then "or", then `<a class="pickerButton pickerLink" href=…>`, in that order. With no date there's neither "or" nor link.
- **`app/date/[date]/future-and-days-page.test.ts`** (new), through the real `DatePage` and `/date` target, with Next's real `redirect()`/`notFound()` read from their digests and the clock fixed at 2026-11-25 14:00 UTC:
  - R2: `/date/<tomorrow>`, `/date/2027-01-01` and `/date/2100-12-31` give `307 /date/<today>` with **zero RPCs called**, which shows the redirect comes before `loadDatePage`. `/date?date=<tomorrow>` gives `307 /date/<today>`. `2024-02-30` and `2101-01-01` 404 on both routes. Tomorrow is still refused at 23:59:59.999Z.
  - R3: the rendered input's `max` is today.
  - R5: with **both** lookups paused, both day links still render. Today's page has no tomorrow link, plus `aria-disabled` and the message.
  - R6: with `Math.random` fixed, the expected date is picked, never the page's own date or the future. The render calls exactly `{get_reading_by_date, get_recent_reading_dates}`. There's no link and no "or" when the lookup fails, the pool is empty, or only the own date and the future are left, and Go and the day links still render.
- **Updated:**
  - Sprint 45's `NotableDates.test.tsx` and `notable-dates-page.test.ts` use day navigation. The strip wrapper is never `desktopOnly` any more, because a day link always exists. The RPC allow-list is now `{get_reading_by_date, get_recent_reading_dates}`.
  - `accuracy-pages.test.ts` and `banner-pages.test.ts` rendered date pages in 2031/2032 to get guaranteed-unmatched years. Those are now future dates and redirect, as intended. I moved them to 1931/1932, keeping each month-day, because those files rely on distinct month-days for Wikipedia's per-month-day cache. Neither year appears as an event year in either file (`grep exit=1`). Their assertions are unchanged.

### Manual check (R10 screenshots)

I built for production with `next build && next start` against a PostgREST stand-in ([fake47.mjs](sprint-47/fake47.mjs): Sprint 46's, plus `get_recent_reading_dates`). Its recent pool is `2031-01-01, 1969-07-20, 1912-04-15, 1961-04-12, 2001-09-11, 1989-11-09`, which deliberately includes a future date and the test page's own date. I drove Chrome 156 headless over CDP ([cdp47.mjs](sprint-47/cdp47.mjs), results in [report.json](sprint-47/report.json)). Checked on 2026-11-25, around 14:40 UTC.

- **Redirects, by curl** ([redirects.txt](sprint-47/redirects.txt)):
  - `/date/2026-11-26`, `/date?date=2026-11-26` and `/date/2100-12-31` each give `307 → /date/2026-11-25`.
  - `/date/2026-11-25` and `/date/1969-07-20` give 200.
  - `/date/2101-01-01`, `/date/2024-02-30` and `/date?date=2101-01-01` give 404.
  - The stand-in's log has no lookup for 2026-11-26.
  - The picker on `/date/1969-07-20` has `min="1700-01-01" max="2026-11-25"`.
- **Desktop 1280, `/date/1969-07-20`:** [desktop-1280-picker-row-and-days.png](sprint-47/desktop-1280-picker-row-and-days.png) ← R10 shot 1.
  - The row reads `ANOTHER DATE [07/20/1969] GO or DISCOVER RANDOM READING`.
  - "← Previous day 19 July 1969" links to `/date/1969-07-19` (`rel=prev`). "Next day → 21 July 1969" links to `/date/1969-07-21` (`rel=next`).
  - The random link's computed border, font family, size, letter spacing, case, padding and colour all **equal Go's**, and its hover colour and border equal Go's hover.
  - There's no underline, and no sideways scroll.
- **Five loads of `/date/1969-07-20`:** the random link pointed to 1961-04-12, 1961-04-12, 2001-09-11, 1989-11-09 and 2001-09-11. An earlier run gave 2001-09-11, 1989-11-09, 1989-11-09, 2001-09-11, 1989-11-09 and 1912-04-15. It never gave 1969-07-20 or 2031-01-01.
- **Desktop 1280, today (`/date/2026-11-25`):** [desktop-1280-today-next-day-disabled.png](sprint-47/desktop-1280-today-next-day-disabled.png) ← R10 shot 2.
  - "← Previous day 24 November 2026" is a link.
  - "Next day →" is greyed, with *Reloy predicts only the past.* in the date's place. It's a `SPAN` with `role=link`, `aria-disabled=true` and `tabIndex -1`.
  - In 40 Tab presses from the top, focus **never** landed on it, nor on any link to a date after today.
  - Clicking it left the page at `/date/2026-11-25`.
- **Phone 390, `/date/1969-07-20`:** [phone-390-random-link-wrapped.png](sprint-47/phone-390-random-link-wrapped.png) ← R10 shot 3.
  - Go and "or" share a line, and DISCOVER RANDOM READING wraps onto the next (its top is 281, Go's bottom 270).
  - The page scroll width equals the viewport at 390, so there's no sideways scroll.
  - Both day links are visible. The phone copy of the notable dates is visible, and the desktop strip copy isn't.
  - Also on today's page at 390 ([phone-390-today.png](sprint-47/phone-390-today.png)): the disabled Next day and its message are visible, and the scroll width is 390.
- **Random lookup outage** ([recent-outage.txt](sprint-47/recent-outage.txt)): I re-ran the stand-in with `RECENT=down`, so `get_recent_reading_dates` returned 500.
  - `/date/1969-07-20` is 200, with no "Discover random reading" and no "or" (`grep exit=1` each).
  - Go, both day links and the notable dates are present (`grep exit=0` each).
  - The server logged `DatePage (recent dates): database unavailable` with its status.

### Known limitations

- **Sprint 39's year links can point at the future.** They're unchanged (R8), so a Wikipedia event dated in a future year would link to a date page that now redirects to today. Real events never carry a future year, so this is theoretical, and it's what R8 asked for. `accuracy-pages.test.ts` still asserts a 2050 year link renders.
- **`/chart?date=<future>`** (Sprint 31's redirect, unchanged) goes to `/date/<future>`, which then redirects to today: two hops, ending in the right place.
- **The disabled "Next day →" label is deliberately faint** (`--om-rule-strong`). The message beside it is the readable part, at `--om-grey`, in italics. QA1 or LiveQA may judge the label too faint.
- **Lint warnings that aren't this sprint's:** `npm run lint` passes, with 3 warnings (`no-unused-expressions`). They're in my own probe scripts from earlier sprints: `docs/handoffs/sprint-45/cdp45.mjs` and `cdp45-overflow.mjs` (shipped in `8920e16`) and `docs/handoffs/sprint-46/cdp46.mjs` (shipped in `2a74097`), each from a `cond ? reject() : resolve()` statement. Both commits passed verify and QA1, and warnings don't fail lint. This sprint's own `cdp47.mjs` avoids the pattern and adds no warning. I left the closed sprints' evidence files untouched. If they should be cleaned up, that's a one-line change per file for whoever owns that call. This is unowned, not a recorded decision, so I'm naming it to QA1 and Master Controller rather than calling it "known".

### Questions for QA1

1. **R5's disabled element.** I used `role="link"` on the `<span>`, so `aria-disabled` has a role to apply to, and a screen reader announces "Next day, link, dimmed" with no tab stop. R5 says "not a link and not focusable as one". It isn't an `<a>`, has no `href` and isn't focusable. Is a `role="link"` presentation acceptable, or would you rather it had no role at all, in which case `aria-disabled` on a plain `span` is ignored by most screen readers?
2. **R4 on the reading page.** The refusal comes after `get_reading_by_id`, because that's the only source of the stored `event_date`. It comes before the admin client and OpenAI, as R4 requires. Is that the placement you'd expect?

## Round 2

**Status:** ready for QA1's re-audit. This round makes QA1's three required fixes for R6's phone amendment, re-checks R9 and changes nothing else.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (48 test files, 563 tests).

### What went wrong in Round 1

Master Controller amended R6 in `9dc8580` (09:42 -0500), after my `/sprint-start` (`5df44d2`, 09:28), at the user's request. I'd read the sprint file at start and built from that read, without re-reading it before handing off, so Round 1 implemented the pre-amendment R6. QA1's diagnosis is correct in every detail. From now on I re-read the sprint file at the commit I'm about to hand off, not only at start.

### Fix 1: on phones, the link moves to the bottom (R6 amendment)

- **`app/date/[date]/RandomReading.tsx` (new):**
  - `RandomReadingLink` is the one link markup: Go's `.pickerButton` plus `.pickerLink`, unchanged from Round 1.
  - `RandomReadingSection` is the phone copy: a `mobileOnly` `div.randomSection` holding that link. It renders nothing when there's no date.
- **`DatePicker.tsx`:** the picker-row "or" and link are now one `span.pickerRandom.desktopOnly`, so at ≤900px the picker row is just the date input and Go.
- **`page.tsx`:** `afterBody` is now `<RandomReadingSection date={randomDate} />` followed by `<NotableDatesSection … />`. `ReadingView` renders `afterBody` after the `.body` div, so the phone copy sits after the reading section and outside it, and therefore outside its sticky reveal, directly above "Other notable dates".
- **One pick, shared:** `randomDate` is still computed once (`loadRandomReadingDate`, after `connection()`), and the same value goes to both `DatePicker` and `RandomReadingSection`. There's no second pick and no second lookup.
- **`date.module.css`:**
  - `.pickerRandom`: `white-space: nowrap`. It has no `display`, because `desktopOnly` owns that, the same convention as `.dateNav`.
  - `.pickerOr`: gains `margin-right: 10px`. The flex gap no longer reaches between "or" and the link, since both now sit inside one flex item.
  - `.randomSection` (new): `padding: 18px 24px; border-top`, with no `display`, because `mobileOnly` owns it.

### Fix 2: tests

`app/date/[date]/future-and-days-page.test.ts`, through the real `DatePage` with `Math.random` fixed:
- **Same `href`:** exactly two "Discover random reading" links render, and both are `/date/2001-09-11`.
- **The picker-row copy is desktop-only:** it's inside `<span class="pickerRandom desktopOnly">`, together with its "or".
- **Placement:** the markup contains `</section></div></div><div class="randomSection mobileOnly">…</div><nav class="notableSection mobileOnly" aria-labelledby="notable-dates-section-heading">`. In other words, the reading section, the right column and the body all close, then comes the phone copy, then the notable dates.
- **No date:** with nothing to offer, neither copy renders (no `randomSection`, no `pickerRandom`), and the notable dates follow the reading section directly. Round 1's existing cases (lookup fails, empty pool, only the page's own date or the future left) still find no link anywhere.

`DateNavigation.test.tsx`'s picker-row test now expects the `desktopOnly` wrapper.

### Fix 3: phone screenshots, and the sticky reveal bar

I used the same rig as Round 1 (production `next build && next start`, [fake47.mjs](sprint-47/fake47.mjs)). [cdp47.mjs](sprint-47/cdp47.mjs) is updated in this round: its phone section is new, and Round 1's version is at `e444619`. Results are in [round2-report.json](sprint-47/round2-report.json). `/date/1969-07-20` has a saved horoscope, folded.

- **Phone 390, top:** [round2-phone-390-top-no-random-link.png](sprint-47/round2-phone-390-top-no-random-link.png) ← R10's top shot.
  - The picker row is `ANOTHER DATE [date] GO`. No random link or "or" is visible inside the form.
  - Then Previous day / Next day, then the chart panel. Their page offsets are: picker 211–248, day links 275–309, chart tabs from 320.
  - The scroll width is 390.
- **Phone 390, bottom:** [round2-phone-390-bottom-reading-random-notable.png](sprint-47/round2-phone-390-bottom-reading-random-notable.png) ← R10's bottom shot.
  - The reading section (offset 784–1054), then DISCOVER RANDOM READING (1073–1107), then "Other notable dates" (from 1125).
  - The visible copy isn't inside the reading section.
- **Both copies on the phone render share one `href`** (`/date/1961-04-12`). Only the bottom one is shown.
- **The sticky reveal bar** is `position: sticky`, and the horoscope is folded. I scrolled so the link's bottom edge sat 0, 40, 80, 160 and 300px above the viewport's bottom edge. In all five positions, `elementFromPoint` at the link's centre **was the link**, and the overlap between the link and the reveal bar was **0px**. The bar stops at the end of its own reading section, which ends above the link.
- **Desktop 1280:** both copies point at the same date, the picker-row copy is shown and the bottom copy isn't. [round2-desktop-1280-picker-row-and-days.png](sprint-47/round2-desktop-1280-picker-row-and-days.png) shows the row as in Round 1, with the "or" spacing kept. The disabled Next day on today's page is unchanged ([round2-desktop-1280-today-next-day-disabled.png](sprint-47/round2-desktop-1280-today-next-day-disabled.png)): Tab never reaches it, and a click doesn't navigate.
- **Five loads** gave 1912-04-15, 1961-04-12, 1912-04-15, 2001-09-11 and 1961-04-12. None was the page's own date or the future.

Round 1's evidence files are left as they were. Round 2's are the `round2-*` files.

### R9 re-checked

The README paragraph now says where the link sits on phones (the bottom of the page, after the reading and above "Other notable dates"), and that one pick per request serves both places. Nothing else in it changed.

### Acceptance greps, re-run after the last change, unpiped

- `grep -rn "get_adjacent_reading_dates\|Previous reading\|Next reading" app lib` gives `R7 grep exit=1`.
- `git diff --quiet HEAD -- supabase/migrations` gives `exit=0`.

### Not changed

- R1–R5, R7 and R8 are unchanged, along with QA1's rulings on both of my Round 1 questions.
- The 3 lint warnings in my Sprint 45/46 probe scripts are still there. They're routed to Master Controller by QA1, and this round leaves them alone.
