---
id: 12
title: "Aspect engine"
epic: "Design Pass"
status: todo
created: 2026-08-16T19:09:06+00:00
---

# Master Controller Sprint Definition — Sprint 12

**Epic:** Design Pass
**Sprint Objective:** Compute the five Ptolemaic aspects with orbs and application, plus element and modality counts and moon phase — pure logic, no UI, callable from both server and browser.

### Context

Sprint 7 built this and was aborted, on the correct reasoning that a deployment
proof did not need it. The design handoff at
`docs/design/HANDOFF_chart_constellation.md` makes it necessary again: the Aspect
Constellation *is* the design, and it draws a thread per aspect weighted by
tightness. Without aspects there is nothing to draw.

This sprint is deliberately UI-free. The handoff specifies exact orbs, colours, and
geometry, and it would be easy to build the visualisation and let the maths follow
it. Getting it the other way round means the numbers can be tested against
published charts before anything renders, which is the only way anyone finds out
they are wrong — an aspect table full of confident, incorrect orbs looks exactly
like a correct one.

One constraint the handoff creates: this code runs in the browser, because the
scrub control recomputes everything live on every `input` event. It must be
isomorphic — no `node:` imports, no server-only markers.

### Requirements

1. The five Ptolemaic aspects between all body pairs, with the handoff's orb table
   exactly: conjunction 0°/8°, opposition 180°/8°, trine 120°/7°, square 90°/7°,
   sextile 60°/4°.
2. Only the first matching aspect per pair is kept, and pairs are returned sorted by
   ascending orb so the tightest lead.
3. Applying versus separating, computed from the relative motion of **both** bodies
   rather than assumed from the faster one — the rule that gives the wrong answer
   whenever the slower body is retrograde.
4. A tightness value per aspect, `1 − orb / maxOrb`, exposed as data. The
   visualisation derives stroke width and opacity from it; those formulas belong to
   Sprint 13, this sprint supplies the number.
5. Element and modality counts across the ten bodies, derived from sign.
6. Moon phase from sun–moon elongation: the elongation angle, a waxing flag, and the
   phase name using the handoff's deliberately narrow cardinal bands.
7. Julian Day for a given instant.
8. Positions accept an arbitrary instant — date **and** time — extending Sprint 6's
   fixed-hour model. Time materially moves the Moon, roughly 13° per day, so a time
   input changes real output rather than being decorative.
9. **Isomorphic.** No `node:` imports, no `server-only`, no filesystem or network.
   The module must run unchanged in a browser bundle.
10. Tests against published reference charts: aspects present and absent at known
    instants, an applying and a separating case, an aspect involving a retrograde
    body, all eight phase names, and element and modality counts.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: all five aspects across all pairs, orbs matching the handoff exactly. A
  rounded or "close enough" orb fails — these values are specified, not suggested.
- R2: sorting and first-match-only are implemented, not left to the caller.
- R3: **the criterion most worth checking closely.** Application derives from both
  bodies' motion. A rule keyed only on the faster body is correct in the common case
  and wrong exactly when a body is retrograde — and retrogrades are what the design
  colours in rust, so the error lands on the marks a user looks at first.
- R4: tightness is exposed as data. If stroke widths or opacities appear in this
  sprint, that is Sprint 13's work arriving early and coupling the maths to one
  rendering.
- R6: phase bands match the handoff's boundaries, including the narrow cardinals.
- R9: a grep of the diff shows no `node:` import and no `server-only` marker
  anywhere in the reachable module graph.
- R10: reference cases assert specific expected values, not merely that a number was
  returned.

**GroundTruth — live, after Pipeman pushes:**

- This sprint ships no user-visible change, so there is nothing to live-test beyond
  regression: `/chart` still serves, `/api/health/db` still reports the shipped
  commit. **Recorded as a deliberately thin live gate** — the real verification here
  is QA1's reference-chart checking, and a PASS should not be read as evidence the
  aspect maths was exercised live.

### Out of Scope

- All UI. No component, no SVG, no styling. Sprint 13.
- Minor aspects, aspect patterns, midpoints, declinations.
- Houses, angles, and place input — still cut, and the handoff agrees.
- Dignity, sect, stations, eclipses, ingresses.
- Persisting aspects. Sprint 10's schema stores positions; whether readings should
  also store aspects is a Sprint 13 question.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Sprint 13, entirely. The visualisation has nothing to draw without it.
- **Blocked by:** Nothing. Independent of Sprint 11.
- **External:** None.

### Risks & Mitigations

- **The maths is written to fit the picture.** Building the visualisation first and
  letting the numbers follow produces an aspect table that looks right and is not
  checkable. — This sprint is UI-free by construction and lands first.
- **Application computed from one body.** — R3, with the failure named in the
  acceptance criterion.
- **A `node:` import creeps in.** `randomUUID` and date helpers are the usual
  vectors, and the failure appears only when the browser bundle is built. — R9,
  grepped rather than assumed.
- **Orbs adjusted to taste.** The handoff's values are exact and the constellation's
  legibility depends on them. — R1's criterion treats deviation as failure.
- **Wrong output that looks plausible.** Aspect maths is unfalsifiable by
  inspection. — R10's reference charts, asserting specific values.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** could run Sprint 11 in parallel — the two share no files, one being
  routing and health, the other pure computation. If both run at once, Dev Team 2
  takes Sprint 11 in its own worktree via `/sprint-worktree 11`.
