---
id: 48
title: "Other-years events move below the reading"
epic: "Date pages (PRD v3)"
status: done
created: 2026-11-25T15:14:43+00:00
---

# Master Controller Sprint Definition — Sprint 48

**Epic:** Date pages (PRD v3)
**Sprint Objective:** When "What happened" lists only other years' events, it moves below "The reading". In every other case it stays above, as today.

### Context

Today `ReadingView` always renders "What happened" first and "The reading" second, on desktop (the right column) and on phones alike. On 25 Nov 2026 the user asked for the order to depend on what the events are. The visitor should first see the events for this exact date, and then decide whether to open the reading. If this date has no events, they should learn that first. Events from other years on the same day can be useful, but they aren't why the visitor is on the page, so they go after the reading.

The user's decision, 25 Nov 2026: only a real list of other years' events moves down. An empty list ("No recorded events for this day.") and a failed lookup ("No events looked up…") both stay above the reading, as today.

### Requirements

1. **One placement rule, in one place.** A pure, unit-tested function decides the placement from the events payload:
   - **below the reading:** the payload isn't matched (`hasMatchedEvents` is false), it's not null, and it has at least one event. That's the case where the status reads "on this day, other years" and rows are listed.
   - **above the reading:** every other case. That means a matched payload ("this exact date"), an unmatched payload with no events, and a null payload (the lookup failed or nothing was looked up).

   It reuses `hasMatchedEvents` (`lib/events/matched.ts`), so it can never disagree with the status label or Sprint 39's messages.
2. **The same rule on desktop and phones.** In "below" the order is "The reading" and then "What happened". In "above" the order is unchanged. On desktop both stay in the right column. On phones both stay in the single column.
3. **Real DOM order, not CSS.** The sections are rendered in the new order. CSS `order` or `flex-direction: column-reverse` isn't used. Screen readers, keyboard Tab order and the visual order stay the same.
4. **Both pages.** The rule applies wherever `ReadingView` renders: `/date/[date]` and `/reading/[id]`.
5. **Spacing and rules look right in both orders.** The divider between the two sections stays between them, and there's no doubled or missing border. In "below", "What happened" follows the reading directly. `.readingSection`'s `flex: 1` mustn't open a gap between them or push the events to the bottom of the column on desktop. Phone padding stays the same, apart from fixing the same problem there.
6. **The phone bottom order, building on Sprint 47.** In "below" on a phone, the order after the chart is: "The reading" → "What happened" (other years) → "Discover random reading" → "Other notable dates". Sprint 47's random link moves one place down, after the events. In "above", Sprint 47's order is unchanged.
7. **Copy stays true.** Sprint 39's unmatched message points to the years "listed under 'What happened'" and to "a different date above". Both stay true in the new order, since the picker is still above. If the build changes any other wording that refers to position, list it in the handoff. Otherwise there's no copy change.
8. **Tests.**
   - The R1 function gets unit tests for all four cases: matched, unmatched with events, unmatched and empty, and null.
   - Render tests confirm that the order of "What happened" and "The reading" headings in the DOM matches the rule, on `/date/[date]` and `/reading/[id]`.
   - A phone-layout render test confirms R6's order.
9. **Handoff.** Follow CLAUDE.md's committed-handoff standard: `docs/handoffs/sprint-48.md`, with `npm run verify`'s final line including `exit=0`. Include screenshots under `docs/handoffs/sprint-48/`, desktop at ≥1280px and phone at ~390px, for:
   - a matched date, such as 1969-07-20, with the events above;
   - an other-years date, such as today's date when its feed has no match, with the events below;
   - an empty-list date, with the events above. If no empty-list date can be found on the live feed, a test fixture rendered locally is enough. Say which in the handoff.

### Acceptance Criteria

- **R1:** the four unit tests pass. QA1 confirms that the function uses `hasMatchedEvents` and that nothing else decides the order.
- **R2, R3 and R4:** the render tests pass. QA1 confirms from `ReadingView` that the order is set by which element renders first, and finds no CSS `order` or `column-reverse` for these sections.
- **R5:** QA1 reviews the CSS diff for borders and `flex: 1` in both orders. The screenshots show no stray gap or doubled rule.
- **R6:** the phone render test passes. The phone screenshot of the other-years case shows R6's order.
- **R7:** QA1 checks the handoff's list of changed wording, or confirms there's none.
- **R9:** QA1 reads `docs/handoffs/sprint-48.md` at the audited commit, finds `VERIFY PASS … exit=0`, and opens the screenshots.

**LiveQA (the deployed app):**
1. Desktop (≥1280px), `/date/1969-07-20`: "What happened" ("this exact date") comes before "The reading".
2. Desktop, a date whose feed has no match for its year: "The reading" (Sprint 39's message) comes first, with "What happened" ("on this day, other years") directly below it and no large gap. Today's date usually works for this. Record the date used.
3. The same two dates at 390px. For the other-years date, scroll down and confirm the order: the reading, then the other-years events, then "Discover random reading", then "Other notable dates".
4. Tab through the other-years page. Focus reaches the reading's controls before the events' year links.
5. `/reading/<an existing id>` follows the same rule for its stored events.
6. If an empty-list or failed-lookup case can be found live, confirm "What happened" stays on top. If none can be found, record that, since R8's tests cover it.

### Out of Scope

- **Changing the events list, the status labels or Sprint 39's messages.** Only the order changes.
- **Folding or hiding the other-years events.** They move, nothing more.
- **The left column.** The chart panel's placement doesn't change.

### Dependencies

- **Blocks:** nothing.
- **Blocked by:** Sprint 47 has to close first. It's in `dev_build`, and it changes the date page and the phone bottom order (R6) that this sprint builds on. Both touch `app/date/[date]/page.tsx` and the layout around `ReadingView`.
- **External:** none.

### Human Prerequisites

None.

### Team Assignments

- **Dev Team 1:** all of it, after Sprint 47 closes.
- **Dev Team 2:** not assigned. The work overlaps Sprint 47's files.

### Risks & Mitigations

- **`flex: 1` on the reading section opens a gap.** On desktop, `.readingSection` grows to fill the column, which would push other-years events to the bottom. — R5 names it, and LiveQA's step 2 checks it.
- **The visual order and the reading order disagree.** — R3 forbids CSS reordering.
- **A second rule drifts from the status label.** — R1 builds on `hasMatchedEvents`, the rule the status label and Sprint 39's messages already share.
- **Sprint 47's random link position conflicts.** — R6 states the combined phone order explicitly, and the sprint waits for 47 to close.
