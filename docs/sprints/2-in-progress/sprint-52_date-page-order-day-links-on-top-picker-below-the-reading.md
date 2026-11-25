---
id: 52
title: "Date page order: day links on top, picker below the reading"
original_title: "Another date panel moves below the reading"
epic: "Date pages (PRD v3)"
status: in_progress
created: 2026-11-25T15:59:03+00:00
---

# Master Controller Sprint Definition — Sprint 52

**Epic:** Date pages (PRD v3)
**Sprint Objective:** On desktop and phones the order becomes banner → Previous day / Next day → date band → chart/events/reading → "Another date" panel (with "Discover random reading") → "Notable dates". The footer heading is renamed from "Other notable dates".

### Context

After Sprints 47, 48 and 50, the date page's order is:
- **Desktop:** banner, date band, then a strip holding the picker row ("Another date", Go, "or Discover random reading") and Previous/Next day, then the body (chart; events and reading), then "Other notable dates" at the bottom (Sprint 50).
- **Phones (Sprint 47's amended R6):** the picker and Previous/Next day are at the top. "Discover random reading" sits on its own at the bottom, above "Other notable dates".

On 25 Nov 2026 the user asked for one order on both layouts, and confirmed that it applies to phones too. Later the same day, before this sprint started, they amended it. Previous day / Next day move **above** the date band, so "The sky over <date>" sits directly above the chart. The footer heading becomes "Notable dates". The order, on both layouts:

1. Header (the "Ask Reloy" banner)
2. Previous day / Next day
3. Date band ("The sky over <date>")
4. The chart / events / reading panel (the body; Sprint 48 decides the events-versus-reading order inside it)
5. The "Another date" panel, with "or Discover random reading"
6. "Notable dates", the footer (renamed from "Other notable dates")

### Requirements

1. **Previous day / Next day sit between the banner and the date band** (amended 25 Nov 2026), on both layouts, and include Sprint 47's disabled "Next day" with "Reloy predicts only the past." on today's page. Nothing sits between the date band and the body any more. The picker isn't at the top on either layout. The day navigation keeps its current link styles. Its spacing and divider come from the existing strip styles, adjusted only as far as needed for its new position under the banner. Say in the handoff what was adjusted.
2. **One "Another date" panel, after the body.** It renders once, not as desktop and phone copies, between the body and "Other notable dates", on both layouts. It contains, in this order: the "Another date" label, the date input, **Go**, "or", and "Discover random reading". The picker's behaviour stays as it is: the GET form to `/date`, `max` = today (Sprint 47's R3), `min`, and `required`. The random link's behaviour stays as it is too: the server-side pick, the exclusions, and hidden together with its "or" when the pool is empty or the lookup fails.
3. **Layout inside the panel.**
   - **Desktop:** everything on one row, as the picker row looks today.
   - **Phones (≤900px):** the label, input and Go stay on one row. "or Discover random reading" may go on the line below, inside the same panel. There's no horizontal scroll at 390px, and every control's touch target clears 44px.
   - The panel's look reuses the existing picker and Go-button styles, with no new visual treatment. It gets the card's existing section spacing and dividers so it sits between the body and the footer like the other sections.
4. **Remove the duplicates.** Sprint 47's phone-only bottom copy of the random link goes, and so does the desktop copy on the picker row. The one panel in R2 replaces both. The random pick is made once per request. The single-copy rule removes Sprint 47's "two copies must match" concern, so update or retire that test accordingly.
5. **Final order, on both layouts:** banner → Previous/Next day → date band → body → "Another date" panel → "Notable dates". On phones, the body's own internal order (chart, then Sprint 48's events/reading order) is unchanged. Keyboard Tab order and DOM order follow this visual order. Don't use CSS `order` or other reordering.
6. **Scope.** This is the date page only. `/reading/[id]` has no strip, picker or random link (Sprint 31), and stays as it is.
7. **Tests.**
   - A render test checks the DOM order of R5's landmarks, including that the day navigation comes before the date band and that nothing renders between the date band and the body. It also checks that there's exactly one date input and at most one random link on the page.
   - Sprint 47's tests that asserted the picker's or the random link's old positions are updated, and listed in the handoff.
