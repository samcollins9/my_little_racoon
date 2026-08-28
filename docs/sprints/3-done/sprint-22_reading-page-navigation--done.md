---
id: 22
title: "Reading page navigation"
epic: "Reading Design"
status: done
created: 2026-08-23T04:02:39+00:00
---

# Master Controller Sprint Definition — Sprint 22

**Epic:** Reading Design
**Sprint Objective:** Remove the regenerate control from the reading page, link to `/chart` instead, and clear the copy describing the removed affordance.

### Context

Requested during Sprint 19 and briefly added to that sprint's file — after it had
already shipped and passed GroundTruth. Withdrawn from there and recorded; this is
where the work happens.

The reasoning is the user's: there is no reason to encourage repeated generation of
the same reading. A visitor who wants another reading should be sent to cast a new
one, not offered a control that re-rolls the one they are looking at.

**Sequence this before Sprint 20.** Sprint 20 builds the mobile footer, and its
frame-4 spec carries "Cast again" from the handoff. Running this first means that
footer is built correctly once rather than built and then stripped.

### Requirements

1. The written state's regenerate control is removed. `ReadingPanel.tsx` currently
   renders `"Cast it again"` when a horoscope exists; that branch goes.
2. **The idle state's "Read the chart" button is untouched.** R7 of Sprint 17 — explicit
   generation — is unchanged. Removing it would disable the feature rather than
   restrain it, which is the opposite of what was asked.
3. A plain link to `/chart` on the reading page, so a visitor can cast a new reading.
   It replaces the removed control rather than sitting beside it.
4. The footer note's second line — "The reading is kept; casting again replaces it." —
   is dropped or revised. It describes an affordance that will no longer exist.
5. The `"Try again"` label on the error path stays. That is a retry of a failed
   generation, not a regeneration of a successful one, and R8 of Sprint 17 requires
   failures to surface with the button re-enabled.
6. No other change to Sprint 19's design.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1/R2: no regenerate branch in the written state; the idle-state generate button is
  present and unchanged. Both checked, because the two live in the same ternary and
  removing the wrong arm is a plausible slip.
- R3: a `/chart` link exists on the reading page.
- R4: no copy anywhere describing casting again. Grep for "casting again" and "Cast it
  again" returns nothing.
- R5: the error path still offers "Try again" with the button enabled.
- R6: the diff touches navigation and copy only. No layout, no tokens, no restyling of
  a design that shipped hours earlier.
- The Sprint 18/19 guarantees are untouched: escaped horoscope rendering, no markdown
  library, `isSafeExternalUrl` on event URLs, self-hosted fonts.

**GroundTruth — live, after Pipeman pushes:**

- A reading with a stored horoscope shows no regenerate control and does link to
  `/chart`, and following it reaches the chart page.
- A reading with no horoscope still shows "Read the chart", and pressing it still
  generates and persists. **This is the sprint's actual proof** — the removal targeted
  the right branch, and explicit generation still works.
- A failed generation still surfaces the error with "Try again" available.

### Out of Scope

- **Any spend control.** This removes a button, not the action behind it.
  `generateReadingHoroscope` still exists and is still reachable by anyone who posts to
  it. This is a decision about what to encourage. The actual controls remain the OpenAI
  account cap and `HOROSCOPE_ENABLED`, exactly as Sprint 17 recorded. Nobody reading
  this later should conclude repeat generation was made impossible.
- Mobile — Sprint 20, which inherits this decision for frame 4.
- Rate limiting, authentication, per-reading generation caps.
- Any restyling of Sprint 19's design.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Note on the handoff deviation

`docs/design/HANDOFF_reading_responsive.md` specifies "Cast it again" in the written
state and "Cast again" in mobile frame 4. Neither will ship. The handoff stays
committed and unedited — it is a design record, not a changelog — so this file is
where the divergence is written down. Sprint 20 must not reintroduce the button when
building the mobile footer.

### Dependencies

- **Blocks:** Sprint 20, which should build the mobile footer with this already decided.
- **Blocked by:** Sprint 19, at `complete_ready` — close it first.
- **External:** None.

### Risks & Mitigations

- **The wrong ternary arm removed.** "Read the chart" and "Cast it again" are branches
  of one expression, and deleting the generate button would disable the feature
  entirely while looking like the requested change. — R1 and R2 checked as separate
  criteria, and GroundTruth's second criterion proves generation still runs.
- **Read as a spend control.** It is not one, and someone later relaxing the cap or the
  kill switch on the belief that the UI now prevents repeats would be wrong on both. —
  Named in Out of Scope.
- **Stale copy left behind.** The footer sentence outlives the button it describes, and
  nothing breaks. — R4, grepped.
- **Restyling while in the file.** Sprint 19's design shipped hours before this. — R6.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned.
