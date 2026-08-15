---
id: 6
title: "Chart casting from date and place"
epic: "Thin Vertical Slice"
status: todo
created: 2026-08-15T20:07:45+00:00
---

# Master Controller Sprint Definition — Sprint 6

**Epic:** Thin Vertical Slice
**Sprint Objective:** Cast a mundane chart from a date, an optional time, and a place — planetary positions always, houses and angles only when a time is actually known.

### Context

The first sprint with real domain content, and the first with a correctness
standard that is not "it runs." Positions are either right or wrong against a
published ephemeris, and the tests must say which. Reference charts are how this
gets verified; an assertion that the function returns a number proves nothing.

The time-unknown contract lands here and it is the most important line in the
sprint. §7.1 of the PRD is blunt about why: most retrospective events have a date
and no timestamp, and producing an Ascendant for an event whose time nobody knows
is the fastest way to lose a professional user. So houses and angles are **absent
from the model** when time is unknown, not computed from a noon default and
filtered downstream. Free now, expensive after anything consumes the model.

### Requirements

1. An ephemeris adapter wrapping `astronomy-engine`, exposing this project's own
   interface rather than the library's, so precision can later be sourced elsewhere
   without rewriting callers.
2. Positions for the seven traditional planets plus Uranus, Neptune, and Pluto:
   ecliptic longitude, sign, degree within sign, and retrograde status.
3. A geocoding adapter resolving a place name to latitude, longitude, and IANA
   timezone, with results cached and the provider's rate limit and attribution
   requirements respected.
4. Chart input of date, optional time, and place. When time is present it is
   interpreted in the place's timezone.
5. Whole Sign houses and the four angles, derived from the Ascendant — computed
   **only** when a time is supplied.
6. When time is absent, houses and angles are absent from the chart model. The type
   makes this explicit; they are not zero, not defaulted, and not present-but-flagged.
7. Chart casting is deterministic and side-effect free: the same input yields the
   same chart, with no clock or network read inside the calculation.
8. Tests verifying computed positions against at least three published reference
   charts spanning different centuries, within a stated tolerance, plus a test
   asserting that a timeless chart has no houses or angles.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: callers import this project's interface, not `astronomy-engine` directly. A
  single adapter module is the only place the library is named.
- R2: all ten bodies are covered, each with the four listed properties.
- R3: geocoding sits behind an adapter, results are cached, and attribution and
  rate limiting are handled rather than mentioned.
- R5/R6: the chart type makes houses and angles optional in a way the compiler
  enforces. A nullable field that callers may freely dereference does not satisfy
  this; consumers must be unable to ignore absence.
- R7: no clock read, random source, or network call inside the calculation path.
- R8: at least three reference charts from different centuries, each asserting
  specific expected values with a stated tolerance, and a test proving a timeless
  chart carries no houses or angles.

**GroundTruth — live, after Pipeman pushes:**

- On production, entering a date and place with no time returns a chart with
  positions, and the interface states plainly that houses and angles are unavailable
  without a time.
- Entering the same date and place *with* a time returns houses and angles.
- A known historical date produces positions matching a published source.
  **This is the sprint's actual proof** — everything else confirms the code runs,
  this confirms it is right.

### Out of Scope

- Aspects — Sprint 7.
- Factors and scoring — Sprint 8.
- House systems other than Whole Sign, and the sidereal zodiac. §7.2 names Whole
  Sign and Placidus as the two that matter; Whole Sign is the one that is cheap to
  get right, and one correct system beats two approximate ones.
- Essential dignity, sect, combustion, stations, eclipses, ingresses.
- Julian and Gregorian calendar handling, and pre-1900 timezone uncertainty.
  **Modern dates only this sprint**, and the input must reject dates outside the
  supported range rather than silently mis-casting them.
- Chiron and the lunar nodes.
- Saving anything — Sprint 10.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Sprints 7, 8, 9, and 10. Everything in Epic B reads this model.
- **Blocked by:** Sprint 5. Epic B's changes are verified against previews.
- **External:** A geocoding provider. If it requires an API key, that key is a
  server-side secret and follows Sprint 2's key boundary — never `NEXT_PUBLIC_`.

### Risks & Mitigations

- **Time silently defaults to noon.** The exact failure §7.1 calls out, and it is
  invisible in output that looks perfectly plausible. — R6 makes absence a property
  of the type, so the mistake stops compiling rather than shipping.
- **Positions are wrong and nothing notices.** Astronomical output is unfalsifiable
  by inspection; wrong values look exactly like right ones. — R8's reference charts
  against published sources, across centuries so a systematic offset cannot hide.
- **The library leaks into the domain.** Importing `astronomy-engine` throughout
  makes the adapter decorative and the swap expensive. — R1, checked as an import
  audit rather than an impression.
- **Geocoding rate limits.** A free provider throttles or blocks under repeated
  identical lookups during development. — R3's caching, plus respecting the stated
  usage policy.
- **Timezone resolution treated as trivial.** Correct for modern dates, incorrect
  before standard time existed. — Explicitly out of scope, with the input range
  enforced rather than assumed.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned. Sprints 7 and 8 both read this model; running them
  against a chart type still being designed would produce exactly the shared-file
  collisions the worktree exists to prevent.
