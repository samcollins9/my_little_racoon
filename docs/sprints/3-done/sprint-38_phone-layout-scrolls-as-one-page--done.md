---
id: 38
title: "Phone layout scrolls as one page"
epic: "Date pages"
status: done
created: 2026-11-23T15:34:52+00:00
---

# Master Controller Sprint Definition — Sprint 38

**Epic:** Date pages. The app is addressed by date. Each page shows a tabbed chart
panel (Sprint 37), "What happened", and the horoscope behind a reveal step.

**Sprint Objective:** On phones (≤900px), the whole reading page scrolls as one
document. The date band, the tabbed chart panel, "What happened" and "The reading"
all move with a single page scroll, instead of a pinned top region over a small
scrolling area.

### Context

Since Sprint 20, the phone layout has been a fixed full-viewport card. This follows
`docs/design/HANDOFF_reading_responsive.md` frames 3–4.
- `.card` is `height: 100vh`, and `.body` is `overflow: hidden`.
- The date band and `.leftColumn` are `flex-shrink: 0`, so they're pinned.
- Only `.rightColumn` scrolls (`overflow-y: auto`), with a 64px fade mask
  (`reading.module.css`, around lines 519–595).

That was tolerable while the chart was a single 300px figure. Sprint 37 added a
44px-plus tab strip, and gave each key panel on phones a fixed `height: 300px` with
its own `overflow-y: auto` (`chartTabs.module.css`, around lines 234–262). The
no-JavaScript fallback is capped at `max-height: 50vh`. The pinned region grew, and
"What happened" and "The reading" were squeezed into a small strip at the bottom of
the screen.

The user reported this on 23 Nov 2026 and asked for the tabbed panel to be part of
the scroll. This deliberately **reverses the handoff's "fixed card, one scrolling
column" phone layout**. Desktop is untouched.

