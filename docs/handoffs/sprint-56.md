# Sprint 56 handoff — Reveal and fold become one toggle; Copy link removed

## Round 1

**Status:** ready for QA1's gate-1 audit.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (56 test files, 640 tests).

### Technique (R2: "say which")

**Kept native `<details>`/`<summary>`, but the `<details>` now holds only its `<summary>`.**
- The disclosure is the first item of the reading's footer row.
- The paragraphs moved out of it, to just before the footer row.
- Open-only footer controls (the date link, or "Try again") sit after it in the row.
- CSS hides the paragraphs and those controls while the details is closed, keyed on its state with `:has()`.

Why: `<summary>` has to be the first child of `<details>`. So a disclosure that also contains the text always puts the toggle above it, in DOM, focus and reading order alike. The two alternatives each fail a requirement:
- **A visual reorder** (`order`, or `flex-direction: column-reverse` on the details) leaves the toggle first in focus order and reading order. R3 rules that out.
- **A checkbox** can't be toggled with Enter (R1), and exposes "checked" rather than "expanded" (R2).

Markup, in order:

```
.revealPanel (display: contents)
  .readingHeader       "not revealed yet" (.whenFolded) / "revealed" (.whenRevealed)
  .whenFolded          IdleBlock
  #saved-horoscope-text.writtenBlock.revealText    the paragraphs
  .readingFooter
    details.reveal[open?]
      summary.revealSummary[aria-controls=saved-horoscope-text]
        span.castButton > span.labelFolded "Reveal the horoscope" + span.labelOpen "Fold the horoscope away"
    .revealControls    (display: contents) the date link, or "Try again"; absent on the date page
    p                  the note: aspects, error, or disabled
```

What that gives:
- **R1:** one toggle, the first control in the footer row in both states, styled `.castButton` with its hover and focus states. Only the current state's label is rendered; the other is `display: none`, so it's also outside the accessible name.
- **R2:** opening and closing is the browser's own `<details>` behaviour: no request, no reload, no URL change, no JavaScript. The `<summary>` exposes expanded or collapsed, and names the text in `aria-controls`. The saved text is in the HTML in both states.
- **R3:** DOM order, focus order and visual order all agree when open: paragraphs, then the toggle, then the date link on `/reading/[id]`, then the note. Nothing in the paragraphs is focusable.

### What changed

| Req | Where | How |
|---|---|---|
| R1–R3 | `app/reading/[id]/HoroscopeReveal.tsx` | `SavedHoroscope` was rebuilt as above. Its props changed: `foldedNote` + `footer` became `note` + `controls?`. There's a new export, `SAVED_TEXT_ID`. The old small fold control above the text (`.revealFold`) and the old folded footer inside the summary (`.revealFolded`, with its aria-hidden duplicate note) are gone. The note is now one readable element, outside the summary, in both states. |
| R1, R5 | `app/reading/[id]/reading.module.css` | Sprint 33's reveal block was rewritten (details in the "CSS" section below). Sprint 38's folded-`<details>` sticky workaround is removed: with `.revealPanel` still `display: contents`, the footer row is a direct flex item of the reading section, or of its form, in both states, so Sprint 38's existing sticky `.readingFooter` rule applies to it unchanged. |
| R4 | `ReadingPanel.tsx` | `SavedHoroscope` gets `note`, and `controls`: "Try again" after a failed generation, otherwise the date link. Header status, IdleBlock, `?revealed` and the rise animation are untouched (their tests pass unchanged). |
| R6 | `ReadingPanel.tsx`, `reading.module.css` | Removed: `CopyLinkButton` with its `useState` and clipboard code, the `.mobileWrittenFooter` wrapper and CSS, and the mobile-only duplicate of the date link. `DateLinks` became `DateLink`: `null` on the date page, and one link at both widths on `/reading/[id]`. `useState` stays, for the existing `justWrote` and `prevPending`. `grep -rn "Copy link\|clipboard" app lib` finds nothing (exit 1). That includes one stale comment in `reading.module.css` I reworded, and my own test, which uses a pattern rather than the literal. |
| R7 | — | The unsaved generate button, "Revealing…", "Try again" and `DisabledReadingSection` without a horoscope are unchanged. |
| R7 | `app/reading/[id]/ReadingView.tsx` (**5 lines**) | `DisabledReadingSection`'s saved-horoscope call now passes `note` instead of `foldedNote` + `footer`, because the footer row is now `SavedHoroscope`'s own. **This is Sprint 55's file.** The sprint said to flag it before editing: I raised it, and the user approved ("Proceed, edit ReadingView") on 26 Nov 2026. The edit is in a different function from Sprint 55's heading change. Sprint 55 was already shipped, and its code is on this branch's base (`bd51b50`). |
| R8 | tests | Below. |
| R9 | this file, `docs/handoffs/sprint-56/` | |

### CSS (`reading.module.css`)

