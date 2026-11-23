---
id: 34
title: "Star chart tooltips"
epic: "Date pages"
status: todo
created: 2026-11-23T00:36:58+00:00
---

# Master Controller Sprint Definition — Sprint 34

**Epic:** Date pages. The app is addressed by date, and each page shows the chart for
that date (Sprints 28–33).

**Sprint Objective:** On desktop, hovering over a planet or a zodiac sector in the
star chart shows a native tooltip naming what it is.

### Context

The constellation chart shows planet glyphs and the twelve sector glyphs, with no
way to tell what each one means unless you already know the symbols. The user chose,
on 23 Nov 2026: tooltips for **planets** and **zodiac sectors** (not aspect lines or
the moon phase), in the **browser's native** style, using SVG `<title>`. That means
no JavaScript, it's accessible, and it's the smallest change. Desktop is required;
the phone chart is optional.

The data is already there. `computeBodies` gives each body's `sign` and
`retrograde`, the stored positions carry `degreeInSign`, and
`lib/ephemeris/balance.ts` gives each sign's element and modality.

**Prior record checked (planning rule 11).** Sprint 20 split the chart into
`desktopOnly` and `mobileOnly` SVGs. No finding records a measurement this sprint
relies on.

### Requirements

1. **Planet tooltips (desktop chart).** Each planet's rendered group carries a
   `<title>` reading `<Planet> in <Sign> <D>°<MM>′`, with `, retrograde` added when
   `retrograde` is true. For example: "Mars in Aries 12°34′, retrograde".
   - Degrees and minutes come from the stored `degreeInSign`, floored to whole
     minutes. Rounding must never produce `60′` or `30°`.
   - Sun and Moon never show "retrograde".
   - Hovering anywhere on the glyph, the dot or its label shows the tooltip.
2. **Sector tooltips (desktop chart).** Each zodiac sector glyph carries a `<title>`
   reading `<Sign>: <Element>, <Modality>`, for example "Aries: Fire, Cardinal".
   Element and modality come from `lib/ephemeris/balance.ts`, not a new table.
   - The hover target is at least the sector glyph.
   - Dev Team may widen it, for example to a transparent wedge, only if planet
     tooltips stay hoverable on top of it.
3. **Text from one tested helper.** The tooltip strings come from pure functions (in
   `constellation.ts` or a sibling), not inline string building scattered through the
   JSX. The phone chart may use the same helpers; that's optional.
4. **No visual or behavioural change otherwise.** No JavaScript or client component is
   added. The chart's geometry, colours and layout are unchanged, and so are the
   reveal panel, the navigation and the events. It applies to both routes, through
   the shared view.
5. **Tests.** Unit tests for the helpers:
   - each planet and sign name is spelled as the app spells it elsewhere;
   - the retrograde suffix appears only when retrograde is true;
   - a degree value of 0, 12.5667 (12°34′), 29.9999 (29°59′, not 30°00′) and 29.999
     all format correctly;
   - all 12 signs have the right element and modality.

### Acceptance Criteria

**QA1 (static):**
- **R1, R2:** read the desktop SVG markup.
  - Each planet group and each sector glyph has a `<title>` as its first child,
    which is how SVG tooltips attach.
  - The text comes from the R3 helpers.
  - The minute calculation floors and can't produce 60.
  - If the sector hover target was widened, check its paint order: it's drawn
    beneath the planets.
- **R4:**
  - No `"use client"` is added.
  - The diff is limited to the chart markup, the helpers and their tests.
  - There's no CSS change beyond what a widened hover target needs.
- **R5:** the tests exist, with the listed cases. `npm test`, typecheck, lint and
  build are green.

**LiveQA (against the deployed app, after Pipeman pushes; a desktop browser):**
1. On a date page, hover over each planet. The tooltip shows the name, sign and
   degree.
   - Pick a date whose positions table marks at least one planet retrograde
     (unverified which dates do; find one by looking), and confirm the suffix
     appears.
   - Cross-check one planet's degree against the positions table on the same page.
2. Hover over each of the 12 sector glyphs. Each shows the right sign, element and
   modality.
3. Planet tooltips still appear where a planet sits over a sector, if the hover
   target was widened.
4. The chart looks identical to before at desktop width. The phone layout is
   unchanged, or has the same tooltips if Dev Team added them.
5. An old `/reading/[id]` link shows the same tooltips.

### Out of Scope
- **Aspect-line and moon-phase tooltips.** The user didn't choose them.
- **Styled or custom tooltips,** and touch or tap tooltips on phones. The user chose
  native tooltips, and desktop only is required.
- **Any change to what the chart computes.**

### Dependencies
- Blocks: none.
- Blocked by: Sprint 33, which also edits the shared `ReadingView.tsx`, must be
  merged first. Run it after Sprint 33, not in parallel.
- External: none.

### Human Prerequisites
- None.

### Team Assignments
- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** not assigned.

### Risks & Mitigations
- **A widened sector target swallows planet hovers.** R2 and QA1's paint-order check
  cover it, and LiveQA step 3 checks it live.
- **Degree rounding shows 30°00′.** R1's flooring, and the R5 29.9999 case.
- **The tooltip contradicts the positions table.** Both read the same stored
  `degreeInSign`. LiveQA step 1 cross-checks one planet.