**Prior record checked (planning rule 11).**
- Sprint 20's file (R6 is the mask, R9 is the fixed column).
- The design handoff (frame 4, and its note that the mask "only makes sense where
  the footer is fixed").
- Sprint 33's sticky folded reveal summary.
- Sprint 37's phone CSS.
- No measurement is relied on.

### Requirements

1. **One page scroll on phones.**
   - At ≤900px, the page's own document scroll carries everything: the date band,
     the chart tabs, the date navigation where present, "What happened", "The
     reading", and the footer.
   - No ancestor of those sections creates a fixed-height, `overflow: hidden` or
     `overflow: auto` region on the page's main axis. That means removing:
     - `height: 100vh` from `.card` (a `min-height` is fine);
     - `overflow: hidden` from `.body`;
     - the `overflow-y: auto` from `.rightColumn`.
2. **No nested vertical scroll areas in the chart panel on phones.**
   - With JavaScript, the Planets, Signs and Aspects panels take their natural
     height, with no fixed `height: 300px` and no inner `overflow-y`. The Chart tab
     shows its figure as before.
   - Without JavaScript, the stacked sections take their natural height, with no
     `max-height: 50vh` cap.
   - Switching tabs may change the page length. That's expected.
   - Sideways clipping that already prevents horizontal scroll, such as
     `overflow-x: hidden` on the 390px chart, may stay.
3. **The fade mask goes on phones.** Remove the `mask-image` on `.rightColumn` at
   ≤900px. It existed only because that column scrolled under a fixed footer
   (handoff note), and with a page scroll it would fade text at the end of the
   column for no reason.
4. **The reading footer still works.**
   - The sticky footer and Sprint 33's sticky folded **Reveal the horoscope** summary
     keep `position: sticky; bottom: 0`. They now stick to the viewport while "The
     reading" section is on screen, and they sit in place at the end of the section
     otherwise.
   - The control stays reachable at the end of the page, keeps its 44px touch target,
     and never covers text it can't be scrolled off.
5. **No horizontal page scroll** at about 390px, on any tab or in the stacked
   fallback, same as Sprint 37's R6.
6. **Desktop is unchanged** (>900px). Everything this sprint changes sits inside the
   phone `@media (max-width: 900px)` blocks.
7. **CSS only.** Changes are limited to `reading.module.css` and
   `chartTabs.module.css`, plus `date.module.css` if the date navigation also sits
   in a fixed region. No TSX, logic, markup or test-behaviour changes. If a comment
   in those files describes the old fixed layout ("fixed 300px-high figure above a
   scrolling reading column", the Sprint 24 `flex-shrink` note and so on), update it
   so it doesn't describe a layout that no longer exists.
8. **Evidence** follows the CLAUDE.md project standard: `npm run verify`'s result line
   with `exit=0`. There's no unit test for layout. Dev Team includes before and after
   screenshots at 390×844 in the handoff: the Chart tab, the Planets tab, and
   scrolled to "The reading".

### Acceptance Criteria

**QA1 (static):**
- **R1–R3:** read the phone `@media` blocks. Confirm that:
  - `.card` has no fixed height;
  - `.body` and `.rightColumn` have no main-axis `overflow`;
  - the key panels and `.stacked` have no fixed height, max-height or `overflow-y`;
  - the `.rightColumn` mask is gone.

  `grep` both files for `100vh`, `overflow-y: auto`, `max-height` and
  `mask-image`, and account for each remaining hit.
- **R4:** the sticky rules for `.readingFooter` and `.reveal:not([open]) >
  .revealSummary` are intact. No ancestor between them and the page now has an
  overflow value that would stop sticky working.
- **R6, R7:** every change sits inside `max-width: 900px` blocks. The diff touches
  only the allowed CSS files, and no `.tsx` or `.ts` file.
- **R8:** the handoff carries `VERIFY PASS … exit=0` and the screenshots.

**LiveQA (against the deployed app, after Pipeman pushes; a phone or a 390×844
viewport, and a real phone if one is available):**
1. Load a date page with a saved horoscope. A single swipe or scroll moves the date
   band and chart off the top, and "What happened" and "The reading" fill the screen.
   No region stays pinned except the sticky reveal or footer bar.
2. Open the Planets, Signs and Aspects tabs. Each table shows at full length in the
   page scroll, with no inner scroll box. Record the page height change between Chart
   and Signs.
3. Scroll to "The reading" and reveal the horoscope. The folded **Reveal the
   horoscope** bar sticks to the bottom while the section is on screen. After
   revealing, the full text is readable to its end, with no fade cutting it off.
4. No horizontal page scroll on any tab.
5. JavaScript disabled: the stacked sections all show in the page scroll, uncapped.
6. Desktop (≥1200px) looks and behaves exactly as before, including the right column.
7. An old `/reading/[id]` link behaves as in steps 1–3.
8. **A real phone.** If a real iOS or Android device is available, repeat step 1 on it,
   since the `100vh` and sticky behaviour differs on mobile browsers. If none can be
   obtained, record what was tried; don't record it as done.

### Out of Scope
- **Any desktop layout change.**
- **Redesigning the tabs or tables** (Sprint 37), or changing their content.
- **Remembering the scroll position or tab** across loads.
- **Replacing the sticky footer** with a different pattern.

### Dependencies
- Blocks: none.
- Blocked by: Sprint 37 must be **closed** first. It's at `complete_ready`, and only
  your go-ahead remains. This sprint edits the CSS Sprint 37 shipped.
- External: none.

### Human Prerequisites
- None. LiveQA step 8 prefers a real phone. If the user has one to hand, mentioning it
  to LiveQA helps, but LiveQA attempts to obtain one itself first.

### Team Assignments
- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** not assigned.

### Risks & Mitigations
- **Sticky footer stops sticking,** because some ancestor keeps an `overflow` value.
  QA1's R4 ancestor check and LiveQA step 3.
- **`100vh` quirks on mobile browsers** (the address bar resizing the viewport).
  Removing the fixed height removes the main source of them, and LiveQA step 8 checks
  on a real device.
- **Desktop regressions,** if a rule leaks outside the media query. R6, QA1, and LiveQA
  step 6.
- **Long tables make the page long on phones.** That's accepted: the user asked for
  everything in one scroll. A collapsed table design would be a separate sprint.