- **Kept:** `.revealPanel { display: contents }` and `.whenRevealed`. Status and IdleBlock switching now key on `:has(.reveal[open])`, since the details is no longer a direct child.
- **New, folded:** `.revealPanel:has(.reveal:not([open])) .revealText, … .revealControls { display: none }`. It's keyed on the *closed* state, so a browser without `:has()` shows the text always rather than never.
- **New:** `.revealControls { display: contents }`, so the controls are footer-row items in their own right.
- **New:** `.reveal[open] .labelFolded, .reveal:not([open]) .labelOpen { display: none }`.
- **New:** `.revealSummary { display: flex }`. That makes the button-styled span a flex item, which sizes it like the unsaved `<button>`; see Measurements.
- **New, phones:** `.reveal { flex: 1; min-width: 0 }`. The toggle takes the whole row folded, or half the row beside the date link, the same as `.castButton`'s existing `flex: 1`.
- **Removed:** `.reveal`'s old desktop flex column, `.revealSummary`'s `margin-top: auto`, `.reveal[open] > .revealSummary`, everything under `.revealFold` and `.revealFolded`, the phone `.reveal:not([open])` sticky rules, and `.mobileWrittenFooter`.
- **Reworded:** the stale comment in the phone section header that mentioned the copy-link button.

### Tests (R8)

**New:**
- **`app/reading/[id]/toggle-pages.test.ts`** (18). It runs through the real page components, on both `/date/[date]` and `/reading/[id]`, server-rendered, which is what a no-JS visitor gets:
  - folded, exactly one `<summary>`, whose visible label is "Reveal the horoscope", first in the footer row, with the text hidden;
  - open (`?revealed=1`), the same single summary reading "Fold the horoscope away", after the paragraphs; the fold label appears nowhere else; it carries `aria-controls`;
  - the Tab order inside the reading section, open: the toggle, then "Go to this date" on `/reading/[id]`; only the toggle on the date page;
  - the note in both states;
  - the date link present after the toggle when open and hidden when folded (`/reading/[id]`); the date page's open footer holding only the toggle and the note;
  - no copy-link control in either state;
  - CSS guards: one label at a time; the folded hiding rule; the footer row sticky on phones and nothing making the details sticky; the phone `flex: 1` and 44px minimum; `.revealSummary { display: flex }`; the `.mobileWrittenFooter`, `.revealFold` and `.revealFolded` CSS gone.
- **`app/reading/[id]/reveal-test-support.ts`** (new helper, not a suite): `visibleWhen(html, "folded" | "open")` drops the elements reading.module.css hides in each state, with their whole subtree. Both test files use it to assert what a sighted visitor sees.

**Updated** (the old fold position and the Copy link):
- `ReadingPanel.test.ts`:
  - "links to the reading's own date page, **one link** for desktop and mobile" (it was two hrefs);
  - "keeps every saved paragraph in the HTML, **before the toggle**, hidden while folded" (it was "inside the disclosure, after the summary"), now also asserting that the details holds only its summary;
  - "the note sits beside the toggle, **outside the summary**" (it was the aria-hidden note inside the summary), with one note element and no `aria-hidden`;
  - "the same toggle carries the fold-back label … and names the text it controls" (it was "offers a fold-back control once open");
  - "revealed: … already open, with the text shown" (it was "with the text inside it");
  - "with a saved horoscope: … 'Try again' sits in its unfolded footer, **after the toggle**";
  - the disabled saved-horoscope case, now checking the text block and that the note follows the toggle;
  - `REVEAL_CONTROL` now allows the label's own inner span.
- `reveal-landing.test.ts`: "the plain link with a saved horoscope opens folded, with the text **in the HTML but hidden**" (it was "inside the disclosure").

**Sprint 38:** no existing test covered the reveal's sticky rule, so there was nothing to update. The new CSS guard above covers R5.

**Unchanged and passing:** the rest of `reveal-landing.test.ts` (R4 `?revealed`), the rise and `justWrote` behaviour, `accuracy-pages.test.ts`, and the disabled-state tests.

### Manual check in a browser (local build)

