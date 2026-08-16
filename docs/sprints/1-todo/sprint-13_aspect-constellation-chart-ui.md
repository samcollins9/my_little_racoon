---
id: 13
title: "Aspect Constellation chart UI"
epic: "Design Pass"
status: todo
created: 2026-08-16T19:09:06+00:00
---

# Master Controller Sprint Definition — Sprint 13

**Epic:** Design Pass
**Sprint Objective:** Build the Aspect Constellation design at `/chart` — empty state and results state — at the fidelity the handoff specifies, against this codebase's own patterns.

### Context

The handoff is at `docs/design/HANDOFF_chart_constellation.md`, with the prototype
at `docs/design/prototype_chart_constellation.html`. **The prototype is a reference,
not source to copy.** It computes planetary longitudes itself from approximate
Keplerian elements so the mockup could stand alone; that code must not be ported.
Positions come from `lib/ephemeris/`, aspects from Sprint 12.

The handoff is unusually precise — colours, geometry, orb tables, animation
durations are all specified — so this sprint's requirements mostly point at it
rather than restate it. What this file carries is the set of decisions the handoff
explicitly left open, the places where it conflicts with what shipped, and the
things a design pass tends to lose.

### Requirements

1. Both states built to the handoff: empty-state date entry, and the results state
   with constellation, aspect table, element and modality bars, and footer.
   Geometry, tokens, typography, and animation timings as specified.
2. Positions from `lib/ephemeris/` and aspects from Sprint 12's module. **No
   ephemeris code from the prototype**, in any form.
3. The browser chrome bar in the prototype is presentation scaffolding and is
   omitted, as the handoff instructs.
4. Fonts self-hosted at build time via `next/font/google`. **No runtime request to
   any external host.** This project currently makes zero outbound calls at runtime
   and that property is worth keeping deliberately rather than losing to a
   stylesheet link.
5. Live scrub recompute on every `input` event, per the handoff — debounce to ~16ms
   or compute in a transition if needed, but the live redraw stays.
6. `prefers-reduced-motion` disables every ambient animation, and the chart stays
   fully legible static.
7. Saving keeps the **existing server-side id generation** in `app/chart/actions.ts`.
   The handoff proposes generating the UUID client-side; its reasoning about there
   being no `SELECT` policy is correct, but the server action already satisfies that
   and keeps id generation on the safer side of the trust boundary. Deviation from
   the handoff, recorded deliberately.
8. Loading and error states built plainly in the design's own language — mono
   labels, muted ink, existing tokens, no new patterns. The handoff does not design
   these; they stay deliberately unstyled rather than elaborate.
9. Desktop only. The results layout assumes ≥1320px, as the handoff states. The
   limitation is recorded in `README.md` rather than left to be discovered.
10. Time UT input, per the handoff, feeding Sprint 12's arbitrary-instant support.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R2: **the criterion that matters most here.** No Keplerian element tables, no
  longitude maths, no ephemeris of any kind in `app/`. Every position traces to
  `lib/ephemeris/`. The prototype's ephemeris is the single most copyable thing in
  the bundle and it would produce a second, less accurate source of truth that
  disagrees with saved readings.
- R4: fonts come through `next/font/google`. A `<link>` to `fonts.googleapis.com` or
  an `@import` fails — it reintroduces a runtime external dependency this project
  does not have.
- R5/R6: live recompute is present, and reduced-motion disables ambient animation
  without degrading legibility.
- R7: `randomUUID` generation stays server-side. A client-generated id fails,
  notwithstanding the handoff.
- R8: loading and error paths exist and use existing tokens. A save failure surfaces
  as a failure — Sprint 10's R7 still binds.
- R9: the desktop-only constraint is in `README.md`.
- Fidelity: colours, orb table, radial mapping, and angular mapping match the
  handoff. Aspect orbs in particular must match Sprint 12's, not be redeclared here.

**GroundTruth — live, after Pipeman pushes:**

- `/chart` on production serves the empty state, and a date produces the results
  state with constellation, aspect table, and balance bars.
- Scrubbing changes the figure live — positions, aspects, and counts all move.
- Sealing a reading returns a link, and opening it in a fresh session with no
  cookies renders the saved reading. **This is the sprint's actual proof** — it is
  the Sprint 10 guarantee surviving a full UI replacement, which is exactly what a
  redesign is most likely to break.
- A known historical date's positions still match a published source. The design
  changed how the sky is drawn; it must not have changed what the sky was.

### Out of Scope

- Responsive and mobile layouts — R9, deferred to a pass of their own.
- Minor aspects, houses, angles, place input, dignity.
- Redesigning `/reading/[id]`. The saved-reading page keeps its current treatment;
  the handoff covers `/chart` only. If it should match, that is a separate sprint.
- Persisting aspects alongside positions. Readings store what Sprint 10 defined;
  aspects are derived on read.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Nothing. Final sprint of the epic.
- **Blocked by:** Sprint 12, entirely. Sprint 11 is independent but should land
  first so `/` reaches the redesigned page.
- **External:** None.

### Risks & Mitigations

- **The prototype's ephemeris gets ported.** It is right there, it works, and it
  makes the component self-contained. It would also produce positions that disagree
  with what gets saved. — R2, as QA1's primary check.
- **A Google Fonts link.** The fastest way to get the typography right, and it costs
  the project its only remaining zero-dependency property. — R4.
- **Sprint 10's guarantees quietly broken.** A UI rewrite touching the save path can
  lose the unguessable id, the no-listing rule, or the surfaced save failure without
  any of it looking like a regression. — R7, R8, and GroundTruth's third criterion,
  which re-tests the anonymous-link round trip end to end.
- **Fidelity drift under time pressure.** Animation timings and letter-spacing are
  the first things to go, and their absence is what makes a build look like a
  facsimile. — The handoff is committed in-repo and is the acceptance reference.
- **Loading and error states growing designed.** They are placeholders in someone
  else's design language. — R8 says deliberately unstyled; elaboration is a scope
  violation, not initiative.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned. Single coherent surface; splitting it would produce two
  halves of one component.
