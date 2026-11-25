# Sprint 53 handoff — Reading text uses the full column width

## Round 1

**Status:** ready for QA1's gate-1 audit.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (54 test files, 607 tests).

### Rules changed (R4)

The CSS diff is five `max-width` declarations removed and one comment reworded. Nothing else in those rules changed: font size, line height, colour, `text-wrap`, margin and padding are all as they were.

| File | Selector | Old | New |
|---|---|---|---|
| `app/reading/[id]/reading.module.css` | `.accuracyNote` (Sprint 39's message) | `max-width: 46ch` | removed |
| `app/reading/[id]/reading.module.css` | `.idleText` (before a horoscope is written) | `max-width: 46ch` | removed |
| `app/reading/[id]/reading.module.css` | `.paragraph` (the horoscope) | `max-width: 62ch` | removed |
| `app/reading/[id]/reading.module.css` | `.paragraph` inside `@media (max-width: 900px)` | `max-width: none` | removed. It only cancelled the 62ch above, so with that gone it has nothing to do. Font size and line height in that rule are unchanged. |
| `app/date/[date]/date.module.css` | `.unavailableText` (saved-horoscopes outage notice) | `max-width: 46ch` | removed |

The comment above `.accuracyNote` said it shared "the same measure" as `.unavailableText`. It now says "the same type and colour", and adds that no prose in the reading section has a `max-width`.

### Reading-section text checked and left as it is (R4)

| Block | Where | Why it's unchanged |
|---|---|---|
| `.disabledNote` (the "generation is currently disabled" note) | `reading.module.css` | It has no `max-width`. |
| `.busyPhrase`, `.busyDetail` (the generating state) | `reading.module.css` | No `max-width`. Both are one short line inside `.busyTextCol`. |
| `.accuracyLead` (the bold lead inside `.accuracyNote`) | `reading.module.css` | Inline, with no width of its own. |
| `.idleAccent` | `reading.module.css` | Inline, inside `.idleText`. |
| `.readingHeader`, `.readingStatus`, `.sectionTitle` | `reading.module.css` | Headings and labels, not prose, and no width cap. |
| `.revealSummary`, `.castButton`, `.readingFooter`, `.mobileWrittenFooter` | `reading.module.css` | Controls and footer (R3: untouched). |
| `.idleBlock` | `reading.module.css` | A flex row: the sigil plus `.idleText`. It has no width limit, and the text item grows to the right edge, as measured below. |

Every other `max-width` in the app is outside the reading section's prose:
- `date.module.css` `.pickerInput` (`max-width: 100%`): the date picker's input, a control.
- `date.module.css` `.notableTooltip` (`32ch`): the notable-dates tooltip.
- `chartTabs.module.css` (`100%`), `site-banner.module.css` and `unavailable.module.css` (the error card's `640px`).

### R5: right-edge measurements

How they were taken:
- On a local `next build` and `next start`, in headless Chromium (Playwright's `chrome-headless-shell` 1248) over the DevTools protocol, with Wikipedia live.
- There's no local database, so the app was pointed at a small read-only stand-in for Supabase's RPC endpoint (a scratch script, not committed). It returns one saved, matched reading for 1969-07-20 with stored positions computed by the app's own `computePositions`, and an empty result for every other date.
- **The written horoscope's text is a placeholder**, labelled as such in the screenshot. It isn't generated text.

What was measured:
- `getBoundingClientRect().right` of the first event's `.eventText`, and of the reading section's widest prose block.
- Every reading block measured wraps over at least 3 lines.
- `before-` is the commit this branch started from (`88ae25a`), and `after-` is this change.

| Case | Width | Event text right | Reading block | Before | After |
|---|---|---|---|---|---|
| Written horoscope, 1969-07-20 | 1280 | 1167 | `.paragraph`, 5 lines | 1167 (cap was 620px, wider than the column) | **1167**, diff 0 |
| Written horoscope, 1969-07-20 | 390 | 358 | `.paragraph`, 7 lines | 358 (`none` on phones) | **358**, diff 0 |
| Unmatched, 1950-03-15 (Sprint 39's message) | 1280 | 1167 | `.accuracyNote`, 4 lines | **1087, 80px short** (414px cap) | **1167**, diff 0 |
| Unmatched, 1950-03-15 | 390 | 358 | `.accuracyNote`, 6 lines | 358 (the column was narrower than 414px) | **358**, diff 0 |
| Idle, 1945-05-08 (extra) | 1280 | 1167 | `.idleText`, 3 lines | not measured | **1167**, diff 0 |
| Idle, 1945-05-08 (extra) | 390 | 358 | `.idleText`, 4 lines | not measured | **358**, diff 0 |
| Outage, 1969-07-20 with the stand-in stopped (extra) | 1280 | 1167 | `.unavailableText`, 3 lines | not measured | **1167**, diff 0 |
| Outage, 1969-07-20 with the stand-in stopped (extra) | 390 | 358 | `.unavailableText`, 4 lines | not measured | **358**, diff 0 |

Every "after" case matches to the pixel. `scrollWidth` equals `innerWidth` in every case, so nothing scrolls sideways. The raw numbers, including every block's computed `max-width`, are in:
- `before-measurements.json`
- `after-measurements.json`
- `after-outage-measurements.json`

**What the "before" column shows:** the only cap that actually bound at these widths was the `46ch` one: Sprint 39's message ended 80px short at 1280, and the idle text and outage notice carried the same cap. The horoscope's `62ch` (620px) was wider than the column, so it didn't bind. It's removed anyway, so R1 holds by construction at any column width and not just at today's. The user's report matches the `46ch` blocks.

### Screenshots (`docs/handoffs/sprint-53/`, all at 1280)

- `before-written-1969-07-20-1280.png` and `after-written-1969-07-20-1280.png`
- `before-unmatched-1950-03-15-1280.png` and `after-unmatched-1950-03-15-1280.png`: the visible change. The message wraps to the event text's edge.
- `after-idle-1945-05-08-1280.png` and `after-outage-1969-07-20-1280.png` (extra)

### Tests added

`app/reading/[id]/reading-text-width.test.ts` (7 tests). The repo's render tests don't do layout (R5), so this guards the CSS itself:
- `.paragraph`, `.idleText`, `.accuracyNote`, `.disabledNote` and `.unavailableText` have no `max-width` in any of their rules, media queries included;
- `.eventText` has none either;
- the font size and line height of the changed rules are unchanged, at both widths.

### Independence check

The diff touches `reading.module.css` (this sprint's main file) and one rule in `date.module.css` (`.unavailableText`), plus the new test and this handoff. The sprint file names the `date.module.css` overlap: Sprints 50 and 52 edit other rules in that file, so Pipeman merges any textual conflict. Nothing else from Sprint 50 or 52 is touched.

### Known limitations

- **The written state was measured against a stand-in database** with placeholder text, not a real saved reading. The layout path is the real one: the real page, CSS and `ReadingPanel`, with a real stored-row shape. LiveQA's step 1 measures a real one on production.
- **The `before-` outage and idle states weren't captured.** Their rules had the same `46ch` cap as `.accuracyNote`, whose before/after shows the effect.
