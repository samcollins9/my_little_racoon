---
id: 37
title: "Chart panel tabs: planets, signs and aspects key"
epic: "Date pages"
status: in_progress
created: 2026-11-23T14:59:24+00:00
---

# Master Controller Sprint Definition — Sprint 37

**Epic:** Date pages. The app is addressed by date. Each page shows the chart, "What
happened", and a horoscope behind a reveal step (Sprints 28–36).

**Sprint Objective:** The chart area becomes a tabbed panel: **Chart** (the default,
unchanged), **Planets**, **Signs** and **Aspects**. The three new tabs present the
chart's data as tables that double as a key to every symbol and line style the chart
uses, on phones as well as desktop.

### Context

Sprint 34 added hover tooltips to the desktop chart, but that left two problems:
1. **Phones get nothing.** The phone chart (Sprint 20's `mobileOnly` SVG) is cropped
   and has no sign sectors and no planet labels, and phones have no hover. A phone
   visitor sees bare glyphs.
2. **There's no key anywhere.** Even on desktop, reading the chart means hovering
   over each symbol. The aspect lines are coded by colour and dash
   (`ASPECT_COLOR`/`ASPECT_DASH` in `constellation.ts`), and nothing on the page
   explains them, not even a tooltip.

The user chose, on 23 Nov 2026:
- tabs for **Planets, Signs and Aspects** next to the default Chart tab;
- **instant, accessible tabs** that fall back to showing every section stacked when
  JavaScript is off;
- the **Elements/Modalities balance panel stays where it is**, below the tabs;
- a **raw-data view is deferred** to a later sprint.

**The tables are a key first and a data table second.** Where space is short, the
symbol and its name win over coordinates (R6).

**Prior record checked (planning rule 11).**
- Sprint 20 created the desktop/phone chart split.
- Sprint 34 added the `planetTooltip`/`sectorTooltip` helpers and the body `label`
  (`12°34′ ♈ ℞`).
- `lib/ephemeris/aspects.ts` holds the aspect angles and maximum orbs.
- No finding records a measurement this sprint relies on.

### Requirements

1. **Tabbed panel replacing the chart area** in the shared reading view, so it
   applies to both `/date/…` and `/reading/[id]`.
   - The tabs are **Chart**, **Planets**, **Signs** and **Aspects**, in that order.
   - **Chart** is selected on every page load. Its content is today's desktop and
     phone charts, unchanged, Sprint 34 tooltips included.
   - The balance panel stays below the tabbed panel, outside it, visible whichever
     tab is selected.
2. **Accessible tabs that work without JavaScript.**
   - With JavaScript, it follows the WAI-ARIA tabs pattern:
     - `role="tablist"`/`tab`/`tabpanel`, with `aria-selected` and
       `aria-controls`/`aria-labelledby`;
     - Left/Right arrows move between tabs, and Home/End go to the first and last;
     - only the selected panel is visible;
     - switching is instant, with no request and no URL change.
   - Without JavaScript, all four sections render **one under another**, each with a
     visible heading, and no section is hidden. The server-rendered HTML must
     contain all four sections' content.
   - Only the tab-switching component is a client component. The tables and the
     chart stay server-rendered and are passed in as children or props.
3. **Planets tab.** A real `<table>` with a header row, one row per body, in the
   chart's existing body order (Sun → Pluto). Columns:
   - **Planet:** glyph and name, for example "♂ Mars", taken from `PLANET_GLYPHS`.
   - **Sign:** glyph and name, for example "♈ Aries", from `SIGN_GLYPHS`.
   - **Position:** degrees and minutes in the sign (`12°34′`), formatted by the
     **same helper** as the chart label and tooltip, so all three can never disagree.
   - **℞:** shown when the planet is retrograde. Below the table, a one-line key
     reads "℞ = retrograde (apparent backward motion)". Dev Team may adjust the
     wording.
4. **Signs tab.** A `<table>` with 12 rows in zodiac order (Aries → Pisces). Columns:
   - **Sign:** glyph and name.
   - **Element** and **Modality:** from `lib/ephemeris/balance.ts`, the same source
     as the sector tooltip.
   - **Planets:** the glyph and name of each body in that sign. It's empty for an
     unoccupied sign.

   Occupied rows are visually marked in a way that echoes the chart's highlighting
   of occupied sectors, and a one-line note under the table explains it: "highlighted
   signs hold at least one planet". The marking must not rely on colour alone, for
   example by adding a text indicator or a weight change.
5. **Aspects tab.** Two parts:
   - **(a) Line key.** One row for each of the five aspect types (conjunction,
     opposition, trine, square, sextile). Each row has:
     - a small inline SVG line swatch drawn with **the same** `ASPECT_COLOR` and
       `ASPECT_DASH` values the chart uses, imported and not copied;
     - the aspect's name;
     - its angle (0°, 180°, 120°, 90°, 60°), from `lib/ephemeris/aspects.ts`.

     A one-line note explains that thicker lines mean tighter aspects, if that's
     what the chart's width encoding means. Dev Team confirms this from
     `computeThreads` and words it accordingly, or omits it.
   - **(b) This chart's aspects.** A `<table>` of `chart.aspects`, the same list the
     chart draws threads for. Columns:
     - Planet A (glyph and name);
     - Aspect (name, with its swatch);
     - Planet B (glyph and name);
     - Orb, to one decimal place with a degree sign.

     Sort by tightest orb first. If the chart has no aspects, show a plain
     "No aspects in this chart" line, not an empty table.
6. **Phone first, key first.**
   - At about 390px every tab lays out with **no horizontal page scroll**.
   - If a table doesn't fit, it degrades in this priority order, and coordinates go
     first:
     1. the symbol and name columns are always shown;
     2. Sign, Element, Modality, Aspect and Planets columns come next;
     3. Position and Orb are the first to wrap or move under the name.

     A table scrolling horizontally inside its own container is acceptable only as
     a last resort, and only if the symbol-and-name column stays visible.
   - The tab strip itself must fit at 390px without hiding a tab.
7. **One data source.** Every name, glyph, sign, element, modality, position and orb in
   the tabs comes from the existing helpers and the stored positions
   (`composeChart`), never from new parallel tables or re-computation. Where a
   formatting helper is currently private to `constellation.ts`, export it rather
   than duplicate it.
8. **Nothing else changes.**
   - Chart geometry and the tooltips stay as they are.
   - The reveal panel, "What happened", the date navigation and the date band stay
     as they are.
   - Nothing changes in the database, the server actions, or caching.
   - The page's GET render stays write-free (Sprint 28, R3).
9. **Tests.**
   - Unit tests for the data shaping behind each table:
     - the Planets rows match the chart's body order, and their positions are
       identical to the body `label` and tooltip strings for the same position;
     - the Signs occupancy is correct, including a sign holding several planets and
       an empty sign;
     - the Aspects list is sorted by orb, has the right swatch values, and has an
       empty state.
   - A component test for the tab component:
     - the initial selection is Chart;
     - arrow keys, Home and End move the selection;
     - the ARIA attributes are present;
     - with no JavaScript, all four sections are present in the server-rendered
       HTML.
   - Evidence follows the CLAUDE.md project standard: `npm run verify`'s result line,
     `exit=0`.

### Acceptance Criteria

**QA1 (static):**
- **R1, R8:**
  - The diff is limited to the shared reading view, a new tabs component, new table
    components and helpers, CSS modules, and their tests.
  - No file changes under `supabase/`, `lib/llm/`, `lib/date-page/` (except an
    export, if one is needed), or `app/date/[date]/DateNavigation*`.
  - The balance panel sits outside the tabbed panel.
- **R2:**
  - `"use client"` appears only on the tab-switching component.
  - The ARIA roles and attributes are as listed, and the keyboard handler covers
    Left, Right, Home and End.
  - Trace the server render: all four panels' content is in the HTML, and nothing
    hides non-selected panels until the client takes over. Name the mechanism, for
    example a class or attribute that's set only after hydration.
- **R3–R5:**
  - Each table uses `<table>`/`<thead>`/`<th scope>`.
  - Glyphs, names, positions, elements, modalities, swatch colours, swatch dashes and
    angles are imported from the existing modules, with no literal copies. `grep`
    for literal glyphs or the `oklch` colour values in the new files.
  - The orb sort is ascending, and the empty state exists.
- **R6:** read the CSS for the 390px rules. Check the priority order, and that the
  symbol-and-name column is never hidden.
- **R7:** the positions in the Planets tab come from the same formatter as the body
  `label`.
- **R9:** the tests exist and cover the listed cases. The handoff carries
  `VERIFY PASS … exit=0`.

**LiveQA (against the deployed app, after Pipeman pushes):**
1. **Desktop.** A date page opens on the Chart tab, looking exactly as before, with
   tooltips intact.
   - Click through Planets, Signs and Aspects. Each shows its table instantly, with
     no network request.
   - Cross-check two planets: the Planets tab's position equals the chart label's and
     tooltip's for the same planet.
2. **Keyboard.** Tab into the tab strip. Left/Right, Home and End move between tabs,
   and the panel follows.
3. **Phone (about 390px).**
   - All four tabs are visible in the strip, and each tab's content has no horizontal
     page scroll.
   - The symbol and name are visible on every row of every table.
   - Record which columns wrapped or moved, if any.
4. **Signs and Aspects.**
   - Every planet appears in exactly one sign row, and occupied rows are marked.
   - The aspect line swatches visibly match the chart's lines: same colour, same
     dash.
   - The aspects table's entries match the lines drawn on the chart. Count them on
     one date.
5. **No JavaScript.** With JavaScript disabled, all four sections show stacked, with
   headings.
6. **Screen reader spot-check.** VoiceOver or NVDA, whichever is available,
   announces the tabs as a tab list with the selected state. If neither can be
   obtained, record what was tried. Don't skip it silently.
7. An old `/reading/[id]` link shows the same tabs.
8. The balance panel shows below the tabs on every tab.

### Out of Scope
- **Raw-data view** (absolute longitude, Julian Day, calculation instant, full
  numeric detail). The user deferred it to a later sprint, after these tabs have been
  seen in use.
- **Changing the chart itself,** its tooltips, or the phone chart's cropping.
- **Remembering the selected tab** across loads or in the URL. Chart always opens
  first.
- **Moving the balance panel** into a tab. The user chose to leave it where it is.
- **Moon-phase key.** The moon glyph sits in the date band, not in the chart.

### Dependencies
- Blocks: the future raw-data sprint, which would add a tab to this panel.
- Blocked by: none. Sprints 32–36 are closed.
- External: none.

### Human Prerequisites
- None. LiveQA step 6 needs a screen reader. VoiceOver ships with macOS and iOS, and
  NVDA is free on Windows. LiveQA obtains one itself, or records what it tried.

### Team Assignments
- **Dev Team 1:** the whole sprint. It all lives in the shared reading view.
- **Dev Team 2:** not assigned.

### Risks & Mitigations
- **The key disagrees with the chart,** for example a swatch colour or a position
  differs. R7 requires importing the existing values and formatters, and QA1 greps
  for copies. LiveQA steps 1 and 4 cross-check live.
- **Content is hidden when JavaScript fails.** R2 requires stacked server HTML, and
  only the client marks panels hidden. QA1 traces it, and LiveQA step 5 checks it.
- **Tables overflow on phones.** R6's priority order, and LiveQA step 3.
- **The tab strip doesn't fit at 390px** with four labels. R6 requires all four
  visible. Dev Team may shorten the labels' visible text if needed, keeping the
  accessible names intact.
- **Colour-only meaning in the Signs tab** (green for occupied). R4 requires a
  non-colour indicator too.
