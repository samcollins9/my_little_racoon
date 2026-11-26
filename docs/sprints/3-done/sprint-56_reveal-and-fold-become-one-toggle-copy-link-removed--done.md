---
id: 56
title: "Reveal and fold become one toggle; Copy link removed"
epic: "Date pages (PRD v3)"
status: done
created: 2026-11-26T15:59:30+00:00
---

# Master Controller Sprint Definition — Sprint 56

**Epic:** Date pages (PRD v3)
**Sprint Objective:** A saved horoscope opens and closes with one button, in one place at the bottom of the reading. It reads "Reveal the horoscope" when folded and "Fold the horoscope away" when open. The old "Copy link" button is removed.

### Context

Sprint 33 put a saved horoscope behind a native `<details>`/`<summary>` (`SavedHoroscope` in `app/reading/[id]/HoroscopeReveal.tsx`).
- **Folded:** the summary looks like the generate button. A `.castButton` reading "Reveal the horoscope" sits in the footer row, with the aspects note.
- **Open:** the same summary becomes a small text-style control, "Fold the horoscope away" (`.revealFold`), **above** the paragraphs. The footer comes after the text. On `/reading/[id]` it holds the link to the reading's date page. On phones only, it also holds a "Copy link" button (`CopyLinkButton` in `ReadingPanel.tsx`, from Sprint 20's mobile frame 4).

On 26 Nov 2026 the user asked for the open state to work like a toggle:
- the fold control moves to the bottom, where "Reveal the horoscope" sits, and takes the same button style;
- its text changes with the state;
- "Copy link" is removed, as a leftover of an older design.

### Requirements

1. **One toggle, one place.** The control that opens and closes a saved horoscope sits in the reading's footer row in both states, below the paragraphs when open. It's the first control in that row, styled exactly like "Reveal the horoscope" (`.castButton`, with its hover and focus states).
   - Folded, it reads "Reveal the horoscope" (`REVEAL_LABEL`).
   - Open, it reads "Fold the horoscope away" (`FOLD_LABEL`).
   - Clicking it, or pressing Enter or Space, switches between the two.
   - The small text-style fold control above the paragraphs is gone.
2. **Native, and works without JavaScript.** Sprint 33's guarantees hold. Opening and closing needs no request, no reload, no URL change and no JavaScript. The control exposes its expanded or collapsed state to assistive technology. The saved text stays in the HTML. Keep `<details>`/`<summary>`, or use something with the same guarantees, and say which in the handoff.
3. **Focus order matches what's on screen.** When open, Tab reaches the toggle after the paragraphs, at its position in the footer row, and then any other footer controls (the date-page link on `/reading/[id]`). A reorder that puts the toggle visually last but leaves it first in focus order, behind later controls on screen, doesn't meet R3. If native `<summary>` placement makes this impossible, stop and report it rather than settling for a mismatch.
4. **The rest of the footer stays.**
   - When open, the footer still carries the aspects note (or the error note, with "Try again", after a failed generation).
   - On `/reading/[id]` it still carries the link to the reading's date page, on desktop and phones.
   - The header status ("not revealed yet" / "revealed") and the IdleBlock behave as they do today.
   - Sprint 33's R4 `?revealed` landing still opens the horoscope.
   - The rise animation after a generation still runs.
5. **Phones keep Sprint 38's sticky behaviour.**
   - Folded, the toggle's bar sticks to the bottom of the screen, as today.
   - Open, the footer sticks as today, so "Fold the horoscope away" stays reachable while reading a long horoscope.
   - The touch target clears 44px.
6. **Remove Copy link.** Remove `CopyLinkButton`, its `useState`/clipboard code, and its CSS (for example `.mobileWrittenFooter`, if only it used it), from both routes.
   - On the date page, the open footer then holds only the toggle and the note.
   - On `/reading/[id]` on phones, it holds the toggle, the date-page link and the note.
   - Remove any wrapper that's now empty.
   - grep finds no "Copy link" or `clipboard` in `app/` or `lib/`.
7. **The unsaved and disabled states are unchanged.** The generate button with no saved horoscope ("Reveal the horoscope" / "Revealing…" / "Try again"), and `DisabledReadingSection`, stay as they are, apart from sharing the new open-state layout where they already use `SavedHoroscope`.
8. **Tests.** Render tests on both routes cover:
   - folded: one toggle reading "Reveal the horoscope";
   - open (`revealed`): one toggle reading "Fold the horoscope away", placed after the paragraphs, with no other fold control;
   - no "Copy link";
   - the date-page link still present on `/reading/[id]`.

   Update Sprint 33's and Sprint 38's tests that asserted the old fold position, and list them in the handoff.
