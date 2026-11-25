---
id: 50
title: "Notable dates move to the page footer on desktop"
epic: "Date pages (PRD v3)"
status: in_progress
created: 2026-11-25T15:46:51+00:00
---

# Master Controller Sprint Definition — Sprint 50

**Epic:** Date pages (PRD v3)
**Sprint Objective:** On desktop, "Other notable dates" moves from the strip under the date picker to the bottom of the page, the same place it sits on phones. It keeps its current desktop look: dates only, with hover and focus tooltips.

### Context

Sprint 45 put the desktop copy of "Other notable dates" (`NotableDatesStrip`) in the strip below the date band, between the picker/navigation and the chart panel. The phone copy (`NotableDatesSection`) sits at the bottom of the page, after the reading. On 25 Nov 2026 the user asked for desktop to match phones in placement, so the strip holds only navigation. Asked whether the desktop list should also take the phone look, with visible descriptions, the user chose to **keep the desktop tooltips**. Only the position changes.

Sprint 45 had a LiveQA defect from these tooltips: hidden tooltips widened the page at 901–1278px. The fix uses `display: none` while closed, CSS anchor positioning scoped to the card (`main:has(.notableStrip)`), and an inline flip fallback. Moving the list to the bottom of the card raises a new edge to cover: tooltips opening downward from the card's last rows.

### Requirements

1. **Desktop placement (>900px).** The desktop list renders after the page body (both columns), spanning the card's width, as the page's last section inside the card. It's no longer in the strip below the date band. The strip keeps the picker, Sprint 47's random link and Previous day / Next day.
2. **The look doesn't change at all; it only moves.** The user said on 25 Nov 2026: "do not change how the desktop Other Notable Dates panel appears - it should just move to the bottom of the page's content in its current form."
   - The heading text and style, the links, the list wrapping and the current-date marking (Sprint 45's R5) all stay exactly as they are. So do the tooltips' look and their behaviour on hover **and** keyboard focus, and they stay each link's accessible description.
   - There's no new visual treatment: no new border, background, heading style, font size or spacing scale.
   - The panel keeps the spacing it has today inside the strip, the same side gutter and the same vertical padding, so it reads the same at the bottom as it did at the top. The one exception is a separating rule where the card's existing section rules already put one. Say in the handoff exactly which spacing or rule properties were carried over, and from where.
   - The tooltip positioning changes R4 requires are behaviour, not appearance, and are allowed.
3. **Phones are unchanged.** `NotableDatesSection`, and the bottom order from Sprints 47 and 48, stay as they are.
4. **Tooltips stay on screen at the bottom.** In the new position, an open tooltip on any of the 20 dates lies inside the card and inside the viewport, with the page scrolled to the bottom. Where opening below would cross the card's bottom edge, it opens upward. No closed tooltip widens or lengthens the page. At 901, 1000, 1100, 1200, 1279, 1280 and 1440px wide, `document.documentElement.scrollWidth` equals the viewport width, with tooltips closed and while hovering each row's last date. Without anchor positioning (the fallback path), an open tooltip may overflow the card while hovered, which is Sprint 45's accepted limitation, but closed tooltips must never change the page size.
5. **No stale strip styling.** Rules that existed only for the strip position, such as `.adjacent + .notableStrip` spacing, are removed or moved, and the anchor-scope selector follows the new position. QA1 shouldn't find any CSS targeting a layout that no longer exists.
6. **Single tab order.** After the move, keyboard focus reaches the notable dates last on desktop, after the reading's controls and the events.
7. **Tests.** Render tests confirm that at desktop the list is after the body and not inside the strip, that the strip still contains the picker and the day links, and that tooltips are still each link's `aria-describedby`. Update Sprint 45's existing tests that asserted the strip position, and list them in the handoff.
8. **Handoff.** Follow CLAUDE.md's committed-handoff standard: `docs/handoffs/sprint-50.md`, with `npm run verify`'s final line including `exit=0`. Include the R4 measurements as a table: width, closed `scrollWidth`, and maximum `scrollWidth` while open. Include two screenshots under `docs/handoffs/sprint-50/`: desktop at 1280px scrolled to the bottom with a last-row tooltip open, and the top of the page showing the strip without the list.

### Acceptance Criteria

- **R1, R3 and R7:** the render tests pass. QA1 confirms from the code that the desktop copy is rendered after the body and not in `belowDateBand`, and that the phone copy is untouched.
- **R2:** QA1 confirms the heading, link and tooltip styles are reused, not re-created, and that the diff adds no new visual properties beyond the carried-over spacing the handoff lists. LiveQA compares the panel's look before and after the move.
- **R4:** the handoff's measurement table shows `scrollWidth` equals the viewport width at every listed width. The screenshot shows a last-row tooltip inside the card.
- **R5:** QA1 finds no selector for the old strip position left in `date.module.css`.
- **R8:** QA1 reads `docs/handoffs/sprint-50.md` at the audited commit, finds `VERIFY PASS … exit=0`, and opens both screenshots.

**LiveQA (the deployed app):**
1. Before the release, capture the current desktop panel at 1280px on `/date/1969-07-20` as a reference. After the release, at 1280px on `/date/1969-07-20`: the strip under the date band holds the picker, the random link and the day links, with no notable dates. Scroll to the bottom. "Other notable dates" is the last section in the card, with 20 dates and 20 July 1969 marked, and it looks the same as the reference: heading, links, wrapping, spacing and tooltips.
2. Hover and keyboard-focus a date on the first row, a date in the middle, and the last date on the bottom row. Each tooltip shows fully inside the card and the viewport.
3. Measure `scrollWidth` at 901, 1000, 1100, 1200, 1279, 1280 and 1440px, with tooltips closed and while hovering each row's last date. It equals the viewport width at all of them.
4. If you can, repeat step 2 in Firefox, and record whether anchor positioning or the fallback ran.
5. At 390px the phone layout is unchanged.

### Out of Scope

- **Phone layout changes.**
- **Visible descriptions on desktop.** The user chose tooltips.
- **Changing the list's content or order** (Sprint 45's R1).

### Dependencies

- **Blocks:** nothing.
- **Blocked by:** Sprint 47 has to close first. It's in `dev_build` and edits `app/date/[date]/page.tsx`, the strip, `NotableDates.tsx` and `date.module.css`. Sprints 48 and 49 also touch `page.tsx` and `ReadingView`. Run this one in sequence with them, not alongside.
- **External:** none.

### Human Prerequisites

None.

### Team Assignments

- **Dev Team 1:** all of it, in sequence after Sprint 47, and not at the same time as 48 or 49.
- **Dev Team 2:** not assigned. Every candidate file is shared with the queued sprints.

### Risks & Mitigations

- **Bottom-row tooltips open below the card or off-screen.** — R4 requires them to flip upward, and LiveQA's step 2 checks the last row.
- **Sprint 45's horizontal-scroll defect comes back.** The anchor scope and containing block change with the move. — R4 repeats Sprint 45's width measurements.
- **Leftover strip CSS.** — R5.
