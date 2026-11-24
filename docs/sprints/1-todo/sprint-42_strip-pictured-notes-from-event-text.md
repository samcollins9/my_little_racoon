---
id: 42
title: "Strip \"(pictured)\" notes from event text"
epic: "Date pages (PRD v3)"
status: todo
created: 2026-11-24T00:32:11+00:00
---

# Master Controller Sprint Definition — Sprint 42

**Epic:** Date pages (PRD v3)
**Sprint Objective:** Event descriptions no longer contain Wikipedia's "(pictured)" image notes, either on the page or in the text sent to the model.

### Context

Wikipedia's "On this day" text marks which item the day's picture shows: "(pictured)", "(fragment pictured)", "(signing pictured)". We never show Wikipedia's images, so the note points at nothing, both for the visitor and for the model writing the horoscope. The user asked on 24 Nov 2026 for it to be removed.

**What's been measured (24 Nov 2026).** Master Controller sampled the live feed (`onthisday/selected`) for six days: 01-15, 03-08, 05-09, 07-04, 11-23 and 12-16. It found 13 parenthesised notes containing "pictured": eleven "(pictured)", one "(fragment pictured)" and one "(signing pictured)". This is a sample, not a census. Other forms the user named, such as "(pictured left)", weren't seen in it, but must still be handled (Requirement 1).

**Why the display and the prompt are changed, not stored data:** the stored `events` payload stays as Wikipedia gave it, so old rows and new rows behave the same and nothing needs migrating. That also keeps this sprint out of `lib/events/wikipedia.ts`, which Sprint 41 is changing.

### Requirements

1. **One pure helper.** A single pure function removes, from an event's text, every parenthesised group that contains the whole word "pictured" (in any capital letters) and nothing in nested parentheses, along with the whitespace just before it. It then tidies the result:
   - no doubled spaces;
   - no space left before the punctuation that follows ("Foo (pictured), bar" becomes "Foo, bar");
   - no leading or trailing whitespace.

   Text with no such group comes back unchanged, exactly. A group without the whole word, such as "(depicted)" or "(the picture)", is left alone. The regex is Dev Team's to write; the cases in Requirement 4 define it.
2. **Applied on the page.** Event text in the "What happened" column is shown through the helper. This covers both `/date/[date]` and `/reading/[id]`, which share `ReadingView`.
3. **Applied in the prompt.** The event lines built in `lib/llm/horoscope.ts` (`${e.year}: ${e.text}`) use the helper. No other prompt text changes.
4. **Tests.** A unit test covers each case below. The input and expected output are given for each:

   | Input | Expected output |
   |---|---|
   | `Foo (pictured) did X.` | `Foo did X.` |
   | `Foo (pictured), bar` | `Foo, bar` |
   | `The fragment (fragment pictured) was found` | `The fragment was found` |
   | `A (signing pictured) and B` | `A and B` |
   | `X (pictured left) and Y (pictured right)` | `X and Y` |
   | `(Pictured) The treaty` | `The treaty` |
   | `Painting (depicted) shown` | unchanged |
   | `A (b (pictured) c) d` | handled without throwing; the expected output is whatever the tests define |
   | text with no "pictured" | identical, the same string |

   There is also a test that the prompt's event lines contain no "pictured" note for a fixture that includes one.
5. **Handoff.** The handoff follows CLAUDE.md's committed-handoff standard: `docs/handoffs/sprint-42.md`, with `npm run verify`'s final line and `exit=0`.

### Acceptance Criteria

- **R1:** The helper is one exported function with no imports from React or the network. QA1 reads the regex against the table in Requirement 4, and checks two more cases by hand: an empty string, and a string with two notes.
- **R2:** `ReadingView`'s event text goes through the helper. Grep finds no other place event text is rendered unstripped. The `source` link is untouched.
- **R3:** `horoscope.ts`'s event lines use the helper. The rest of the prompt is byte-for-byte unchanged in its existing tests.
- **R4:** Every row of the table is a test, and `npm run verify` ends with `VERIFY PASS … exit=0`.
- **R5:** QA1 reads `docs/handoffs/sprint-42.md` at the audited commit.

**LiveQA (the deployed app):**
1. Find a date whose feed has a "(pictured)" event, and open it. A future date shows the fallback list, which usually includes the pictured event; check the feed for that day to confirm.
   - The note is gone from "What happened".
   - The sentence still reads cleanly, with no doubled spaces and no space before a comma.
2. Do the same for a "(… pictured)" variant, if one can be found: try several days and record which.
3. Open `/reading/<id>` for a saved reading whose stored events contain "(pictured)", if one exists. The user can supply one using the query under Human Prerequisites. Check that the note is gone there too.
4. Don't write a horoscope just to check the prompt. The prompt change is covered by Requirement 4's test and by QA1.

### Out of Scope

- **Changing stored `events` payloads,** for old or new rows. The reason is in Context.
- **Other Wikipedia notes,** such as "(illustrated)" or footnote markers. Add them later if they turn up.
- **Showing Wikipedia's images.**

### Dependencies

- **Blocks:** nothing.
- **Blocked by:** nothing in sequence. It must not touch `lib/events/wikipedia.ts` (Sprint 41's file) or `README.md` (Sprints 40 and 41).
- **External:** none beyond the existing Wikipedia feed.

### Human Prerequisites

- **Optional, for LiveQA step 3:** the user can supply a reading id whose stored events contain "pictured". Run this in the Supabase SQL editor:
  `select id, event_date from readings where events::text ilike '%pictured%' and horoscope is not null limit 3;`
  If you don't, LiveQA records step 3 as not done, and the shared `ReadingView` path carries it.

### Team Assignments

- **Dev Team 2:** all of it, in its own worktree. Run `/sprint-worktree 42` before building. It runs in parallel with Dev Team 1's Sprints 40 and 41. Its files are `ReadingView.tsx`, `lib/llm/horoscope.ts`, a new helper and its tests; Sprints 40 and 41 touch `README.md`, `app/page.tsx` and `lib/events/wikipedia.ts`. No file is shared.
- **Dev Team 1:** not assigned (Sprints 40 and 41).

### Risks & Mitigations

- **The pattern is too broad, and eats real text.** — It's limited to whole-word "pictured" inside one set of parentheses, and "(depicted)" is a test case.
- **Dev Team 1's queued halo and long-word fix also touches `app/reading/[id]/`.** It's in `reading.module.css` only; this sprint doesn't touch that file. — If this sprint ends up needing CSS, coordinate through Master Controller rather than editing it.
- **Dev Team 2's branch has to reach main.** — Follow CLAUDE.md's worktree return path when it closes: commit on `devteam2/sprint-42`, then hand off to Pipeman with the branch name and commit.
