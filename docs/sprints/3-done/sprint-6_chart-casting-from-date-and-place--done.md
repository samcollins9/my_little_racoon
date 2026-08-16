---
id: 6
title: "Chart casting from date and place"
epic: "Thin Vertical Slice"
status: done
created: 2026-08-15T20:07:45+00:00
---

# Master Controller Sprint Definition — Sprint 6

**Epic:** Thin Vertical Slice
**Sprint Objective:** Given a past date, compute and display the geocentric planetary positions for that moment on a public page — no account, no persistence.

> **Re-scoped 16 Aug 2026.** The registry title still reads "from date and place".
> Place has been dropped; there is no rename command and hand-editing the registry
> is forbidden, so the title stays and this note is the correction.

### Context

This sprint gives the deployment pipeline something real to carry: an actual
dependency, a real build, and a page with content worth looking at. It is not
trying to be good astrology.

Two things were cut and both cuts remove risk rather than adding it. **Place and
geocoding are gone**, because geocentric planetary positions depend only on the
moment, not on where the observer stands — so a date is sufficient, and the last
external API dependency in the project disappears along with its rate limits and
its key. **Houses and angles are gone**, because they are the part that genuinely
needs an observer location, and we deliberately collect none. That also retires the
time-unknown suppression contract this sprint was originally built around: there
are no houses to suppress, so there is no way to get the suppression subtly wrong.

Styling stays deliberately plain. This codebase is going through a design pass
after the exercise, and anything styled carefully now is work thrown away twice.

### Requirements

1. An ephemeris adapter wrapping `astronomy-engine`, exposing this project's own
   interface rather than the library's.
2. Positions for the seven traditional planets plus Uranus, Neptune, and Pluto:
   ecliptic longitude, zodiac sign, degree within sign, and retrograde status.
3. A public page, reachable with no account and no session, taking a past date and
   rendering those positions.
4. The date input is bounded to a stated supported range, and an out-of-range date
   is rejected with a clear message rather than silently mis-cast.
5. The instant of calculation is fixed, documented, and **stated on the page** —
   positions are computed at a specific time of day, and the page says which rather
   than implying a precision it does not have.
6. Computation is deterministic and side-effect free: no clock read, no network
   call, no random source inside the calculation path.
7. No houses, no angles, no Ascendant or Midheaven, anywhere in the model or the UI.
8. Tests verifying computed positions against at least three published reference
   dates from different centuries within a stated tolerance, plus a test asserting
   the chart model exposes no houses or angles.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: callers import this project's interface. A single adapter module is the only
  place `astronomy-engine` is named.
- R2: all ten bodies, each with the four listed properties.
- R3: the page performs no session or auth check of any kind. There is no session
  to check.
- R4: the supported range is enforced in code, not merely documented.
- R5: the calculation instant is a named constant, and it is rendered on the page.
- R6: no clock, random source, or I/O in the calculation path.
- R7: no geocoding dependency, no place input, and no house or angle concept
  anywhere — model, API, or UI.
- R8: at least three reference dates from different centuries, each asserting
  specific expected values with a stated tolerance.

**GroundTruth — live, after Pipeman pushes:**

- On production, with no sign-in of any kind, entering a past date returns
  planetary positions, and the page states the instant used.
- A known historical date produces positions matching a published source. **This is
  the sprint's actual proof** — everything else confirms the code runs; this
  confirms it is right.
- An out-of-range date is rejected with a clear message rather than a plausible
  wrong answer.

### Out of Scope

- Place input, geocoding, and timezone resolution. Cut deliberately — see Context.
- Houses, angles, and house systems. Cut deliberately.
- Sidereal zodiac and ayanamsa.
- Aspects, essential dignity, sect, retrograde stations, eclipses, ingresses.
- Factors, scoring, and interpretation. Sprints 7, 8, and 9 are aborted.
- Saving anything — Sprint 10.
- Styling beyond legibility. A design pass follows this exercise.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Sprint 10, which persists what this sprint computes.
- **Blocked by:** Nothing. Sprint 5 is complete. **Corrected 16 Aug 2026** — this
  previously read "Sprint 5, because Epic B's changes are reviewed against previews."
  Previews were dropped from Sprint 5, so there is no pre-production environment:
  this sprint's changes go from `main` straight to production. That raises the value
  of R8's reference-chart tests, which are now the only thing standing between a
  wrong ephemeris calculation and a live page asserting it confidently.
- **External:** None. Dropping geocoding removed the last external dependency in the
  project.

### Risks & Mitigations

- **Positions are wrong and nothing notices.** Astronomical output is unfalsifiable
  by inspection — wrong values look exactly like right ones. — R8's reference dates
  against published sources, spanning centuries so a systematic offset cannot hide
  in a single era.
- **The library leaks into the domain.** Importing `astronomy-engine` throughout
  makes the adapter decorative. — R1, checked as an import audit.
- **Houses creep back in.** They are the conventional next thing to add and every
  astrology reference will suggest them. Without a location they would be wrong. —
  R7 forbids the concept outright rather than gating it on an input.
- **Unbounded dates.** `astronomy-engine` will return values well outside any range
  worth trusting, and they will look ordinary. — R4 enforces the range in code.
- **Over-styling.** The page is about to be redesigned; polish now is discarded
  twice. — Named in Out of Scope so it is a decision, not an oversight.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned.
