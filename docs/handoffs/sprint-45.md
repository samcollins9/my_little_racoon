# Sprint 45 handoff — Notable dates replace the recently written list

## Round 1

**Status:** ready for QA1's gate-1 audit.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (43 test files, 502 tests).

### What changed

| Req | Where | How |
|---|---|---|
| R1 | `lib/date-page/notable-dates.ts` (new) | `NOTABLE_DATES: readonly NotableDate[]`, the 20 rows of R1's table verbatim, oldest first. |
| R2 | same | The module has no imports at all. A test reads its source and asserts that. `DateNavigation` no longer returns `null` when the lookup is unavailable; it renders the list and leaves out only Previous/Next. |
| R3 | `app/date/[date]/NotableDates.tsx` `NotableDatesStrip`; `date.module.css` | Sits in the strip where the old list was, under the heading "Other notable dates", with the same list and link styles. Each item holds a `<span role="tooltip">` that the link points at with `aria-describedby`. The CSS rule that shows it is `.notableItem:hover > .notableTooltip, .notableLink:focus-visible + .notableTooltip`. It hides with `visibility`, so the description stays readable to assistive technology while hidden. No `title` attribute anywhere. |
| R4 | `NotableDatesSection`; `ReadingView`'s new `afterBody` prop | Rendered as the card's last child, after `.body`, so it follows the reading section and sits outside it and its sticky reveal. `mobileOnly`, not inside `<details>`. The heading uses `readingStyles.sectionTitle`. Each row is a link holding the date and the description as a visible second line, with a minimum height of 44px. With no Previous/Next, the strip's wrapper is `desktopOnly`, so phones don't get an empty ruled-off strip. |
| R5 | both copies | The page's own date is a `<span aria-current="page">` and its description stays: the tooltip on desktop, the visible line on phones. |
| R6 | both copies | `href={datePagePath(date)}`, `prefetch={false}`. |
| R7 | `DateNavigation.tsx` | The Previous/Next markup, `rel`, labels and placement are unchanged. |
| R8 | `lib/date-page/navigation.ts`, tests, `page-test-support.ts`, `availability.ts` comment | `RecentReadingDate`, `recent`, the sort, and the `get_recent_reading_dates` call are removed. `loadDateNavigation` now makes one RPC. The `aria-label`s are now "Previous and next readings" (the Previous/Next `<nav>`) and the list's own `<nav>`, labelled by its "Other notable dates" heading. `grep -rn "get_recent_reading_dates\|RecentReadingDate\|Recently written" app lib` gives exit 1. `git diff --quiet HEAD -- supabase/migrations` gives exit 0. |
| R9 | `lib/date-page/notable-dates.test.ts` | Checks 20 entries, every date passing `parseDatePageParam`, strictly ascending order with no duplicates, and the exact text against R1's table, which is copied into the test by hand. |
| R10 | `README.md` | No change needed. `grep -n -i "recent\|sprint 29\|adjacent\|notable" README.md` finds nothing (exit 1), so the README never described the old list or its RPC. |

**Small shared change:** `formatLongDateText` ("20 July 1969") moved from a private helper in `DateNavigation.tsx` to `app/reading/[id]/format.ts`, because both components need it. It has its own test.

### Tests

- **`lib/date-page/notable-dates.test.ts`** covers R9, plus R2's no-imports check.
- **`app/date/[date]/NotableDates.test.tsx`** renders the components to markup.
  - R2: with the lookup unavailable, there are 20 links and no Previous/Next.
  - R7: Previous/Next render under their new label.
  - R8: "Dates with readings" is gone.
  - R3: the heading is present, and every link's `aria-describedby` points at a tooltip holding R1's text.
  - R4: the phone copy is `mobileOnly`, has no `<details>`, and shows each description inside its link. The strip wrapper is `desktopOnly` when there's no Previous/Next.
  - R5: on 1969-07-20, both copies mark that date and don't link it.
- **`app/date/[date]/notable-dates-page.test.ts`** runs through the real `DatePage`.
  - R2: with `get_adjacent_reading_dates` paused, both copies keep all 20 links, and `get_recent_reading_dates` is never called.
  - R4: the markup contains `</section></div></div><nav …notable-dates-section-heading…>…</nav></main>`, so the list comes right after the reading section closes.
  - R5: 1969-07-20 is marked in both copies.
- **`lib/date-page/navigation.test.ts`:** the Previous/Next assertions are unchanged. Their calls lost the `recent` argument, and the old `isoDate` argument too, since `shapeDateNavigation` no longer uses it. The tests covering only the old list and the recent RPC are removed.

### Manual check (R11 screenshots)

I ran `next dev` against a PostgREST stand-in ([fake45.mjs](sprint-45/fake45.mjs)) and drove headless Chromium over CDP ([cdp45.mjs](sprint-45/cdp45.mjs)). The stand-in had a saved, folded horoscope on 1969-07-20, and Previous/Next were 12 Apr 1961 and 11 Sep 2001.

