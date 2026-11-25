# Sprint 50 handoff — Notable dates move to the page footer on desktop

## Round 1

**Status:** ready for QA1's gate-1 audit.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (53 test files, 600 tests).

**Sprint file:** I re-read it at this commit. It's unchanged since `/sprint-start` (`791c297`): `git log 791c297..HEAD` on the file is empty.

### What changed

| Req | Where | How |
|---|---|---|
| R1 | `app/date/[date]/page.tsx`, `DateNavigation.tsx`, `NotableDates.tsx` | `DateNavigation` no longer renders the desktop list and no longer takes `isoDate`. The page's `afterBody` (rendered by `ReadingView` after the body, both columns) now ends with `<NotableDatesPanel isoDate={isoDate} />`, after the phone copies. Being `desktopOnly`, it's the card's last *shown* section on desktop. The strip (`belowDateBand`) keeps the picker, Sprint 47's random link and Previous day / Next day. |
| R1, naming | the same files | The desktop component, class and heading id are renamed: `NotableDatesStrip` → `NotableDatesPanel`, `.notableStrip` → `.notablePanel`, `notable-dates-strip-heading` → `notable-dates-panel-heading`. "Strip" named the place it no longer lives (R5). The JSX inside, the heading, list, items, links, current-date span and tooltip spans, is unchanged. |
| R2 | `date.module.css` | **No style rule for the heading, list, links, current date or tooltips changed.** `.navTitle`, `.notableList`, `.notableItem`, `.notableLink`, `.notableCurrent` and `.notableTooltip`'s look are untouched. The only new declarations are on `.notablePanel`, carried over from where the panel sat (see the next section). |
| R3 | — | `NotableDatesSection` and the phone bottom order are untouched. |
| R4 | `date.module.css` | The anchor-positioned tooltip's `position-try-fallbacks` grows from `flip-inline` to `flip-inline, flip-block, flip-block flip-inline`. A tooltip that would cross the card's bottom edge opens upward, flush above its date, and also leftward if needed. The containing block is still the card (`main:has(.notablePanel) { position: relative }`, formerly `:has(.notableStrip)`). Closed tooltips are still `display: none`. The fallback path (no anchor positioning) is unchanged: Sprint 45's accepted limitation. |
| R5 | `date.module.css` | `.adjacent + .notableStrip { margin-top: 12px }` is removed, and the `:has()` selector follows the class. The `.dateNav` comment no longer describes the list as being in the strip. In `date.module.css`, `grep -nE "notableStrip|adjacent \+"` now matches only line 190, inside the `.notablePanel` comment that records where the carried-over 12px came from. That's a comment, not a selector. |
| R6 | — (follows from R1) | The panel is last in the DOM, so it's last in Tab order. |

### R2: the spacing and rule carried over, and from where

`.notablePanel { min-width: 0; padding: 12px 40px 14px; border-top: 1px solid var(--om-rule); }`

- `min-width: 0` was already on `.notableStrip`.
- **40px left and right** come from `.flowSlot`'s `padding: 14px 40px`, the strip's container, which gave the panel its side gutter.
- **12px top** comes from `.adjacent + .notableStrip { margin-top: 12px }`, which sat between the day links and the heading. It's also `.dateNav`'s own `padding-top: 12px` from its rule to its content, so heading-under-rule spacing reads as it did at the strip's top.
- **14px bottom** comes from `.flowSlot`'s bottom padding, below the list.
- **The rule** is `.dateNav`'s `border-top: 1px solid var(--om-rule)`. It's placed where the card already separates sections: between the body and what follows it.

### R2: does it look the same? (measured, before and after)

[cdp50.mjs](sprint-50/cdp50.mjs) records a computed-style fingerprint of the panel at 1280px on `/date/1969-07-20`:
- heading: text, font, size, weight, case, letter spacing, colour, margins;
- list: display, wrap, gaps, font, margins and padding;
- link: font, colour, underline colour and offset;
- current date: colour and font;
- a closed tooltip, and an open one (opened by keyboard focus): display, max width, padding, border, background, colour, font;
- layout: gutters, list width, heading-to-list gap, row count.

I ran it on a production build of the commit before this sprint ([before-report.json](sprint-50/before-report.json)) and on this one ([after-report.json](sprint-50/after-report.json)).
- **The fingerprints are identical, field for field.** That includes the layout: 41px from the card's edge to the heading on both sides (40px gutter plus the card's 1px border), a list width of 1054px, a 6px heading-to-list gap, and 3 rows at 1280.
- **Element screenshots** of the panel: [before-panel-1280.png](sprint-50/before-panel-1280.png) and [after-panel-1280.png](sprint-50/after-panel-1280.png). The "after" shot is larger because the panel's own box now carries the padding and rule its containers used to. Cropped to the old content box, at offset (40, 13), the background and underline pixels match exactly. About 10,400 of 75,900 pixels differ, all on glyph edges in the text rows, by up to 49 of 255 levels.
- **What that difference is:** I tested it on the "after" build alone. Shifting the same panel 0.4px horizontally, with `position: relative; left: 0.4px`, reproduces the same pattern (11,179 pixels on glyph edges in about 40 text rows, background unchanged). A 0.4px vertical shift changes nothing, and the same shot taken twice is identical. So the difference is consistent with text sitting at a slightly different horizontal sub-pixel position, not with a change in look. I didn't measure the old panel's exact sub-pixel position, so that link is an inference. **LiveQA's step 1 (a visual before/after comparison)** is the check that settles R2.

