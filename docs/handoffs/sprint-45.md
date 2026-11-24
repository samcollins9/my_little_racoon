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
