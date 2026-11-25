---
id: 51
title: "This-exact-date events drop the year column"
epic: "Date pages (PRD v3)"
status: done
created: 2026-11-25T15:51:12+00:00
---

# Master Controller Sprint Definition — Sprint 51

**Epic:** Date pages (PRD v3)
**Sprint Objective:** When "What happened" reads "this exact date", the events list is a single column of descriptions, with no year column.

### Context

Each row in "What happened" is a two-column grid (`.eventRow`, `62px 1fr`, `52px 1fr` on phones). The first column holds the event's year (`EventYear`), and the second holds the description. Sprint 39 made the year a link to that year's date page, but only on unmatched ("on this day, other years") lists. On a matched ("this exact date") list, the year is plain text. Every event there is from the page's own year, which is already in the date band, so the column repeats it on every row. On 25 Nov 2026 the user asked for matched lists to drop that column and show only the descriptions.

Unmatched lists keep both columns. Their year links are how a visitor reaches another year's page (Sprint 39's R1).

### Requirements

1. **Matched lists: one column.** When the payload is matched (`hasMatchedEvents`, the same rule as the "this exact date" status), rows render no year element at all. It's not hidden, it's absent from the DOM. The description fills the row's full width. This applies on desktop and phones, on `/date/[date]` and `/reading/[id]`.
2. **Unmatched lists don't change.** "On this day, other years" rows keep the year column, the year links and their touch-target padding exactly as they are, including years that can't be linked.
3. **Everything else in the row stays.** The description text, the "(pictured)" stripping from Sprint 42, the "(source)" link, the row dividers and the vertical padding stay the same. The text style doesn't change.
4. **One rule.** Matched/unmatched is decided by `hasMatchedEvents`, not by anything new. The single-column layout comes from a row variant (for example a modifier class) chosen in `ReadingView`. Don't use a CSS selector that guesses from content.
5. **Tests.** Render tests:
   - A matched payload produces rows with no year element and the descriptions in order.
   - An unmatched payload produces rows with years, and links where linkable, unchanged.
   - Both on `/date/[date]` and on `/reading/[id]`.
6. **Handoff.** Follow CLAUDE.md's committed-handoff standard: `docs/handoffs/sprint-51.md`, with `npm run verify`'s final line including `exit=0`. Include screenshots under `docs/handoffs/sprint-51/` of a matched date (for example 1969-07-20) at ≥1280px and at ~390px, and of an unmatched date at ≥1280px for comparison.

### Acceptance Criteria

- **R1, R4 and R5:** the render tests pass. QA1 confirms from `ReadingView` that the year element isn't rendered for matched payloads, and that the choice uses `hasMatchedEvents`.
- **R2:** the existing Sprint 39 year-link tests pass unchanged.
- **R3:** QA1 confirms the CSS diff only changes the grid columns for the matched variant, and keeps dividers, padding and text styles.
- **R6:** QA1 reads `docs/handoffs/sprint-51.md` at the audited commit, finds `VERIFY PASS … exit=0`, and opens the screenshots.

**LiveQA (the deployed app):**
1. `/date/1969-07-20` at 1280px and at 390px: "What happened" (this exact date) lists descriptions only, full width, with no year. Source links work.
2. An unmatched date, such as today when its feed has no match: rows still show years, and the linkable ones go to that year's date page.
3. `/reading/<an existing id>` with matched events shows the single-column list.

### Out of Scope

- **Changing the unmatched layout, the status labels or the empty-list messages.**
- **Showing the year anywhere else in the row.** The date band already shows it.

### Dependencies

- **Blocks:** nothing.
- **Blocked by:** nothing now. Sprints 47 and 48 have closed. *(Amended 25 Nov 2026 to run in parallel.)* Sprint 49's diff (`page.tsx` for dates and readings, `layout.tsx`, `not-found.tsx`, `reading/[id]/load.ts`, `lib/site-title.ts`) doesn't touch `ReadingView.tsx` or `reading.module.css`, which are this sprint's files. Sprint 50 works in `app/date/[date]/` (`page.tsx`, `NotableDates.tsx`, `date.module.css`). So this sprint can run in parallel with 49's live test and with 50, in Dev Team 2's worktree. If Sprint 50 ends up needing `ReadingView.tsx` or `reading.module.css`, whichever team gets there second flags it before editing.
- **External:** none.

### Human Prerequisites

None.

### Team Assignments

- **Dev Team 1:** not assigned.
- **Dev Team 2:** all of it, in its own worktree. Run `/sprint-worktree 51` before building, and stay in it for the whole sprint. Close by handing the branch to Pipeman to merge (CLAUDE.md, "The worktree's life does not end at close").

### Risks & Mitigations

- **The rule drifts from the status label.** — R4 uses `hasMatchedEvents`.
- **Hiding the year with CSS leaves it in the accessibility tree.** — R1 requires it to be absent from the DOM.
