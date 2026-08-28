---
id: 24
title: "Step labels and flow indicator"
epic: "Reading Design"
status: in_progress
created: 2026-08-28T13:57:15+00:00
---

# Master Controller Sprint Definition — Sprint 24

**Epic:** Reading Design
**Sprint Objective:** Make the three actions that lead to a horoscope legible as one
ordered sequence, by renaming them for their destination and adding a server-derived
progress indicator across `/chart` and `/reading/[id]`.

### Context

The product is three steps — cast a chart, see it drawn out alongside what happened
that day, then have a horoscope written — but nothing on screen says so. The three
buttons are named for what the code does rather than for what the visitor gets, and
they borrow three unrelated metaphors: `"Cast"` (astrological jargon, bare verb),
`"Save this reading"` (filing), `"Read the chart"` (jargon again, ambiguous about who
does the reading). A first-time visitor cannot tell these are stages of one journey.

The most damaging of the three is `"Save this reading"`. It is the doorway to the
entire second step — the constellation, the balance grids, the "What happened" events
— but it is labelled as a storage action. A visitor who wants to *see the result* has
every reason to avoid a button marked Save. We are most likely losing people at the
exact step where the product becomes interesting.

Underneath the labels sits a vocabulary collision that a rename alone would not fix.
On `/chart`, `"Save this reading"` calls the **chart** a reading. On `/reading/[id]`,
`"The reading"` means specifically the **horoscope text** — the panel's status reads
`not read yet` / `writing` / `written`. One word, two referents, one journey. This
sprint settles it: **chart** = the computed positions, **reading** = the saved,
linkable page of chart plus events, **horoscope** = the generated text.

### Requirements

1. **The three action labels are renamed** to name their destination, not the
   implementation:
   - `app/chart/page.tsx`, date form submit: `"Cast"` → `"Cast the chart"`
   - `app/chart/page.tsx`, save form submit: `"Save this reading"` → `"See the full reading"`
   - `app/reading/[id]/ReadingPanel.tsx`, idle generate: `"Read the chart"` → `"Write the horoscope"`

   Plain verbs, **no step numbers in the button labels** — R2's indicator owns the
   numbering, and stating it twice on screen is what this sprint is trying to avoid.

2. **A flow indicator component renders on both routes**, showing three steps —
   chart, reading, horoscope — with each marked done, current, or ahead. It has four
   states, because steps 1 and 2 both live on `/chart`:

   | Route and condition | Indicator state |
   |---|---|
   | `/chart`, no date submitted | 1 current, 2 and 3 ahead |
   | `/chart?date=…`, positions rendered | 1 done, 2 current, 3 ahead |
   | `/reading/[id]`, `horoscope` null | 1 and 2 done, 3 current |
   | `/reading/[id]`, `horoscope` present | all three done |

3. **The indicator's state is derived server-side and introduces no client state.**
   On `/chart` it follows from `dateParam` / `positions`; on `/reading/[id]` from
   `reading.horoscope`. `app/chart/page.tsx` **stays a server component** — Sprint 23
   R6 made that call deliberately and this sprint does not reverse it. No `useState`,
   no `useEffect`, no `"use client"` on the indicator.

4. **One implementation, rendered twice — not two copies.** The indicator lives in a
   single shared module imported by both routes. Duplicated markup in each route
   folder is a fail, the two would drift.

5. **The indicator is not added to `app/layout.tsx`.** The root layout currently
   carries fonts and nothing else; a flow indicator there would render on 404s, error
   pages, and every future route. Each page renders it explicitly.

6. **The vocabulary collision is resolved wherever it surfaces**, so the rename does
   not create a fresh inconsistency:
   - `ReadingPanel.tsx` status label `"not read yet"` → `"not written yet"`
   - `IdleBlock`'s copy — currently "…*read the chart* when you want the sky held to
     account…" — is revised so its accented phrase matches the new button label.
   - `"Cast a new reading"` (both the desktop link and the mobile footer link) is
     reviewed against the settled vocabulary and either kept or revised deliberately.
     It sends the visitor back to step 1, so it should read that way.

7. **The following strings are unchanged**, and each for a stated reason:
   - `"Try again"` on the error path. Sprint 22 R5: that is a retry of a failed
     generation, not a step in the sequence.
   - `"Copy link"` / `"Copied"`. Not part of the flow.
   - Every string in `lib/llm/` and `app/chart/actions.ts`. Those are error messages,
     and `lib/llm/generate.test.ts` asserts on two of them.

8. **The indicator uses existing design tokens** from `app/globals.css` (`--om-*`) and
   the established fonts. No new tokens, no new fonts, no new dependency.

9. **Mobile is not broken.** The 900px breakpoint Sprint 20 established still holds;
   the indicator is legible at mobile width rather than overflowing or forcing a
   horizontal scroll.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: all three labels changed exactly as specified; grep for `"Save this reading"`,
  `>Cast<`, and `"Read the chart"` as a button label returns nothing. No digit or
  step number appears in any of the three button labels.
- R2: the indicator renders on both routes, and all four states are reachable from the
  code — specifically, that the `/chart` "1 done, 2 current" state is driven by
  positions being present and not hardcoded to a single state per route.
