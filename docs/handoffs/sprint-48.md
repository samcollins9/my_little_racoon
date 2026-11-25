# Sprint 48 handoff — Other-years events move below the reading

## Round 1

**Status:** ready for QA1's gate-1 audit.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (49 test files, 580 tests).

**Sprint file:** I re-read it at this commit. It's unchanged since `/sprint-start` (`73ed69b`): `git log 73ed69b..HEAD` on the file is empty.

### What changed

| Req | Where | How |
|---|---|---|
| R1 | `app/reading/[id]/display.ts` `eventsPlacement` | `events !== null && !hasMatchedEvents(events) && events.events.length > 0 ? "below" : "above"`. It sits beside `eventsLabel`, and `ReadingView` uses it as the only thing deciding the order. |
| R2, R3, R4 | `app/reading/[id]/ReadingView.tsx` | The "What happened" `<section>` is built once, as `eventsSection`. In "above" it renders before the reading section; in "below" it renders after it. Both stay in `.rightColumn`, which is also the phone's single column. It's DOM order, so the eye, Tab and screen readers all get the same order. `ReadingView` serves both `/date/[date]` and `/reading/[id]`. |
| R5 | `app/reading/[id]/reading.module.css` | Two modifiers, applied only in "below". `.readingSectionFirst { flex: none }` stops the reading section growing, so it can't open a gap above the events or push them to the column's foot. `.eventsSectionBelow` moves the events section's 1px rule from its bottom edge to its top edge, so there's still exactly one rule between the two sections. On phones `.eventsSectionBelow { border-top: none }` keeps the phone's existing no-rule look. Phone padding is unchanged. |
| R6 | — (follows from R2) | The phone copies of Sprint 47's random link and Sprint 45's notable dates are `ReadingView`'s `afterBody`, after `.body`. In "below" the column reads: the reading, then the events, then the random link, then the notable dates. In "above", Sprint 47's order is unchanged. |
| R7 | — | **No copy change.** I grepped the app's strings for positional words. Sprint 39's "Pick a different date above" refers to the picker, which is still above. "The years listed under 'What happened'" refers to that heading, wherever it sits. Both stay true in either order. |

### Why no CSS reordering

`grep -rnE "^\s*order\s*:|column-reverse|row-reverse" app --include=*.css` gives `grep exit=1`. In the browser check below, the two sections' computed `order` is `0`, and the column's `flex-direction` is `column`, in every case.

### Tests

- **`app/reading/[id]/display.test.ts`, R1:**
  - matched gives "above";
  - unmatched with events gives "below";
  - unmatched and empty gives "above";
  - null gives "above";
  - a stored `matchedYear: "true"` (a string) counts as unmatched, just as `hasMatchedEvents` says.
- **`app/reading/[id]/events-placement-pages.test.ts`** (new), rendering the real pages on the server. The order of the `>What happened</h2>` and `>The reading</h3>` headings in the markup is the order checked.
  - `/date/[date]`: matched gives events first; other years gives the reading first; an empty list gives events first; a failed lookup gives events first.
  - `/reading/[id]`, from its stored events: the same four cases, with the same results.
  - **R6:** for other years on the date page, the order is reading, then events, then `randomSection mobileOnly`, then `notableSection mobileOnly`, and the events close inside the body before the random section. For this exact date, the order is events, then reading, then random, then notable.
  - **R5 hooks:** "below" carries `readingSection readingSectionFirst` and `eventsSection eventsSectionBelow`. "Above" carries neither.
- **`app/reading/[id]/accuracy-pages.test.ts`** (Sprint 39), helpers only. `eventsColumn` and `readingSection` used to slice from one section's heading to the other's, which assumed events came first. They now slice each section from its own heading to its own `</section>`, so they work in either order. The events slice anchors on `>What happened<`, because Sprint 39's message also contains the words "What happened", and in the new order that message comes first. No assertion changed.

### Manual check (R9 screenshots)

I built for production with `next build && next start` against Sprint 47's stand-in ([sprint-47/fake47.mjs](sprint-47/fake47.mjs)). Its data is [rows48.json](sprint-48/rows48.json): the saved 1969-07-20 reading, plus two stored-reading fixtures. I drove Chrome 156 headless over CDP ([cdp48.mjs](sprint-48/cdp48.mjs)), with results in [report.json](sprint-48/report.json).

**Which source each case comes from:**
- **Matched:** `/date/1969-07-20`, from the live Wikipedia feed ("this exact date").
- **Other years:** `/date/1931-03-03`, from the live Wikipedia feed ("on this day, other years"). Today's date (2026-11-25) matched in the live feed during this check, so I used another date.
- **Empty list:** a **local test fixture**, `/reading/48480000-…-0001`, a stored reading whose events are `{matchedYear: false, events: []}`. I didn't find an empty-list date on the live feed. The date page takes its events from that feed, so I served this case through `/reading/[id]`, which renders the stored payload through the same `ReadingView`.
- **Also:** `/reading/48480000-…-0002`, a stored other-years fixture, for R4 on the reading page.

| Case | Width | Order shown | Gap between the sections | Rules between them | Page scroll width |
|---|---|---|---|---|---|
| Matched | 1280 | events, then reading | 0px | 1 | 1280 |
| Matched | 390 | events, reading, random, notable | 0px | 0 (as before) | 390 |
| Other years | 1280 | **reading, then events** | 0px | 1 | 1280 |
| Other years | 390 | **reading, events, random, notable** | 0px | 0 | 390 |
| Empty list (fixture) | 1280 / 390 | events, then reading | 0px | 1 / 0 | 1280 / 390 |
| `/reading` other years (fixture) | 1280 / 390 | reading, then events | 0px | 1 / 0 | 1280 / 390 |

