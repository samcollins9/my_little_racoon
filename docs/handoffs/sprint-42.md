# Sprint 42 handoff — Strip "(pictured)" notes from event text

## Round 1

**Status:** ready for QA1's gate-1 audit.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (35 test files, 444 tests).

### What changed

| Req | Where | How |
|---|---|---|
| R1 | `lib/events/picture-notes.ts` (new) | `stripPictureNotes(text)`, one exported pure function with no imports. The regex is `/\s*\([^()]*\bpictured\b[^()]*\)/gi`: one parenthesised group with no parentheses inside it, containing the whole word "pictured" in any capitals, plus the whitespace just before it. If nothing matched, it returns the input string itself. Otherwise it collapses runs of spaces and trims. |
| R2 | `app/reading/[id]/ReadingView.tsx` | The "What happened" row renders `stripPictureNotes(event.text)`. The `source` link markup is unchanged. `ReadingView` is shared by `/date/[date]` and `/reading/[id]`. |
| R3 | `lib/llm/horoscope.ts` | Event lines are now `${e.year}: ${stripPictureNotes(e.text)}`. No other prompt text changed. |
| R4 | tests, below | Every row of the table is its own test. |
| R5 | this file | |

### Approach notes

- **Why the whitespace before the note goes, not the whitespace after:** removing the space before is what turns "Foo (pictured), bar" into "Foo, bar" without a separate pass for space-before-punctuation. So the only global tidying is collapsing doubled spaces and trimming the ends. That tidying runs only when a note was actually removed, so text without a note keeps any doubled spaces it already had (there's a test for this).
- **Nested case:** `A (b (pictured) c) d` becomes `A (b c) d`. Only the inner group matches, because `[^()]` stops a match from crossing a parenthesis. The outer group's text is kept.
- **`\b`:** "(unpictured)", "(picturedness)" and "(the picture)" are left alone, and so is "pictured" outside parentheses. All four are tested.
- **Grep for unstripped event text (R2):** `grep -rn "event\.text\|e\.text" app lib`, excluding tests, finds only the two call sites above. `lib/events/wikipedia.ts:98` builds the stored payload and is deliberately untouched (Out of Scope, and Sprint 41's file). `ReadingPanel`'s `note.text` and `HoroscopeReveal`'s `foldedNote.text` are UI status notes, not event text.

### Tests added

- `lib/events/picture-notes.test.ts` (16 tests):
  - the nine table rows;
  - QA1's two hand-check cases: an empty string, and two notes in one string;
  - capital-letter variants;
  - part-word and non-parenthesised near misses;
  - a non-breaking space before the note;
  - a string that is only a note;
  - repeated calls, which checks the global regex doesn't carry `lastIndex` between calls.
- `lib/llm/horoscope.test.ts` (+2):
  - the event lines for a fixture containing "(pictured)" and "(fragment pictured)" have no note and the exact expected lines;
  - the prompt built with a note is byte-for-byte equal (`toBe`) to the prompt built from already-stripped text. That's R3's "rest unchanged".
- `app/reading/[id]/ReadingView.test.tsx` (+3), rendered on the server:
  - the note is gone and the sentence reads cleanly;
  - the `source` link is intact right after the stripped text;
  - "(depicted)" text is unchanged.

### Independence check

The diff touches `lib/events/picture-notes.ts` and its test, `lib/llm/horoscope.ts` and its test, `app/reading/[id]/ReadingView.tsx` and its test, and this file. It doesn't touch `README.md`, `app/page.tsx`, `lib/events/wikipedia.ts` (Sprints 40 and 41), or `reading.module.css` (Dev Team 1's queued fix).

### Known limitations

- **Leftover space after an opening parenthesis:** a note directly after an opening parenthesis, as in `A ((pictured) b)`, leaves `A ( b)`. Nothing in Master Controller's sample has that shape. I left it rather than widen the tidying beyond what Requirement 1 asks for.
- **A note at the very start, followed by punctuation:** `(pictured), x` gives `, x`. Same reasoning.
- **No browser check of a deployed page:** the page change is checked by server-rendered markup only. This worktree has no `.env.local`, and I didn't copy the secrets in. LiveQA steps 1–3 cover the deployed page.

### Questions for QA1

- Is the global double-space collapse acceptable once a note has been removed? It can also tidy a doubled space somewhere else in the same event's text. Requirement 1 reads that way, but it's a judgement call.