- **Desktop 1280px, `/date/1969-07-20`** ([desktop-report.json](sprint-45/desktop-report.json)):
  - 20 entries, and 20 July 1969 is marked and not linked. "Recently written" isn't on the page.
  - **Keyboard:** 14 Tabs reach 6 June 1944. Its tooltip is `visible`, and it's the only one open. Chrome's accessibility tree reports `role: link`, `name: "6 June 1944"`, `description: "D-Day: the Allies land in Normandy"`. [desktop-1280-tooltip-keyboard.png](sprint-45/desktop-1280-tooltip-keyboard.png) ← R11's desktop screenshot.
  - **Hover:** hovering 11 March 2020 shows its tooltip; moving the pointer away hides it. Hovering the marked 20 July 1969 shows "Apollo 11 lands on the Moon". [desktop-1280-tooltip-hover.png](sprint-45/desktop-1280-tooltip-hover.png)
- **Phone 390px** ([phone-report.json](sprint-45/phone-report.json)):
  - The strip shows Previous/Next only, and the desktop copy isn't displayed. [phone-390-strip.png](sprint-45/phone-390-strip.png)
  - The bottom section is visible after the reading section and outside it, not inside `<details>`, with 20 rows. The heading is 21px, the same as "What happened" on phones. The shortest row is 63px.
  - **Sticky reveal:** I scrolled to the bottom with the horoscope folded. Points 60px and 200px above the viewport's bottom edge both hit the list, not the reveal bar. [phone-390-notable-section.png](sprint-45/phone-390-notable-section.png) ← R11's phone screenshot.
- **Outage:** I ran the stand-in with `ADJACENT=down` (500). On `/date/2012-11-11` there's no Previous/Next and all 20 links are present ([outage-report.json](sprint-45/outage-report.json)).
- **RPC log** ([stand-in-rpc-log.txt](sprint-45/stand-in-rpc-log.txt)): only `get_reading_by_date` and `get_adjacent_reading_dates` are called. The stand-in would answer `get_recent_reading_dates` with a 404, and it never appears.
- **Colour change during the check:** the first phone shot had descriptions in `--om-grey-dim`, which was hard to read, so I changed them to `--om-grey` and the dates to `--om-bone-dim`. The phone screenshots and report are from after that change. The desktop CSS wasn't touched after its run.

### Known limitations

- **Escape doesn't close the tooltip.** Doing that needs client JavaScript, and the strip is a server component. Moving the pointer or focus away closes it, and the tooltip sits flush under its date, so the pointer can move onto it. R3 doesn't ask for Escape. I'm noting it because WCAG 1.4.13 does.
- **Keyboard can't reach the marked current date's tooltip on desktop.** The current date isn't a link (R5), so it has no tab stop. Its tooltip opens on hover, and its `aria-describedby` points at the description. See question 1.
- **Phone rows put the description inside the link,** so a screen reader reads the date and description as the link's name. That satisfies R3's "announced with the link" for the phone copy too. Desktop uses `aria-describedby` instead.

### Questions for QA1

1. **R5 on desktop.** Is a hover-only tooltip on the marked, unlinked current date enough for "its description still shows"? The alternative is giving that `<span>` a `tabIndex={0}`, which adds a tab stop that isn't a link. I chose not to.

## Round 2

**Status:** ready for QA1's re-audit. This round makes QA1's two required fixes from round 1 and changes nothing else.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (43 test files, 502 tests).

### Fix 1: R8's acceptance grep

Round 1's R8 row was wrong. I ran the grep before writing `notable-dates-page.test.ts`, which then added a match, and I reported the earlier result without re-running it. QA1's exit 0 was the real result at `a8f063f`.

- **Change:** `app/date/[date]/notable-dates-page.test.ts`'s R2 test no longer asserts that one named RPC wasn't called. It now collects every RPC name the fake received and asserts that the set is exactly `{get_reading_by_date, get_adjacent_reading_dates}`. Any other RPC fails the test, not just the retired one. The string isn't disguised anywhere.
- **Result, re-run after the change:** `grep -rn "get_recent_reading_dates\|RecentReadingDate\|Recently written" app lib` matched nothing and exited 1. Run unpiped as `…; echo "grep exit=$?"`, it printed `grep exit=1`.

### Not changed

- **QA1's ruling on question 1:** hover-only for the current date. No `tabIndex` was added.
- **LiveQA's watch item:** horizontal scroll from hidden tooltips at about 1000px wide. I left it for LiveQA, as QA1 noted it outside the verdict. One point that may help LiveQA: the desktop `.card` is a fixed `width: 1320px` (`reading.module.css`, unchanged since before this sprint). Any scroll seen between 901 and 1319px should be checked against the card itself before blaming the tooltips.

## Round 3

**Status:** ready for QA1's live-loop audit. This round fixes LiveQA round 1's one defect and changes nothing else.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (43 test files, 502 tests).

### The defect (LiveQA round 1, CONDITIONAL)

At desktop widths from 901 to about 1278px, the page scrolled sideways. Closed tooltips were hidden with `visibility: hidden`, so they still counted toward the page's scroll width. The tooltip of the last date on a wrapped row reached past the viewport. An open tooltip there was also cut off at the viewport's right edge.