9. **Handoff.** Follow CLAUDE.md's committed-handoff standard: `docs/handoffs/sprint-56.md`, with `npm run verify`'s final line including `exit=0`. Include screenshots under `docs/handoffs/sprint-56/`, at 1280px and 390px, of a saved horoscope folded and open, on `/date/1969-07-20` and on `/reading/<id>`. Include a 390px shot scrolled mid-horoscope that shows the sticky toggle.
10. **Space between "The reading" heading and the open text** (amended 26 Nov 2026, after `/sprint-ship`, from the user's own review of the deployed sprint). When the horoscope is open, its first paragraph sits directly under the heading line. The "fold away" control that used to sit there is gone, and it appears to have been what provided the space, though that's not yet confirmed.
    - The vertical distance from the bottom of the "The reading" header row to the top of the first paragraph's text matches the distance in "What happened": from the bottom of its header row to the top of its first event's text. It matches within 2px, at 1280px and at 390px.
    - The same holds for the folded IdleBlock text, and for Sprint 39's accuracy note, if either is off now. Otherwise they stay as they are.
    - Only spacing changes. Nothing else about the toggle, the text or the header changes.
    - Record both distances, before and after, in the round's handoff section, along with the CSS changed.

### Acceptance Criteria

- **R1, R6 and R8:** the render tests pass. QA1 confirms there's exactly one toggle element per saved horoscope, and that `CopyLinkButton` and its CSS are gone.
- **R2:** QA1 confirms the mechanism works without JavaScript and exposes the expanded state.
- **R3:** QA1 confirms from the markup and CSS that DOM or focus order matches the visual order in the open state.
- **R4 and R7:** the existing reveal-landing, rise and disabled-state tests pass.
- **R10:** QA1 confirms the fix is spacing-only. The handoff's before/after distances match within 2px at both widths.
- **R9:** QA1 reads `docs/handoffs/sprint-56.md` at the audited commit, finds `VERIFY PASS … exit=0`, and opens the screenshots.

**LiveQA (the deployed app):**
1. `/date/1969-07-20` at 1280px: folded, "Reveal the horoscope" sits at the bottom of the reading. Click it. The text opens, and the same button, now reading "Fold the horoscope away" in the same style, sits below the text. Click it again, and it folds and reads "Reveal the horoscope" again.
2. The same with the keyboard only: Tab to it, press Enter, and Tab moves on to any footer link after it. Press Space to fold it.
3. At 390px: no "Copy link" anywhere. Folded, the toggle bar sticks to the bottom of the screen. Open, scroll mid-text, and the toggle stays reachable at the bottom.
4. `/reading/<id>` at both widths: the toggle works the same way, and the date-page link is still in the open footer.
5. With JavaScript disabled, steps 1 and 3 still work.
6. A date with no saved horoscope still shows the generate button, unchanged. Don't generate one. Check the markup only.
7. With a horoscope open, at 1280px and 390px, measure the gap from "The reading" header row to the first paragraph's text, and the gap from "What happened" header row to its first event's text. They match within 2px (R10).

### Out of Scope

- **Changing the labels' wording.**
- **Changing the generate flow, or the Sprint 39 messages.**
- **A replacement share or copy feature.** The address bar is the copy path, as it always was on desktop.

### Dependencies

- **Blocks:** nothing.
- **Blocked by:** nothing. Sprint 55 (in progress, Dev Team 1) edits `display.ts`, `lib/date-page/accuracy.ts` and the heading in `ReadingView.tsx`. This sprint's files are `HoroscopeReveal.tsx`, `ReadingPanel.tsx`, `reading.module.css` and the tests for them. The two don't share files, as far as Master Controller can see from the code on 26 Nov 2026.
- **External:** none.

### Human Prerequisites

None.

### Team Assignments

- **Dev Team 2:** all of it, in its own worktree (`/sprint-worktree 56`), in parallel with Dev Team 1's Sprint 55. If the build turns out to need `ReadingView.tsx`, flag it to Master Controller before editing, since Sprint 55 is in that file.
- **Dev Team 1:** not assigned, while it works on Sprint 55.

### Risks & Mitigations

- **`<summary>` must be the first child of `<details>`.** So "toggle at the bottom" can't simply be a DOM move. — R2 and R3 together set the bar: no JavaScript, and focus order matching the visual order. Dev Team chooses the technique and reports it, or stops under R3.
- **Sprint 38's sticky bar regresses.** — R5, and LiveQA's step 3.
- **A landing with `?revealed` opens but shows the wrong label.** — R4's existing tests, plus R8's open-state test.