In "below" the reading section's computed `flex-grow` is `0`. On `/reading`'s other-years page at 1280, the right column ends at 1118 and the events at 789. The spare space sits under the events, at the column's foot, not between the two sections.

**Screenshots:**
- Matched: [desktop-1280-matched.png](sprint-48/desktop-1280-matched.png), [phone-390-matched.png](sprint-48/phone-390-matched.png) and [phone-390-matched-foot.png](sprint-48/phone-390-matched-foot.png).
- Other years: [desktop-1280-other-years.png](sprint-48/desktop-1280-other-years.png) (the reading with Sprint 39's message, then one rule, then "What happened", with no gap). [phone-390-other-years.png](sprint-48/phone-390-other-years.png) shows the reading then the events. [phone-390-other-years-foot.png](sprint-48/phone-390-other-years-foot.png) shows the last event, then "Discover random reading", then "Other notable dates": R6's order.
- Empty list (fixture): [desktop-1280-empty-list.png](sprint-48/desktop-1280-empty-list.png) and [phone-390-empty-list.png](sprint-48/phone-390-empty-list.png). "What happened" ("No recorded events for this day.") stays on top.
- `/reading` other years (fixture): [desktop-1280-reading-other-years.png](sprint-48/desktop-1280-reading-other-years.png) and [phone-390-reading-other-years.png](sprint-48/phone-390-reading-other-years.png).

**Tab order (LiveQA step 4).** On an other-years page, the reading section holds Sprint 39's message and nothing focusable. Sprint 39 makes those dates unwritable, so there's no form or button, and the message contains no links. In 80 Tab presses from the top of `/date/1931-03-03`, focus never entered the reading section. It reached the first event year link at stop 32, after the picker, the day links, the notable dates and the chart tabs. So "the reading's controls before the events' year links" has nothing to compare on such a page. The DOM order, reading first, is what guarantees it wherever the reading does have controls. On the matched page the first reading stop (the reveal button) is at stop 31.

### Known limitations

- **Pre-existing, not changed:** on `/reading/[id]`, Sprint 39's unmatched message says "Pick a different date above", but that page has no date picker (`phone-390-empty-list.png` shows it). It was true before this sprint and still is. R7 doesn't ask to fix it, and it's outside this sprint's "only the order changes", so it's for Master Controller to decide.
- **Status label over an empty list (pre-existing):** an unmatched, empty payload is labelled "on this day, other years" over "No recorded events for this day." That's `eventsStatusLabel` as Sprint 39 left it. This sprint's rule correctly keeps that case above, but the label itself is unchanged.
- **Lint:** `npm run lint` passes, with the same 3 warnings in my Sprint 45/46 probe scripts that QA1 routed to Master Controller in Sprint 47's audit. This sprint adds none.

### Questions for QA1

None.

## Round 2

**Status:** ready for QA1's re-audit. This round fixes QA1's one defect from round 1 and changes nothing else.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (49 test files, 580 tests).

**Sprint file:** I re-read it at this commit. It's still unchanged since `/sprint-start` (`git log 73ed69b..HEAD` on the file is empty).

### The defect (QA1 round 1, R5, phones, "below" only)

A doubled line appeared at the foot of the events. On phones `.eventsSection` has no bottom padding, and every `.eventRow` has a bottom border. In the "below" order the events section is the column's last child, so the last row's line sat directly on `.randomSection`'s top border. This was new in this sprint: before it, the reading section, which has its own bottom padding, came last.

### Fix: `app/reading/[id]/reading.module.css`, one line

In the phone block, `.eventsSectionBelow` gains `padding-bottom: 24px`, the same as `.readingSection`'s phone bottom padding. It applies only in the "below" order. The "above" order and desktop are untouched.

### Evidence

I re-ran the same rig and probe against a rebuilt production build. [cdp48.mjs](sprint-48/cdp48.mjs) now also records what follows the last event row. Results are in [round2/report.json](sprint-48/round2/report.json), and all ten screenshots are retaken under [round2/](sprint-48/round2/).

- **Phone 390, `/date/1931-03-03` (below):** the last row has a 1px bottom border, the events section's bottom padding is `24px`, and the next section (`randomSection`, 1px top border) starts **24px** below the last row. In round 1 that distance was 0. The screenshot [round2/phone-390-other-years-foot.png](sprint-48/round2/phone-390-other-years-foot.png) shows the 1933 row's faint line, a clear gap, then the rule above "Discover random reading".
- **Phone 390, `/reading/…-0002` (below, no random link):** 24px of padding under the last row, at the card's end.
- **Phone 390, `/date/1969-07-20` (above):** unchanged. Bottom padding is 0, and the reading section follows with no top border, so the last row's line touches nothing. This is the same as before the sprint.
- **Desktop:** unchanged. Bottom padding is 26px, as before. Every case still has a 0px gap and exactly one rule between the two sections. (The probe's desktop "next section" figure for the date page is the phone-only random section, which isn't shown on desktop, so it isn't a real measurement there.)
- **Order:** unchanged in every case: matched and the empty list put events first; both other-years cases put the reading first. No page scrolls sideways.

### Tests

No new unit test. The fix is a padding value, and the Vitest suite renders markup without layout, so the 24px measurement above is the evidence. Round 1's tests, including the `eventsSectionBelow` hook test, pass unchanged.

### Not changed

- Everything QA1 found met in round 1.
- The three pre-existing items QA1 routed to Master Controller: the "Pick a different date above" wording on `/reading/[id]`, the status label over an empty unmatched list, and the 3 lint warnings in my Sprint 45/46 probe scripts.