### Correcting my Round 2 note

Round 2 said the desktop `.card` "is a fixed `width: 1320px`", and suggested any scroll between 901 and 1319px might come from the card. That was wrong. I read the base rule and missed that the card shrinks below 1320px; LiveQA measured it at 821px wide at 901. LiveQA's attribution to the tooltips is correct.

### Fix: `app/date/[date]/date.module.css` only, plus a comment in `NotableDates.tsx`

1. **Closed tooltips use `display: none`, not `visibility: hidden`.** A closed tooltip has no box, so it can't widen the page. Hover and focus set `display: block`, using the same selectors as before. `aria-describedby` still reads text from a `display: none` target: the accessible-name rules include hidden nodes when they're referenced. The markup is unchanged, so every existing R3 test still applies as written.
2. **An open tooltip stays inside the card**, using CSS anchor positioning, inside `@supports (position-area: block-end) and (anchor-scope: all)`:
   - Each `.notableItem` is an anchor, scoped to itself with `anchor-scope`, so each tooltip finds its own date.
   - The tooltip opens with `position-area: block-end span-inline-end`, which puts it flush under its date and running rightwards, as before.
   - `position-try-fallbacks: flip-inline` makes a tooltip that would run past the edge open leftwards instead, right-aligned under its date.
   - `main:has(.notableStrip) { position: relative }` makes the card the containing block, on the date page only. My first attempt made the strip itself the containing block. The probe caught that the strip ends only 19px below the last row, so Chrome pushed the 56px tooltip back up over row 2, covering its own date. With the card as containing block there's room below. I checked what else this changes: the only other absolutely positioned elements in the card that had the viewport as their containing block are the chart tabs' visually hidden labels. They have no insets, so they don't move.
   - Browsers without anchor positioning keep the earlier left-anchored placement (`top: 100%; left: 0` against the `<li>`). With fix 1 they still don't scroll sideways while every tooltip is closed. See Known limitations.

### Manual check

I used the same rig as Round 1: `next dev` against [fake45.mjs](sprint-45/fake45.mjs). The new probe is [cdp45-overflow.mjs](sprint-45/cdp45-overflow.mjs), run against `/date/1969-07-20` in Chrome 156 headless. At each of 901, 1000, 1100, 1200, 1279, 1280, 1320 and 1440px, it measures the page's scroll width with every tooltip closed. It then hovers each of the 20 dates in turn. Results are in [round3-overflow-report.json](sprint-45/round3-overflow-report.json).

- **No sideways scroll at any width,** with every tooltip closed or with any one open. The scroll width equals the viewport width each time, including 901, where LiveQA measured 969.
- **Every one of the 20 hovers, at every width:**
  - exactly one tooltip is open;
  - it sits flush under its own date (its top equals the date's bottom);
  - it lies inside the card and inside the viewport.
- **Only the last date on a wrapped row flips.** At 901 and 1000 that's 6 June 1944, 12 April 1961 and 11 February 1990, the dates LiveQA saw overflow. At 1440 nothing flips.
- **Screenshots:**
  - [round3-901-hover-rightmost.png](sprint-45/round3-901-hover-rightmost.png): 11 February 1990's tooltip at 901 opens leftwards under the date and ends inside the card.
  - [round3-1200-hover-rightmost.png](sprint-45/round3-1200-hover-rightmost.png): the same check at 1200.
  - [round3-1000-keyboard.png](sprint-45/round3-1000-keyboard.png): at 1000, keyboard focus on 11 February 1990 opens its tooltip under the date. The page scroll width stays 1000.
- **Accessibility tree, with every tooltip closed (`display: none`):** Chrome reports 19 links with descriptions, for example name "15 April 1912", description "The Titanic sinks in the North Atlantic". There are 20 dates, and the 20th, 20 July 1969, is the page's own date, a `<span>`, not a link. So closing tooltips with `display: none` didn't cost any link its description.
- **Phone 390px:** I re-ran Round 1's phone probe ([cdp45.mjs](sprint-45/cdp45.mjs) `phone`). Its output, [round3-phone-report.json](sprint-45/round3-phone-report.json), is identical, field for field, to Round 1's [phone-report.json](sprint-45/phone-report.json). The new card rule changes nothing on phones.

### Tests

No new unit test. The change is CSS only, and the Vitest suite renders markup without layout, so it can't measure scroll width or tooltip position. The probe above is the evidence. The markup is unchanged, and the existing R3/R5 tests pass against it unmodified.

### Known limitations

- **Without anchor positioning,** an *open* tooltip on the last date of a wrapped row can still reach past the card's edge while it's open, as before. Closed tooltips no longer widen the page in any browser. Anchor positioning is in current Chrome, Edge and Safari; I've only measured Chrome. LiveQA may want to check Firefox, where I haven't confirmed support.
- Escape still doesn't close the tooltip (unchanged from Round 1).

### Not changed

Everything else from Rounds 1 and 2, including QA1's ruling on the current date's hover-only tooltip.