### R4: tooltip measurements (`/date/1969-07-20`, scrolled to the bottom, hovering each of the 20 dates in turn)

| Width | Closed scrollWidth | Max scrollWidth while open | Closed / max-open scrollHeight | Rows | Every open tooltip inside card and viewport | Last row opens |
|---|---|---|---|---|---|---|
| 901 | 901 | 901 | 1462 / 1462 | 4 | yes (all 20) | above |
| 1000 | 1000 | 1000 | 1462 / 1462 | 4 | yes (all 20) | above |
| 1100 | 1100 | 1100 | 1443 / 1443 | 3 | yes (all 20) | above |
| 1200 | 1200 | 1200 | 1443 / 1443 | 3 | yes (all 20) | above |
| 1279 | 1279 | 1279 | 1443 / 1443 | 3 | yes (all 20) | above |
| 1280 | 1280 | 1280 | 1443 / 1443 | 3 | yes (all 20) | above |
| 1440 | 1440 | 1440 | 1443 / 1443 | 3 | yes (all 20) | above |

Every open tooltip sits flush against its date, above or below, never detached. Exactly one is open at a time. At 901 and 1000 the first row's tooltips still open below. At three rows, some first-row tooltips also flip up, because the panel is short and opening below would cross the card's edge. They then sit over the body's last few pixels, still inside the card. Chrome 156 headless.

**Screenshots (R8):**
- [after-1280-bottom-last-row-tooltip.png](sprint-50/after-1280-bottom-last-row-tooltip.png): scrolled to the bottom, with the last date (11 March 2020) hovered. Its tooltip, "The WHO declares COVID-19 a pandemic", opens upward inside the card.
- [after-1280-top-strip.png](sprint-50/after-1280-top-strip.png): the strip holds the picker, Go, "or", Discover random reading, and Previous day / Next day, with no notable dates.

**Placement and Tab order (after):**
- The panel isn't in the strip. It comes after the body, is the card's last shown section, has a 1px rule above it, 20 dates, and 20 July 1969 marked. Every link's `aria-describedby` points at a `role="tooltip"`.
- The strip still has the picker, the random link and both day links.
- Tab order from a fresh load: banner, strip, chart, reading, notable dates. The matched date's events have no links, so there's no events stop.

**R3, phones:** I re-ran Sprint 48's probe on this build ([phone-unchanged-report.json](sprint-50/phone-unchanged-report.json)). For both the matched and the other-years page at 390px, the visual order, the gaps, the rules, the scroll width and the events' foot are **identical** to Sprint 48's round 2 report.

### Tests (R7)

**Updated, Sprint 45 and 47 tests that asserted the strip position:**
- `app/date/[date]/NotableDates.test.tsx`: the "strip" describe is now "the desktop panel". It renders `NotableDatesPanel` directly. It asserts `nav.notablePanel.desktopOnly`, labelled by `notable-dates-panel-heading`, with the heading markup unchanged, all 20 links, R1's tooltip text as each link's `aria-describedby`, the R5 marking, and nothing folded. The test asserting day links came first inside the strip is removed: the list isn't in the strip any more. The R4 test about the strip wrapper being `dateNav` is now covered by the page test below.
- `app/date/[date]/notable-dates-page.test.ts`:
  - R2 and R5 now read `notable-dates-panel-heading`.
  - "the day links are in the strip beside the desktop list" becomes **"the strip holds the picker and the day links, and no notable dates"**.
  - "the phone copy closes the card" becomes **"the desktop panel is after the body, the card's last child, after the phone copy"**. It asserts that the markup is `</section></div></div>${phone copy}${desktop panel}</main>`.
- `app/date/[date]/DateNavigation.test.tsx`: `DateNavigation` no longer takes `isoDate`, and a comment changed.

No test asserts CSS layout, because Vitest renders markup without layout. The browser measurements above are the evidence for R2 and R4.

### Known limitations

- **Without anchor positioning** (any browser lacking `position-area`/`anchor-scope`), an open last-row tooltip opens downward and may cross the card's bottom edge while it's hovered. That's Sprint 45's accepted fallback, which R4 allows. Closed tooltips are still `display: none` on every path. LiveQA's step 4 asks for a Firefox check; I haven't run one.
- **The R2 pixel comparison** is explained by measurement but not proven against the old build (see above).
- **Lint:** the same 3 warnings in my Sprint 45/46 probe scripts, still waiting on Master Controller. This sprint adds none.

### Questions for QA1

None.
