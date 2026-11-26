---
id: 55
title: "Other-years heading reads month first; message shortened"
epic: "Date pages (PRD v3)"
status: done
created: 2026-11-26T15:33:38+00:00
---

# Master Controller Sprint Definition — Sprint 55

**Epic:** Date pages (PRD v3)
**Sprint Objective:** The other-years events heading reads "Other years with events on <Month> <D>". Sprint 39's unmatched message always ends with just "Pick a different date."

### Context

Sprint 54 (closed) introduced the heading "Other years with <D> <Month> events", for example "Other years with 4 July events". It's built in `app/reading/[id]/display.ts`. Sprint 54 also made Sprint 39's message quote that heading: `Pick a different date, or choose one of the years listed under "Other years with 4 July events" to go to that date instead.` That's `lib/date-page/accuracy.ts`, in the `hasLinkableYear` variant.

On 26 Nov 2026 the user asked for two changes:
- The heading becomes "Other years with events on MMMM DD". The day has no leading zero, as in Sprint 54's own example: "4 July", so "July 4".
- The message's next step becomes simply "Pick a different date.", with no pointer to the year list.

### Requirements

1. **The heading wording.** In Sprint 54's "below" case only, the heading reads exactly `Other years with events on <Month> <D>`. `<Month>` is the full English month name and `<D>` is the day of the month with no leading zero, from the page's own date. So 2026-07-04 gives "Other years with events on July 4", and 2026-11-25 gives "Other years with events on November 25". Every other case still reads "What happened". Sprint 54's single heading function and its `eventsPlacement` rule stay. Only the string it builds changes.
2. **The message's next step.** For the unmatched kind, the next step is exactly `Pick a different date.` whether or not any year is linkable. The bold lead sentence, Sprint 54's line break, and the lookup-failed message ("Try again in a few minutes.") stay as they are.
3. **Remove what's now unused.**
   - If nothing still needs `hasLinkableYear` in `HoroscopeAvailability`, or the heading parameter that `unavailableMessage` took for R2's old string, remove them along with their tests.
   - The year links in the events list (Sprint 39's R1, `EventYear`/`linkableEventDate`) stay. They're still how a visitor reaches another year.
   - List in the handoff what was removed.
4. **Tests.** Update Sprint 54's unit tests to the new heading, including a single-digit day, and both examples above. The accuracy tests show the unmatched next step is "Pick a different date." with and without linkable years. Render tests on both routes show the new heading and message.
5. **Handoff.** Follow CLAUDE.md's committed-handoff standard: `docs/handoffs/sprint-55.md`, with `npm run verify`'s final line including `exit=0`. Include screenshots under `docs/handoffs/sprint-55/`, at 1280px and 390px, of an unmatched date with other years listed.

### Acceptance Criteria

- **R1:** the unit tests pass. grep finds no heading string of the old form ("Other years with … events") in `app/` or `lib/`, outside comments that describe history.
- **R2:** the accuracy tests pass. grep finds no "choose one of the years listed" in `app/` or `lib/`.
- **R3:** QA1 confirms anything removed was truly unused, and that the year links still render and link.
- **R5:** QA1 reads `docs/handoffs/sprint-55.md` at the audited commit, finds `VERIFY PASS … exit=0`, and opens the screenshots.

**LiveQA (the deployed app):**
1. An unmatched date with other years listed (today usually works; record which): the heading reads "Other years with events on <Month> <D>". "The reading" shows the bold sentence, then "Pick a different date." on the next line, and nothing more.
2. On that page, the year links in the list still go to that year's date page.
3. `/date/1969-07-20` still reads "What happened".
4. Step 1 at 390px: the heading wraps cleanly, with no horizontal scroll.

### Out of Scope

- **Status labels, the picker panel, and the empty-list or lookup-failed headings.**
- **Removing the year links.** Only the message stops pointing to them.

### Dependencies

- **Blocks:** nothing.
- **Blocked by:** nothing. Sprint 54 is closed.
- **External:** none.

### Human Prerequisites

None.

### Team Assignments

- **Dev Team 1:** all of it.
- **Dev Team 2:** not assigned.

### Risks & Mitigations

- **Removing `hasLinkableYear` breaks something that still reads it.** — R3 removes it only if it's unused, and the typecheck in `npm run verify` catches any leftover reader.
- **Visitors no longer get told about the year links.** — The user chose this. The links stay visible in the list directly below.
