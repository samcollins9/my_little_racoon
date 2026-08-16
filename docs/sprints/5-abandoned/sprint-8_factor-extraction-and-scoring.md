---
id: 8
title: "Factor extraction and scoring"
epic: "Thin Vertical Slice"
status: abandoned
created: 2026-08-15T20:07:45+00:00
---

# Master Controller Sprint Definition — Sprint 8

**Epic:** Thin Vertical Slice
**Sprint Objective:** Turn a chart into a ranked set of stably-identified factors, using a deliberately reduced scoring pass, with a scorer that cannot receive event text at all.

### Context

This is the sprint carrying the architectural constraint the whole exercise agreed
to preserve. §7.3 requires that in blind mode it be *architecturally impossible*
for event text to reach the scorer — "not merely conditionally skipped." Blind mode
is out of scope here. The constraint is not. A scorer that accepts a context object
containing event text and then filters it has already failed the requirement, and
discovering that later means rewriting the scorer rather than adding a feature.
The cheapest moment to get this right is before the scorer has any callers.

Scoring is reduced on purpose. §7.3 lists eight inputs; this sprint implements
three, because the exercise needs a ranking that works end to end, not a ranking
that is good. Weights still live in one inspectable module, so the full set can be
added later without restructuring.

### Requirements

1. A factor model: stable identifier, plain-language name, type, the chart elements
   it derives from, and a score.
2. Factor identifiers stable across regeneration — the same chart yields the same
   identifier for the same factor, every time. Traceability depends on this.
3. Extraction of aspect factors, retrograde factors, and — only when time is known —
   angularity factors.
4. A scoring pass over three inputs only: orb tightness, applying versus separating,
   and retrograde status.
5. Scoring weights defined in one module as data, inspectable without reading the
   scoring logic.
6. **The scoring interface accepts a chart and nothing else.** There is no parameter,
   field, or ambient value through which event text, an event category, or any
   description could reach it. This is a constraint on the type signature, not on
   the caller's discipline.
7. Extraction and scoring are deterministic and side-effect free.
8. Tests covering: identifier stability across repeated runs, a tighter orb
   outranking a looser one, an applying aspect outranking an otherwise identical
   separating one, no angularity factors on a timeless chart, and a test asserting
   the scoring interface exposes no textual input.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R2: identifiers derive from the factor's own content, not from array position,
  insertion order, or a counter. Ordering-derived identifiers appear stable until
  the first time extraction order changes.
- R4: exactly the three named inputs. Additional scoring inputs are scope creep
  against §7.3's full list, not partial credit toward it.
- R5: weights are data in one module, not literals inside the scoring function.
- R6: **the criterion that matters most in this sprint.** The scorer's signature
  admits a chart and nothing else. No optional parameter, no context object with an
  unused text field, no module-level state a caller could set. A scorer that takes
  event text and ignores it fails this outright.
- R7: no clock, random source, or I/O in the extraction or scoring path.
- R8: all five listed cases present with real assertions.

**GroundTruth — live, after Pipeman pushes:**

- A chart on production produces a ranked factor list with visible scores.
- The same date and place, entered twice, produces identical identifiers and
  identical ordering. **This is the sprint's actual proof** — unstable identifiers
  make every downstream reference meaningless, and the instability only shows on the
  second run.
- A timeless chart produces factors, none of them angular.

### Out of Scope

- Blind and informed modes as user-facing behaviour, the mode selector, the lock,
  and the audit trail. The *architectural* separation in R6 is in scope; the feature
  is not.
- Event descriptions, event categories, and category significator weighting.
- The remaining five §7.3 scoring inputs: angularity weighting, dignity and debility,
  station, rarity, and sect.
- Weight adjustment UI. Weights are inspectable in code this sprint.
- Significations, source attribution, and any interpretation of what a factor means.
- Manual factor addition — that is curation, and it belongs with Sprint 9's surface.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Sprints 9 and 10.
- **Blocked by:** Sprint 7.
- **External:** None.

### Risks & Mitigations

- **Event text reaches the scorer.** The one architectural mistake in this exercise
  that is expensive rather than annoying to reverse, because every later blind-mode
  guarantee rests on it. — R6, enforced at the type signature and called out as this
  sprint's primary acceptance criterion.
- **Identifiers derived from ordering.** They look stable through every test that
  runs extraction once. — R2 and R8's stability test, which must run extraction
  repeatedly rather than compare a single run against a fixture.
- **Scoring quietly expands.** Dignity and sect are interesting, adjacent, and
  already computed nearby by the time anyone is looking. — R4 names the three
  permitted inputs and the acceptance criterion treats additions as failures.
- **Weights buried in logic.** §7.3 requires them inspectable and adjustable; buried
  constants make that a rewrite. — R5.
- **Angularity factors on a timeless chart.** The suppression contract has now
  crossed three sprints and this is where it is easiest to lose. — R3 and R8.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned.
