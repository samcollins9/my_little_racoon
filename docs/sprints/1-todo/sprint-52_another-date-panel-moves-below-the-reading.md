---
id: 52
title: "Another date panel moves below the reading"
epic: "Date pages (PRD v3)"
status: todo
created: 2026-11-25T15:59:03+00:00
---

# Master Controller Sprint Definition — Sprint 52

**Epic:** Date pages (PRD v3)
**Sprint Objective:** On desktop and phones, the "Another date" picker and "Discover random reading" form one panel below "The reading" and "What happened", just above "Other notable dates". Only Previous day / Next day stay under the date band.

### Context

After Sprints 47, 48 and 50, the date page's order is:
- **Desktop:** banner, date band, then a strip holding the picker row ("Another date", Go, "or Discover random reading") and Previous/Next day, then the body (chart; events and reading), then "Other notable dates" at the bottom (Sprint 50).
- **Phones (Sprint 47's amended R6):** the picker and Previous/Next day are at the top. "Discover random reading" sits on its own at the bottom, above "Other notable dates".

On 25 Nov 2026 the user asked for one order on both layouts. On 25 Nov 2026 they also confirmed that it applies to phones too:

1. Header (the "Ask Reloy" banner)
2. Date band
3. Previous day / Next day
4. The chart / events / reading panel (the body; Sprint 48 decides the events-versus-reading order inside it)
5. The "Another date" panel, with "or Discover random reading"
6. "Other notable dates", the footer

### Requirements

1. **The strip under the date band holds only Previous day / Next day**, including Sprint 47's disabled "Next day" with "Reloy predicts only the past." on today's page. The picker isn't there any more, on either layout.
2. **One "Another date" panel, after the body.** It renders once, not as desktop and phone copies, between the body and "Other notable dates", on both layouts. It contains, in this order: the "Another date" label, the date input, **Go**, "or", and "Discover random reading". The picker's behaviour stays as it is: the GET form to `/date`, `max` = today (Sprint 47's R3), `min`, and `required`. The random link's behaviour stays as it is too: the server-side pick, the exclusions, and hidden together with its "or" when the pool is empty or the lookup fails.
3. **Layout inside the panel.**
   - **Desktop:** everything on one row, as the picker row looks today.
   - **Phones (≤900px):** the label, input and Go stay on one row. "or Discover random reading" may go on the line below, inside the same panel. There's no horizontal scroll at 390px, and every control's touch target clears 44px.
   - The panel's look reuses the existing picker and Go-button styles, with no new visual treatment. It gets the card's existing section spacing and dividers so it sits between the body and the footer like the other sections.
4. **Remove the duplicates.** Sprint 47's phone-only bottom copy of the random link goes, and so does the desktop copy on the picker row. The one panel in R2 replaces both. The random pick is made once per request. The single-copy rule removes Sprint 47's "two copies must match" concern, so update or retire that test accordingly.
5. **Final order, on both layouts:** banner → date band → Previous/Next day → body → "Another date" panel → "Other notable dates". On phones, the body's own internal order (chart, then Sprint 48's events/reading order) is unchanged. Keyboard Tab order and DOM order follow this visual order. Don't use CSS `order` or other reordering.
6. **Scope.** This is the date page only. `/reading/[id]` has no strip, picker or random link (Sprint 31), and stays as it is.
7. **Tests.**
   - A render test checks the DOM order of R5's landmarks, the strip's contents (day links only), and that there's exactly one date input and at most one random link on the page.
   - Sprint 47's tests that asserted the picker's or the random link's old positions are updated, and listed in the handoff.
8. **README.** Update any README description of the date page's layout.
9. **Handoff.** Follow CLAUDE.md's committed-handoff standard: `docs/handoffs/sprint-52.md`, with `npm run verify`'s final line including `exit=0`. Include screenshots under `docs/handoffs/sprint-52/`: the full page at 1280px and at 390px, top and bottom, on an ordinary date. Also one at 390px of today's page, showing the disabled "Next day" in the strip.
10. **Drop "above" from Sprint 39's message** (added 25 Nov 2026 at the user's request). The picker is now directly below "The reading", so the direction is wrong. In `unavailableMessage` (`lib/date-page/accuracy.ts`), the two "unmatched" strings become exactly:
    - `Pick a different date, or choose one of the years listed under "What happened" to go to that date instead.`
    - `Pick a different date.`

    The lead sentences and the lookup-failed message stay as they are. `lib/date-page/accuracy.test.ts` and any page test quoting the old text are updated. No other user-facing text says "above" today, which Master Controller checked with grep on 25 Nov 2026.

### Acceptance Criteria

- **R1, R2, R5 and R7:** the render tests pass. QA1 confirms from `page.tsx` and `ReadingView` that the panel is rendered once, after the body, and that `belowDateBand` now carries only the day navigation.
- **R3:** QA1 confirms the styles are reused, not re-created. The 390px screenshot shows the wrap and no horizontal scroll.
- **R4:** grep finds no second random-link or picker render path. The random-pick function is called once per request.
- **R6:** the `/reading/[id]` render tests are unchanged.
- **R10:** grep finds no "date above" in `app/` or `lib/`. The accuracy tests quote the new strings exactly.
- **R8 and R9:** QA1 reads `docs/handoffs/sprint-52.md` at the audited commit, finds `VERIFY PASS … exit=0`, and opens the screenshots.

**LiveQA (the deployed app):**
1. At 1280px, on `/date/1969-07-20`, top to bottom: banner, date band, Previous/Next day, chart with events and reading, the "Another date" panel on one row with "or Discover random reading", then "Other notable dates".
2. The same at 390px. The picker row fits, "or Discover random reading" may sit on the line below, and nothing scrolls sideways.
3. The picker works from its new place: choose a past date and press Go, and the page lands there. A future date can't be chosen.
4. "Discover random reading" works and isn't the current date. Reload a few times and confirm it changes, as Sprint 47 tested.
5. On today's page, the strip shows the disabled "Next day" with its message.
6. Tab from the top: the day links, then the chart and reading controls, then the picker, Go and the random link, then the notable dates.
7. On a date with no match for its year (today usually works), "The reading" says "Pick a different date, or choose one of the years listed under 'What happened'…" or "Pick a different date.", with no "above". The picker panel sits directly below the reading/events.

### Out of Scope

- **`/reading/[id]`.** See R6.
- **Changing the picker's or the random link's behaviour, wording or styling.** R10's change is to Sprint 39's message in "The reading", not to the picker.
- **Moving "Other notable dates".** Sprint 50 owns its desktop placement.

### Dependencies

- **Blocks:** nothing.
- **Blocked by:** Sprint 50 has to close first, because this sprint's order assumes its footer placement. Sprint 51, running in parallel on Dev Team 2, also has to close and be merged into main, because both edit around `ReadingView`'s body. Start from a main that contains both.
- **External:** none.

### Human Prerequisites

None.

### Team Assignments

- **Dev Team 1:** all of it, after Sprint 50.
- **Dev Team 2:** not assigned. Every file is shared with the queued sprints.

### Risks & Mitigations

- **The picker is the main way to change date, and it's now below the fold.** — The user chose this. Previous/Next day stay at the top, and LiveQA's step 6 confirms it's still reachable by keyboard.
- **Leftover two-copy code from Sprint 47.** — R4, and its grep.
- **The phone panel overflows.** — R3's limits and LiveQA's step 2.