8. **README.** Update any README description of the date page's layout.
9. **Handoff.** Follow CLAUDE.md's committed-handoff standard: `docs/handoffs/sprint-52.md`, with `npm run verify`'s final line including `exit=0`. Include screenshots under `docs/handoffs/sprint-52/`: the full page at 1280px and at 390px, top and bottom, on an ordinary date. Also one at 390px of today's page, showing the disabled "Next day" under the banner.
10. **Drop "above" from Sprint 39's message** (added 25 Nov 2026 at the user's request). The picker is now directly below "The reading", so the direction is wrong. In `unavailableMessage` (`lib/date-page/accuracy.ts`), the two "unmatched" strings become exactly:
    - `Pick a different date, or choose one of the years listed under "What happened" to go to that date instead.`
    - `Pick a different date.`

    The lead sentences and the lookup-failed message stay as they are. `lib/date-page/accuracy.test.ts` and any page test quoting the old text are updated. No other user-facing text says "above" today, which Master Controller checked with grep on 25 Nov 2026.
11. **Rename the footer to "Notable dates"** (added 25 Nov 2026). The heading text of both the desktop list (Sprint 50's footer) and the phone section reads exactly "Notable dates". It's one shared constant (`HEADING` in `NotableDates.tsx` today), and its `aria-labelledby` naming follows. Nothing else about the panel changes. Sprint 45's and Sprint 50's tests that quote "Other notable dates" are updated.

### Acceptance Criteria

- **R1, R2, R5 and R7:** the render tests pass. QA1 confirms from `page.tsx` and `ReadingView` that the panel is rendered once, after the body, that the day navigation renders before the date band, and that nothing renders between the date band and the body.
- **R11:** grep finds no "Other notable dates" in `app/` or `lib/`. Both copies render "Notable dates".
- **R3:** QA1 confirms the styles are reused, not re-created. The 390px screenshot shows the wrap and no horizontal scroll.
- **R4:** grep finds no second random-link or picker render path. The random-pick function is called once per request.
- **R6:** the `/reading/[id]` render tests are unchanged.
- **R10:** grep finds no "date above" in `app/` or `lib/`. The accuracy tests quote the new strings exactly.
- **R8 and R9:** QA1 reads `docs/handoffs/sprint-52.md` at the audited commit, finds `VERIFY PASS … exit=0`, and opens the screenshots.

**LiveQA (the deployed app):**
1. At 1280px, on `/date/1969-07-20`, top to bottom: banner, Previous/Next day, date band ("The sky over…") directly above the chart, chart with events and reading, the "Another date" panel on one row with "or Discover random reading", then "Notable dates".
2. The same at 390px. The picker row fits, "or Discover random reading" may sit on the line below, and nothing scrolls sideways.
3. The picker works from its new place: choose a past date and press Go, and the page lands there. A future date can't be chosen.
4. "Discover random reading" works and isn't the current date. Reload a few times and confirm it changes, as Sprint 47 tested.
5. On today's page, the day navigation under the banner shows the disabled "Next day" with its message.
6. Tab from the top: the banner link, the day links, then the chart and reading controls, then the picker, Go and the random link, then the notable dates.
7. On a date with no match for its year (today usually works), "The reading" says "Pick a different date, or choose one of the years listed under 'What happened'…" or "Pick a different date.", with no "above". The picker panel sits directly below the reading/events.

### Out of Scope

- **`/reading/[id]`.** See R6.
- **Changing the picker's or the random link's behaviour, wording or styling.** R10's change is to Sprint 39's message in "The reading", not to the picker.
- **Moving the notable dates panel.** Sprint 50 owns its desktop placement. This sprint only renames its heading (R11).

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

- **The picker is the main way to change date, and it's now below the fold.** — The user chose this. Previous/Next day stay at the top, under the banner, and LiveQA's step 6 confirms it's still reachable by keyboard.
- **Leftover two-copy code from Sprint 47.** — R4, and its grep.
- **The phone panel overflows.** — R3's limits and LiveQA's step 2.