- R3: **the sprint's most important static check.** No `"use client"` on the indicator,
  no `useState` / `useEffect` introduced anywhere in this diff, and
  `app/chart/page.tsx` still has no `"use client"` directive. If the indicator needed
  client state to work, the design is wrong — fail it.
- R4: one indicator module, imported by both routes. Two near-identical components is
  a fail even if both render correctly.
- R5: `app/layout.tsx` is either untouched or, if touched, does not render the
  indicator.
- R6: `"not read yet"` is gone; `IdleBlock`'s accent phrase matches the new step-3
  button label; the `"Cast a new reading"` decision is visible in the diff or its
  comments rather than left ambiguous.
- R7: `"Try again"`, `"Copy link"`/`"Copied"`, and every `lib/llm/` and
  `app/chart/actions.ts` string are byte-identical to before.
- R8: no new dependency in `package.json`; no new custom property in `globals.css`.
- Sprint 18/19 guarantees intact: escaped horoscope rendering, no markdown library,
  `isSafeExternalUrl` still applied to event URLs, fonts still self-hosted via
  `next/font`.
- `npm run build`, lint, and the full test suite are clean. No existing test asserts
  on these UI strings — confirmed before this sprint was written — so a test failure
  here means something real broke, not a string fixture needing an update.

**LiveQA — live, after Pipeman pushes:**

- Load `/chart` cold: indicator shows step 1 current, steps 2 and 3 ahead. Button
  reads "Cast the chart".
- Submit a date: positions render, indicator advances to step 1 done / step 2 current
  **on the same page**, and the second button reads "See the full reading". This is the
  four-state requirement's real proof and the single most likely thing to be wrong.
- Press "See the full reading": a reading page is reached, and the indicator there
  shows steps 1 and 2 done with step 3 current.
- Press "Write the horoscope": generation still works end to end and persists. **This
  is the sprint's regression proof** — the rename touched the button that triggers
  `generateReadingHoroscope`, and a broken handler would look identical to a working
  one in a static diff.
- Reload that written reading: indicator shows all three done, and the panel status
  reads "not written yet" nowhere — it reads written.
- At mobile width (below 900px): the indicator is legible, does not overflow, and does
  not introduce a horizontal scrollbar on either route.
- Force a generation failure if reachable: "Try again" still appears and is enabled.

### Out of Scope

- **Any change to what the three actions do.** This sprint renames and signposts. The
  server actions, the ephemeris calculation, the Wikipedia lookup, and the horoscope
  prompt are all untouched.
- **Making the indicator clickable as navigation.** A visitor cannot jump to step 3
  without a saved reading to attach it to, so a clickable indicator would need
  disabled-state and deep-link semantics this sprint has not specified. If it is
  wanted, it is a follow-up with its own requirements.
- **Restyling either page.** Sprints 19, 20, and 23 settled the design language. The
  indicator adopts it; it does not revise it.
- **Renaming the `/chart` or `/reading/[id]` routes**, or the `castButton` CSS class.
  The settled vocabulary is about what visitors read, not internal identifiers. Route
  renames would invalidate every previously shared reading link.
- **Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.**

### Dependencies

- **Blocks:** nothing currently defined. A future onboarding or landing-page sprint
  would build on this sprint's settled vocabulary.
- **Blocked by:** nothing in the sprint system — 23 sprints are terminal and none are
  in flight. **But note:** the repo has substantial uncommitted tooling changes in the
  working tree (`.claude/`, `CLAUDE.md`, `scripts/`, plus untracked sprint state
  files). That is tooling housekeeping, outside this sprint's scope, but it should be
  settled before Dev Team commits app code on top of it, so QA1's audited tree hash
  and Pipeman's commit-content check refer to something clean.
- **External:** none. No API, no schema change, no migration, no environment variable.

### Team Assignments

- **Dev Team 1: the whole sprint.**
- **Dev Team 2: not assigned. This sprint does not parallelise.** Requirement 4 is a
  single shared component consumed by both routes; splitting it would have both teams
  editing the same new module and both editing the label sites that import it. Two
  people, one component, guaranteed collision. If a second sprint is wanted alongside
  this one, it must be something that touches neither route folder nor `globals.css`,
  and Dev Team 2 must run `/sprint-worktree` before building.

### Risks & Mitigations

- **The indicator gets built as a client component** because "current step" sounds like
  state — the most likely way this sprint goes wrong. It is derived from data the
  server already has. — R3 is written as an explicit static check, and QA1 is
  instructed to fail on a `"use client"` directive regardless of whether the page
  renders correctly.
- **Steps 1 and 2 sharing `/chart` gets missed**, and the indicator is wired one state
  per route — so casting a chart never advances it. — Called out in R2's table, in
  QA1's R2 check, and made the headline item of LiveQA's live pass.
- **The rename breaks horoscope generation** by disturbing the submit button inside the
  `<form action={generateReadingHoroscope}>`. A static diff of a changed string looks
  harmless. — LiveQA is required to actually generate a horoscope end to end and
  confirm it persists.
- **Scope creep into restyling.** The engineers will be in two designed pages with a
  new component to place. — Out of Scope names the three sprints that settled the
  design, and R8 forbids new tokens.
- **The vocabulary fix is done halfway**, leaving `"not read yet"` beside a button
  saying "Write the horoscope" — a *new* inconsistency created by this sprint. — R6
  enumerates every site, and LiveQA checks the status label on a written reading.
