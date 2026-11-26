---
id: 53
title: "Reading text uses the full column width"
epic: "Date pages (PRD v3)"
status: done
created: 2026-11-25T19:30:59+00:00
---

# Master Controller Sprint Definition — Sprint 53

**Epic:** Date pages (PRD v3)
**Sprint Objective:** The text under "The reading" uses the same width as the event text under "What happened".

### Context

On 25 Nov 2026 the user reported that the text under "The reading" wraps noticeably narrower than the event descriptions in "What happened". The cause is a set of fixed measures. Both sections have the same horizontal padding (40px on desktop, 24px on phones), and `.eventText` has no `max-width`, so event descriptions run to the column's edge. The reading section's text blocks, however, are capped:

- `.paragraph` (the horoscope's paragraphs) at `62ch`. Phones already override it to `none`.
- `.accuracyNote` (Sprint 39's "can't write a horoscope" message) at `46ch`.
- `.idleText` (the text before a horoscope is written) at `46ch`.
- `.unavailableText` in `app/date/[date]/date.module.css` (the saved-horoscopes outage notice) at `46ch`.

Master Controller measured these from the CSS on 25 Nov 2026, so they are the starting point, not a full list. Dev Team checks for any other capped text block inside the reading section.

### Requirements

1. **Same width as the event text.** Every text block inside the reading section (`.readingSection`) can extend to the same right edge as `.eventText` in the events section. That covers the horoscope's paragraphs, the idle text, Sprint 39's accuracy message, the outage notice, the disabled note, and any other prose block found under R4. It holds on desktop and phones, on `/date/[date]` and `/reading/[id]`.
2. **Only the width changes.** Font size, line height, colour, `text-wrap` and spacing all stay as they are. The section's padding doesn't change, and nothing outside the reading section changes.
3. **Controls are untouched.** Buttons, the reveal control, the busy sigil and the footer layout stay as they are. This sprint is about prose width only.
4. **Find them all.** In the handoff, list every rule changed (selector, file, old value, new value). Also list any reading-section text block checked and left as it is, with the reason.
5. **Tests.** The repo's render tests don't measure layout, so the evidence is a measurement. In the handoff, record the right edge (`getBoundingClientRect().right`) of the first event's text and of the reading section's widest text block, at 1280px and at 390px, for both states:
   - a written horoscope (for example 1969-07-20, if one exists), and
   - an unmatched date showing Sprint 39's message.

   The two right edges must match to within 1px, wherever the reading text is long enough to wrap.
6. **Handoff.** Follow CLAUDE.md's committed-handoff standard: `docs/handoffs/sprint-53.md`, with `npm run verify`'s final line including `exit=0`. Include R5's measurements, and before/after screenshots at 1280px under `docs/handoffs/sprint-53/` of a written horoscope and of an unmatched date.

### Acceptance Criteria

- **R1–R4:** QA1 confirms that the CSS diff only removes or relaxes `max-width` on reading-section text, changes nothing else in those rules, and matches the handoff's list.
- **R5:** the handoff's right-edge measurements match to within 1px in every listed case.
- **R6:** QA1 reads `docs/handoffs/sprint-53.md` at the audited commit, finds `VERIFY PASS … exit=0`, and opens the screenshots.

**LiveQA (the deployed app):**
1. At 1280px, on a date with a written horoscope: open the reading. Its paragraphs wrap at the same right edge as the "What happened" descriptions. Measure both right edges and record them.
2. At 1280px, on an unmatched date (today usually works): Sprint 39's message wraps at the same right edge as the event text.
3. Repeat steps 1 and 2 at 390px.
4. Nothing else on the page moves, and nothing scrolls sideways at either width.

### Out of Scope

- **Typography changes** (size, line height, font).
- **Section padding or column widths.**
- **Changing the event text's width to match the reading.** The reading matches the events, not the other way round.

### Dependencies

- **Blocks:** nothing.
- **Blocked by:** Sprint 51 has to be merged into main first. It's at the close step in Dev Team 2's worktree, and it edits `reading.module.css`, this sprint's main file.
- **Overlap:** `date.module.css`'s `.unavailableText` is one rule, in a file that Sprint 50 (in progress) and Sprint 52 also edit, on different rules. Pipeman resolves it at merge if this runs alongside them.
- **External:** none.

### Human Prerequisites

None.

### Team Assignments

- **Dev Team 2:** all of it, in its own worktree (`/sprint-worktree 53`), once Sprint 51 is merged into main. It can run alongside Dev Team 1's Sprint 50 or 52.
- **Dev Team 1:** not assigned.

### Risks & Mitigations

- **Very long lines become hard to read on wide screens.** — The right column's width is bounded by the card, the same as the event text today, which the user is happy with.
- **A capped block is missed.** — R4 requires a full list, and LiveQA measures both states.
- **A merge conflict with Sprints 50 or 52 in `date.module.css`.** — It's a different rule, and Pipeman merges.
