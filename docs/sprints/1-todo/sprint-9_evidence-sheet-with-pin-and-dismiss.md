---
id: 9
title: "Evidence sheet with pin and dismiss"
epic: "Thin Vertical Slice"
status: todo
created: 2026-08-15T20:07:45+00:00
---

# Master Controller Sprint Definition — Sprint 9

**Epic:** Thin Vertical Slice
**Sprint Objective:** Present ranked factors as an evidence sheet the astrologer curates, showing why each factor scored as it did, with pin and dismiss over the set.

### Context

§7.4 is clear that curation is a requirement rather than a convenience, and §9
explains why: which factors an astrologer pins or dismisses is the cleanest signal
the product can collect about whether its ranking is any good. This sprint builds
the surface that produces that signal, without yet building the measurement.

Showing the score's components matters as much as showing the score. §7.3 warns
that an astrologer who disagrees with the ranking and cannot see or change it will
conclude the tool does not know what it is doing. Weight adjustment is out of scope
here, so visibility of the components is the entire answer this sprint offers, and
an opaque number would be worse than no number.

### Requirements

1. Factors listed in descending score order, each showing its identifier, plain
   language name, and score.
2. Each factor shows the components that produced its score — which inputs
   contributed and in which direction — not the total alone.
3. Pin and dismiss controls per factor, with a clear visual distinction between
   pinned, dismissed, and neither.
4. A filtered view of the curated set: pinned only, and dismissed hidden.
5. Curation state lives in memory for the session. Persistence is Sprint 10.
6. Honest empty and degenerate states: no factors extracted, every factor
   dismissed, nothing pinned.
7. The evidence sheet is reachable only by an authenticated user, behind the
   Sprint 3 session check.
8. Component tests covering pin, dismiss, undo of each, the filtered view, and each
   empty state.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: ordering is by score descending, taken from the scorer rather than recomputed
  in the view.
- R2: score components are rendered per factor. A single opaque number fails this,
  and is the specific failure §7.3 warns about.
- R3: the three states are visually distinct, not conveyed by colour alone.
- R5: curation state is session-local. No write to Supabase appears in this diff —
  persistence belongs to Sprint 10 and arriving early makes both sprints harder to
  verify.
- R6: all three states are handled explicitly rather than rendering an empty list.
- R7: the route performs the server-side session check established in Sprint 3.
- R8: all listed cases present with real assertions.

**GroundTruth — live, after Pipeman pushes:**

- Signed in on production, a chart produces a ranked evidence sheet with scores and
  their components visible.
- Pinning and dismissing update the display, and the filtered view reflects the
  curated set.
- Curation state is lost on reload, and that is correct for this sprint.
  **This is the sprint's actual proof of boundary** — surviving a reload would mean
  persistence arrived early and Sprint 10's real test has been pre-empted.

### Out of Scope

- Persisting curation or readings — Sprint 10.
- Manual factor addition. §7.4 requires it; it needs a factor authoring surface and
  identifier rules for factors with no chart derivation, which is a sprint of its own
  beyond this exercise.
- Significations, source attribution, and any statement of what a factor means.
- Draft generation, traceability markers, and the specificity checker.
- Weight adjustment UI.
- Blind and informed mode selection.
- Visual design beyond legibility. A plain, correct sheet is the goal.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Sprint 10, which persists what this sprint curates.
- **Blocked by:** Sprint 8.
- **External:** None.

### Risks & Mitigations

- **Persistence arrives early.** Saving curation here is a small change and it
  removes Sprint 10's only real test. — R5, with QA1 checking for the absence of a
  write and GroundTruth confirming reload clears state.
- **The score is shown without its components.** Faster to build and it is precisely
  the opacity §7.3 says loses the professional user. — R2.
- **Dismissed factors are deleted rather than marked.** Dismissal is a judgement the
  astrologer may reverse, and §9 counts it as signal — destroying it loses both. — R3
  requires three distinct states, and R8 requires an undo test for each.
- **Empty states unhandled.** A blank panel reads as a broken tool rather than a
  chart with nothing notable in it. — R6.
- **The sheet reachable unauthenticated.** — R7 reuses Sprint 3's server-side check
  rather than adding a second pattern.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned.
