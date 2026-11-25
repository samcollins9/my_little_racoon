# Sprint 51 handoff — This-exact-date events drop the year column

## Round 1

**Status:** ready for QA1's gate-1 audit.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (53 test files, 601 tests).

### What changed

| Req | Where | How |
|---|---|---|
| R1 | `app/reading/[id]/ReadingView.tsx` | `const matched = hasMatchedEvents(events)`. On a matched list, each row gets `${styles.eventRow} ${styles.eventRowSingle}` and renders **no** `EventYear`: `{matched ? null : <EventYear … />}`. The element is absent from the DOM, not hidden. The description `<span>` is the row's only child. Both routes render their events through `ReadingView`, so this covers `/date/[date]` and `/reading/[id]`. |
| R2 | same | Unmatched rows render exactly as before: `EventYear`, its links and the plain-text years. `EventYear` lost its `linked` prop. It used to be `!hasMatchedEvents(events)`, and since `EventYear` now renders only on unmatched lists, that was always `true`. Its behaviour is unchanged: a link when `linkableEventDate` gives a target, plain text otherwise. Sprint 39's tests (`accuracy-pages.test.ts`) pass with no change. |
| R3 | `app/reading/[id]/reading.module.css` | One new rule, `.eventRow.eventRowSingle { grid-template-columns: 1fr; }`, and nothing else in the CSS changed. The padding, divider, gap and `.eventText` styles are untouched. The two-class selector is deliberate: the phone breakpoint's single-class `.eventRow { grid-template-columns: 52px 1fr; }` comes later in the file, so a single-class `.eventRowSingle` would lose to it on phones. With two classes it wins at both widths without a second copy in the media query. |
| R4 | `ReadingView.tsx` | The choice reads `hasMatchedEvents`, the same function as the "this exact date" status label (`eventsStatusLabel`). No CSS selector guesses from content. |
| R5 | `app/reading/[id]/event-rows-pages.test.ts` (new) | Covered below. |
| R6 | this file, `docs/handoffs/sprint-51/` | |

### Tests added (`event-rows-pages.test.ts`, 6 tests, through the real page components)

- **`/date/[date]` matched** (1969-07-20, from the Wikipedia double):
  - every row is `eventRow eventRowSingle`;
  - no `eventYear` in any row, and each row starts with `<span class="eventText">`;
  - the descriptions are in order;
  - the "this exact date" status shows;
  - Sprint 42's "(pictured)" stripping and the `(source)` link are unchanged, checked against the exact markup.
- **`/date/[date]` unmatched:** rows are plain `eventRow`. The first child is the year: a link to `/date/1976-08-21` where linkable, and a plain `<span>` for 1152, which the date page can't show.
- **`/reading/[id]` matched** (stored row): the single-column list, with a source link.
- **`/reading/[id]` unmatched** (stored row): the year column. Links use the row's own month and day (`/date/1933-03-05`), and 1600 stays plain.
- **R4 strictness:** a stored `matchedYear: "true"` (a string) keeps the year column, the same as `hasMatchedEvents`.
- **R3 CSS:** the `.eventRow.eventRowSingle` rule's whole body is `grid-template-columns: 1fr;`, and `eventRowSingle` appears exactly once in the stylesheet.

### Screenshots (`docs/handoffs/sprint-51/`)

How they were taken:
- Locally, with `next build` and `next start`, using placeholder Supabase values (an unreachable database), with Wikipedia live.
- In headless Chromium (Playwright's cached `chrome-headless-shell` 1248) over the DevTools protocol.
- Each one is clipped to the "What happened" section.

| File | Shows |
|---|---|
| `matched-1969-07-20-1280.png` | "this exact date", one row, description only, full width |
| `matched-1969-07-20-390.png` | the same at 390×844 (mobile emulation) |
| `unmatched-1950-03-15-1280.png` | "on this day, other years", 5 rows with linked years, for comparison |
| `unmatched-1950-03-15-390.png` | the same at 390 (extra, not required) |

Measurements, in `probe.json`:
- **Matched:** `yearElements: 0` and `gridTemplateColumns` a single track at both widths (494px at 1280, 326px at 390). The text's left edge is at the row's left edge (`textLeftOffset: 0`), and the text width equals the row width.
- **Unmatched:** `62px 416px` at 1280 and `52px 262px` at 390, with 5 year links, as before.
- **Unchanged in both:** row padding (13px at 1280, 11px at 390) and the bottom border are identical between matched and unmatched. `scrollWidth` equals `innerWidth`.

### Independence check

The diff touches `ReadingView.tsx` and `reading.module.css`, which are this sprint's own files per the Dependencies section, plus the new test, this handoff and its screenshots. Nothing in `app/date/[date]/` (Sprint 50), and none of Sprint 49's files (`page.tsx` for dates and readings, `layout.tsx`, `not-found.tsx`, `reading/[id]/load.ts`, `lib/site-title.ts`).

### Known limitations

- **No live data checked locally.** There was no `.env.local`, so I didn't check `/reading/<id>` against a real saved reading. The stored-row cases are covered by the page tests, and LiveQA's step 3 checks one on production.
- **The year still appears in a link's accessible name for unmatched lists** ("Go to 9 May 1976"), as before. That's R2's "unchanged", not a gap.

### Questions for QA1

- Removing `EventYear`'s `linked` prop is a small cleanup that this change made possible: the prop would always be `true`. If you'd rather it stayed for a smaller diff, say so.
