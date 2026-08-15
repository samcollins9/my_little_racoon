---
id: 7
title: "Aspects and chart view"
epic: "Thin Vertical Slice"
status: todo
created: 2026-08-15T20:07:45+00:00
---

# Master Controller Sprint Definition — Sprint 7

**Epic:** Thin Vertical Slice
**Sprint Objective:** Compute the five Ptolemaic aspects with application and exact perfection dates, and display the chart in a form an astrologer can check against their own software.

### Context

§7.2 is direct about applying versus separating: for event work the distinction
carries real interpretive weight and its absence would be conspicuous. It is also
the part most likely to be quietly skipped, because an aspect list looks complete
without it.

The display requirement carries the mitigation for §10's top risk. An astrologer
who sees positions that disagree with their own software abandons the tool, and
the usual cause is not an error but an unstated assumption about house system or
zodiac. Labelling both on every chart is what makes a disagreement diagnosable
instead of disqualifying.

### Requirements

1. The five Ptolemaic aspects — conjunction, sextile, square, trine, opposition —
   computed between all chart bodies.
2. A default orb set, defined in one place as data rather than scattered constants,
   configurable per aspect.
3. Applying versus separating computed for every aspect, from the relative motion
   of both bodies rather than assumed from the faster one.
4. The exact date of perfection for applying aspects, and of last perfection for
   separating ones.
5. A chart view listing positions and aspects, showing sign, degree, retrograde
   status, aspect, orb, and application state.
6. Every chart displays the house system and zodiac that produced it.
7. When time is unknown, the view states that houses and angles are unavailable and
   shows no angular information of any kind.
8. Tests covering aspects against reference charts, both application directions,
   an aspect involving a retrograde body, and the timeless-chart case.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: all five aspects, across all body pairs, with no pair silently skipped.
- R2: orbs are data in one module, not literals at their use sites.
- R3: application is derived from both bodies' motion. A rule based only on the
  faster body's direction fails this — it gives the wrong answer whenever the
  slower body is retrograde.
- R4: perfection dates are computed for both applying and separating aspects.
- R6: house system and zodiac are rendered on the chart view, not merely held in
  state.
- R7: the timeless path renders no Ascendant, Midheaven, or house placement, and
  says why.
- R8: all four listed test cases are present with real assertions.

**GroundTruth — live, after Pipeman pushes:**

- A chart on production shows positions and aspects, with house system and zodiac
  labelled.
- An applying aspect and a separating aspect are both visible and correctly marked,
  each with a perfection date.
- A timeless chart shows no angular information and says so. **This is the sprint's
  actual proof** — the suppression has to hold at the surface a user sees, not only
  in the model.

### Out of Scope

- Minor aspects. §7.2 makes them opt-in; nothing here needs them.
- Aspect patterns, midpoints, antiscia, declinations.
- Per-planet orbs. Per-aspect orbs only this sprint.
- A rendered chart wheel. A readable table satisfies every requirement here; the
  wheel belongs with export work outside this exercise.
- User-editable settings. Orbs are configurable in code, not in a settings UI.
- Factors, scoring, and interpretation — Sprint 8 onward.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Sprint 8. Aspects are the largest source of factors.
- **Blocked by:** Sprint 6.
- **External:** None.

### Risks & Mitigations

- **Application computed from one body.** Correct in the common case and wrong
  exactly when a body is retrograde — which §7.3 weights heavily, so the error lands
  on the highest-scoring factors. — R3, with the acceptance criterion naming the
  failure directly.
- **Orb constants scattered.** They become inconsistent, and the configurability
  §7.2 requires turns into a refactor. — R2 requires one data module from the start.
- **House system and zodiac unstated.** §10's top risk. A practitioner comparing
  against their own software sees a discrepancy with no way to attribute it. — R6,
  on every chart, without exception.
- **Angular data leaking into the timeless view.** The model suppresses it, then a
  component renders a house column anyway. — R7 and GroundTruth's third criterion
  check the surface, not the model.
- **Perfection dates off by a day.** Plausible-looking and wrong; timing language is
  precisely where §7.6 says the product should be concrete. — R8's reference cases
  assert specific dates.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned.
