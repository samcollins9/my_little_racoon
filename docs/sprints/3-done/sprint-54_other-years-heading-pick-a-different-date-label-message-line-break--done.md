---
id: 54
title: "Other-years heading, Pick a different date label, message line break"
epic: "Date pages (PRD v3)"
status: done
created: 2026-11-26T01:56:56+00:00
---

# Master Controller Sprint Definition — Sprint 54

**Epic:** Date pages (PRD v3)
**Sprint Objective:** Three wording and layout changes on the page:
- When the page lists other years' events, the events heading reads "Other years with D Month events".
- The picker panel's label reads "Pick a different date".
- Sprint 39's message in "The reading" breaks onto a new line after its bold first sentence.

### Context

The user asked for these on 25–26 Nov 2026.

**The events heading.** It always reads "What happened" today. When "The reading" shows "no exact-date events" and other years' events are listed, the heading should name what's actually there, for example "Other years with 4 July events". When there are events for this exact date, it stays "What happened". If the day has no events in any year, the list is empty ("No recorded events for this day."), and the user decided on 26 Nov 2026 that the heading stays "What happened" then too. So the new heading appears in exactly the case where Sprint 48's `eventsPlacement` returns `"below"`.

**The picker label.** The panel Sprint 52 placed under the reading is labelled "Another date". It becomes "Pick a different date", matching the wording of Sprint 39's message.

**The line break.** Sprint 39's message is one paragraph: a bold lead sentence ("We have no recorded events for this exact date, so we can't write an accurate horoscope for it."), then the next step ("Pick a different date…"). The user wants the next step to start on its own line.

### Requirements

1. **The events heading.**
   - When `eventsPlacement(events)` is `"below"` (unmatched, not null, at least one event), the heading reads exactly `Other years with <D> <Month> events`. `<D>` is the page's day of the month with no leading zero, and `<Month>` is its full English month name, from the page's own date (`eventDate`) via the existing `formatLongDate`. So 2026-07-04 gives "Other years with 4 July events", and 2026-11-25 gives "Other years with 25 November events".
   - In every other case (matched, empty, null), it reads "What happened", as today.
   - One function builds the heading, reusing `eventsPlacement`, so the heading, the placement and the status label can't disagree.
   - This applies on `/date/[date]` and `/reading/[id]`, on desktop and phones. The status label beside it ("on this day, other years") doesn't change.
2. **Keep Sprint 39's message pointing at the right heading.** The message's linkable-years variant says `choose one of the years listed under "What happened"`. That variant only shows in R1's "below" case, where the heading no longer says "What happened". In that string, `"What happened"` becomes the R1 heading for the page's date, so it reads exactly: `Pick a different date, or choose one of the years listed under "Other years with 4 July events" to go to that date instead.` That's for 4 July, with the date varying by page. The no-linkable-years variant, `Pick a different date.`, doesn't change. The text is built from R1's function, not typed out a second time.
3. **The picker label.** The panel's `<label>` reads exactly "Pick a different date", on both layouts. It stays the label for the date input (`htmlFor`). Nothing else in the panel changes: Go, "or", "Discover random reading", and the quick-fix centering if it has shipped.
4. **The line break.** In Sprint 39's message, the bold lead sentence ends its line, and the next-step text starts on the next line. This holds in both variants (unmatched, and the lookup-failed "Try again in a few minutes."), because they're one component.
   - It stays one `<p>`, with no new paragraph spacing. It's a line break, not a gap.
   - The bold styling, size and colour stay the same, and so does the text's width (Sprint 53).
   - A screen reader still reads the lead, then the next step, with no stray characters.
5. **Tests.**
   - Unit tests for R1's function cover matched, unmatched with events, unmatched with no events, and null. They include the 4 July and 25 November examples, plus a single-digit day.
   - The R2 string test uses a fixed date.
   - Render tests cover R1 on both routes, the R3 label (with Sprint 52's tests updated from "Another date"), and R4's structure: the lead sentence and the next step separated by one line break inside one paragraph.
6. **Handoff.** Follow CLAUDE.md's committed-handoff standard: `docs/handoffs/sprint-54.md`, with `npm run verify`'s final line including `exit=0`. Include screenshots under `docs/handoffs/sprint-54/` at 1280px and 390px:
   - an unmatched date with other years listed (the new heading, and the message with its line break);
   - a matched date, such as 1969-07-20 ("What happened");
   - the picker panel with its new label.

### Acceptance Criteria

- **R1 and R2:** the unit tests pass. QA1 confirms the heading and the message's quoted heading both come from one function built on `eventsPlacement`, and that no "What happened" string remains for the unmatched-with-events case.
- **R3:** the render test finds "Pick a different date" as the input's label. grep finds no "Another date" in `app/` or `lib/` (outside comments).
- **R4:** the render test confirms the structure. QA1 confirms no new margin or padding was added.
- **R6:** QA1 reads `docs/handoffs/sprint-54.md` at the audited commit, finds `VERIFY PASS … exit=0`, and opens the screenshots.

**LiveQA (the deployed app):**
1. On an unmatched date with other years listed (today's date usually works; record which): the events heading reads "Other years with <D> <Month> events" for that date. The status label still reads "on this day, other years". "The reading"'s message has its bold sentence on one line, and "Pick a different date, or choose one of the years listed under "Other years with <D> <Month> events"…" starts on the next.
2. `/date/1969-07-20`: the heading reads "What happened".
3. The picker panel's label reads "Pick a different date", and the picker still works.
4. `/reading/<an unmatched reading's id>`, if one exists, shows the same heading and message. Record whether one was found.
5. Steps 1 and 3 at 390px: no horizontal scroll, and the heading wraps cleanly if it's long.

### Out of Scope

- **Changing the status labels** ("this exact date", "on this day, other years", "no exact-date events").
- **Changing the empty-list or lookup-failed headings.** They stay "What happened" (the user's decision, 26 Nov 2026).
- **Any other wording in "The reading".**

### Dependencies

- **Blocks:** nothing.
- **Blocked by:** nothing in sprint terms, since Sprints 45 to 53 are closed. The quick-fix centering of the picker panel (`date.module.css` only) is with Dev Team 1. Land it first, so this sprint's screenshots show the centred panel.
- **External:** none.

### Human Prerequisites

None.

### Team Assignments

- **Dev Team 1:** all of it, after the centering quick fix has been handed to Pipeman.
- **Dev Team 2:** not assigned.

### Risks & Mitigations

- **The message points at a heading that no longer exists.** — R2 builds the quoted heading from R1's function.
- **The line break becomes a paragraph gap.** — R4 requires one `<p>` and no new spacing.
- **A long heading on phones.** "Other years with 30 September events" — LiveQA's step 5.