How it was run:
- `next build` and `next start`, in headless Chromium (Playwright's `chrome-headless-shell` 1248) over the DevTools protocol.
- A local, read-only stand-in for Supabase's RPC endpoint (a scratch script, not committed) serves one saved, matched reading for 1969-07-20, by date and by id.
- **The horoscope text in the screenshots is placeholder text, labelled as such.** It's long, so a phone has to scroll through it.
- Raw results are in `docs/handoffs/sprint-56/probe.json`.

| Check | `/date/1969-07-20` | `/reading/<id>` |
|---|---|---|
| Folded: one summary, label "Reveal the horoscope", text hidden | yes, 1280 and 390 | yes, 1280 and 390 |
| Tab from the top reaches the toggle | 7th stop | 5th stop |
| Enter opens: label "Fold the horoscope away", text shown, toggle below the text | yes | yes |
| Tab after the toggle | leaves the reading section (no other control in it) | "Go to this date", in the reading section |
| Shift+Tab back, then Space folds | yes | yes |
| Click opens, and click again folds | yes | yes |
| JavaScript disabled (`Emulation.setScriptExecutionDisabled`): click opens, and click folds again | yes, 1280 and 390 | yes, 1280 and 390 |
| Copy-link text anywhere on the page | none | none |
| 390, open, scrolled to mid-text: footer stuck to the screen's bottom | footer 775–844 of 844 | footer 747–844 of 844 |
| 390, folded, reading section in view: the toggle bar sticks | see the next paragraph | footer 775–844 of 844 at load |
| Phone touch target | 326 × 44 | 326 × 44 folded; 140 × 72 open, beside the date link |
| `scrollWidth` equals `innerWidth` | yes | yes |

**The date page on a phone, folded, at page load:** the footer measured 788–857, 13px past the bottom of the screen. That's the existing Sprint 38 behaviour, not a regression. A sticky element can't rise above its containing block's top: the form starts at 788, because the reading section begins near the bottom of the screen. The unsaved state, `/date/1989-11-09`, measures identically (788–857, same chain).

### Measurements: does the folded toggle look like the unsaved button? (Sprint 33, R2; Sprint 56, R1)

Every computed style matches: font, size, letter-spacing, case, colour, border, radius, padding, alignment, background and cursor. Only the size differs, and only at 1280:

| | Toggle (span in the summary) | Unsaved `<button>` | Production today (folded summary) |
|---|---|---|---|
| 1280 | **182 × 52**, two-line label; note 296 × 34 | 184 × 52, two-line label; note 294 × 34 | 184 × 52; note 318 × 17 (one line) |
| 390 | 326 × 44 | 326 × 44 | — |

- My first build was 98 × 58: the inline span in a block summary shrank to its narrowest. `.revealSummary { display: flex }` fixed that.
- The remaining 2px is how flex shrinking weighs items: the `<details>` counts the span's padding and border as its own content, and a `<button>` doesn't.
- For comparison, production's folded toggle today (read from the live site, read-only) is 184 wide, but its note sits on one line, while the unsaved note wraps to two. So the folded and unsaved states aren't pixel-identical today either. This build is closer to the unsaved state than today's is.

### Screenshots (`docs/handoffs/sprint-56/`)

- 1280: `date-1280-folded.png`, `date-1280-open.png`, `reading-1280-folded.png`, `reading-1280-open.png`
- 390: `date-390-folded.png`, `date-390-open.png`, `reading-390-folded.png`, `reading-390-open.png`
- 390, scrolled mid-horoscope, with the sticky toggle: `date-390-open-mid-text-sticky.png`, `reading-390-open-mid-text-sticky.png`
- 390, JavaScript disabled, opened by click: `date-390-open-no-js.png`

In `reading-390-open-mid-text-sticky.png`, "Go to this date" shows its hover border. That's because the emulated mouse was still where the earlier click landed, which is now over the link, not a focus or style change.

### Independence check

- **Files:** `HoroscopeReveal.tsx`, `ReadingPanel.tsx` and `reading.module.css` are the sprint's own files. The new and updated tests, and this handoff, are also mine.
- **The one overlap:** 5 lines of `ReadingView.tsx` (`DisabledReadingSection`), flagged and approved as described above. Sprint 55's heading change is a different function in that file.
- **Not touched:** `display.ts` and `lib/date-page/accuracy.ts` (Sprint 55).

### Known limitations

- **Screen-reader reading order puts the text before the toggle.** That follows from R1 and R3, toggle at the bottom: a screen-reader user who opens it at the toggle finds the new text *above* their position. The `<summary>`'s `aria-controls` points to it, which some screen readers use to jump there.
- **Find-in-page doesn't reach the folded text.** It's `display: none` while folded. Chrome's native `<details>` content could be found and auto-expanded (`hidden="until-found"` behaviour), but the text is no longer inside the `<details>`.
- **A browser without `:has()`** shows the text, and the open-only controls, all the time. The toggle still changes its label there.
- **`/reading/[id]` open at 1280:** "Fold the horoscope away" wraps to three lines (142 × 66) beside the two-line "Go to this date". Both are vertically centred in the row.
- **Three lint warnings, not from this sprint:** `@typescript-eslint/no-unused-expressions` in `docs/handoffs/sprint-45/cdp45.mjs`, `cdp45-overflow.mjs` and `docs/handoffs/sprint-46/cdp46.mjs`. QA1's notes on Sprints 51 and 53 record them as "Still UNOWNED, with Master Controller". No decision accepting them is on record, so I'm not calling them known-and-accepted. They're unowned, and they're routed to Master Controller.

### Questions for QA1

- Is the 182 vs 184 width at 1280 acceptable under R1's "styled exactly like"? All styles match. Only the flex-shrink result differs, by 2px, and today's production differs from the unsaved state too, in its note wrap.
- Is the screen-reader order, text before toggle, an acceptable consequence of R1 and R3? `aria-controls` points to the text.
