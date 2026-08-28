---
id: 19
title: "Reading page desktop design"
epic: "Reading Design"
status: done
created: 2026-08-23T03:00:18+00:00
---

# Master Controller Sprint Definition — Sprint 19

**Epic:** Reading Design
**Sprint Objective:** Build screen 2a — the designed `/reading/<id>` desktop page — including the dark ground and typography the whole design rests on.

### Context

Handoff: `docs/design/HANDOFF_reading_responsive.md`, with the prototype at
`docs/design/prototype_reading_responsive.html`. Both are committed. The handoff is
written to stand alone, so it is the specification and this file does not restate it —
what this file carries is the set of existing guarantees a UI rewrite is most likely
to break, and one structural honesty about how it gets verified.

`app/globals.css` has to change before anything looks right. It currently sets
`--background: #ffffff`, `font-family: system-ui`, `margin: 2rem` on `body`, and a
`prefers-color-scheme: dark` block. That last one is not merely unhelpful — the design
is fixed dark, so a media query that swaps the ground based on the visitor's OS
setting is a second, competing source of truth. It goes rather than being overridden.

Mobile is Sprint 20. This sprint is desktop only, by explicit instruction.

### Requirements

1. Screen 2a built to the handoff: date band, two-column body, constellation, elements
   and modalities, "What happened", "The reading", and the pinned footer. Colours as
   `oklch()`, not converted.
2. `app/globals.css` reworked: dark ground, the design's tokens, the seven keyframes,
   no `margin` on `body`, and **the `prefers-color-scheme` block removed**.
3. Cormorant Garamond and IBM Plex Mono via **`next/font/google`**, self-hosted at
   build time. **No runtime request to any external host**, and no `<link>` or
   `@import` to `fonts.googleapis.com`.
4. All data from `composeChart` and `lib/ephemeris/`. **No astronomy from the
   prototype** — `ELEM`, `helio`, `moonLon`, `lonAt` are throwaway and must not be
   ported in any form.
5. The moon phase disc drawn from the elongation `lib/ephemeris/moon-phase.ts` already
   derives, per the handoff's path geometry.
6. The reading panel's four states. **If the submit phase cannot be distinguished from
   the OpenAI call, ship only `writing`** — the handoff is explicit that the first
   phase must not be faked on a timer.
7. The busy state wired with `useFormStatus` in **one small client component**;
   `page.tsx` stays a server component. Idle versus written is decided on the server by
   `reading.horoscope` being null.

   **Amended 23 Aug 2026 after QA1 round 1, at QA1's request.** This originally read
   "exactly one piece of client state — the pending flag." That is unsatisfiable
   alongside R8: "only on first appearance after generation" requires remembering that
   a transition occurred, and `pending` alone cannot express it. R7 and R8 as written
   could not both be met — my contradiction, the same shape as Sprint 14's R1/R8, and
   the second time I have written one.

   The accepted implementation holds three: `pending`, `prevPending`, `justWrote`.
   None duplicates server-owned data, and it uses React's documented "adjusting state
   when a prop changes" pattern rather than an effect or a ref, both of which would be
   worse here. The substance was adjudicated with the user before it was built.
   Recorded here because a deviation living only in a code comment is one refactor
   away from looking like a mistake.
8. The paragraph rise animation runs **only on first appearance after generation**, not
   on every page load. A returning visitor does not watch their stored horoscope fade in.
9. Every animation gated behind `prefers-reduced-motion: no-preference`, and the page
   fully legible without any of them.
10. **R7 preserved** — generation stays explicit, triggered by the existing
    `generateReadingHoroscope` action, never automatic.
11. **R9 preserved** — the horoscope renders as escaped text through
    `horoscopeParagraphs()`. No markdown library, no `dangerouslySetInnerHTML`, no
    `innerHTML`.
12. **`isSafeExternalUrl` still gates every event `sourceUrl`** before it reaches an
    `href`.
13. README's standing security note (Sprint 18 R11) survives unchanged.
14. Desktop only. Mobile is Sprint 20.

**Amendment withdrawn 23 Aug 2026 — recorded, not erased.**

Three requirements were briefly added here at the user's direction: remove the
written state's regenerate control, add a `/chart` link, and revise the stale footer
copy. **They were added after this sprint had already shipped `50a628a` and passed
GroundTruth** — I amended the file from a state read taken earlier in the same turn,
without re-checking that the sprint had moved on. The hash check makes it
unambiguous: QA1 round 2 recorded `cfc522bf…` at 03:29 UTC; the amendment landed at
03:59.

Nothing was missed by anyone. This sprint was built, audited, shipped and live-tested
against its requirements as they stood, and it met them. **The three requirements have
moved to Sprint 22**, which is where the work will actually be done and verified.

Left here rather than deleted because a sprint file that silently loses requirements
is worse than one that records a withdrawal — and because this is the second time in
this project that acting on a stale state read has produced a wrong conclusion.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R11: **the criterion most at risk in this sprint.** A grep of `app/`, `lib/` and
  `package.json` finds no markdown library, no `dangerouslySetInnerHTML`, no
  `innerHTML`. QA1 predicted at Sprint 18's gate that a future sprint reaching for a
  markdown renderer is what would undo this, and this is that sprint — the horoscope
  now needs styled, animated, staggered paragraphs, which is exactly when a library
  looks like the obvious answer. Newline-split to `<p>` remains the safe and
  sufficient path.
- R12: `isSafeExternalUrl` still gates `sourceUrl`. Events now render in a styled list
  with linked years; escaping protects text content and does nothing about a
  `javascript:` URL in an `href`.
- R3: fonts come through `next/font/google`. Any `fonts.googleapis.com` reference
  fails — this project makes zero outbound runtime requests other than Supabase,
  Wikipedia and OpenAI, and a stylesheet link would add a fourth silently.
- R4: no Keplerian tables, no longitude maths, no ephemeris of any kind in `app/`.
- R2: the `prefers-color-scheme` block is deleted, not overridden.
- R7: `page.tsx` has no `"use client"`. Exactly one client component exists, and it
  holds only the pending flag.
- R8: the rise animation is conditioned on first appearance, not applied unconditionally.
- R13: README's standing note is unchanged.

**GroundTruth — live, after Pipeman pushes:**

- `/reading/<id>` serves the designed structure — date band, constellation SVG,
  events section, reading panel, footer.
- The served HTML contains **no request to `fonts.googleapis.com`** or any other
  external host.
- The Sprint 18 XSS payloads, written with the public anon key, still render escaped.
  **This is the sprint's actual proof** — a full visual rewrite of the page that
  renders attacker-controllable content, with the escaping guarantee intact.
- The Sprint 14 fixture, with `events` and `horoscope` both null, still renders a
  complete page.
- Generation still works, persists, and survives a reload.

**Verified by the user, not by a gate:**

**R8's animation, which no gate can reach.** From QA1 round 1 note 1: `justWrote` can
only become true if the component instance survives the action's same-route redirect.
If it remounts, paragraphs appear without animating — R8's *prohibition* holds either
way, so it fails safe, but whether the flourish ever runs is unverifiable statically.
Two observations prove it, and only together: press **Read the chart** and confirm the
paragraphs rise in; then reload and confirm they do not.

Visual fidelity — layout, typography, spacing, how the three sections read together —
**is not checkable by any role in this process.** GroundTruth has no browser and said
so plainly at Sprint 18's gate; there is no preview environment, because Sprint 5
dropped it. On a high-fidelity design sprint that is a real gap, not a formality: the
gates can confirm the page serves, is safe, and carries the right structure, and none
of them can confirm it looks right. The user opens it in a browser before authorising
the close. Stated here so it is a step someone owns rather than an assumption.

### Out of Scope

- Mobile and the 900px breakpoint — Sprint 20.
- `/chart`'s design — handed off separately and unchanged by this bundle.
- Any change to `actions.ts`, `display.ts`, `lib/chart/`, or `lib/ephemeris/`.
- Constellation hover or scrub interaction — those belong to `/chart`.
- Shipping the prototype's sample content — the 1969 events and paragraphs are
  placeholders standing in for Wikipedia and OpenAI, and must not become fixtures
  beyond a test.
- Any schema change.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Note for anyone grepping the build

`.next` contains exactly one `fonts.googleapis` match: a server-side source map
carrying Dev Team's own comment saying no runtime request is made to it. Not a
request, not in `.next/static`, not in any non-map file. QA1 confirmed zero external
hosts in the delivered HTML and 25 self-hosted `.woff2` assets. Recorded because the
next person to run that grep will find it and it looks alarming for about ten seconds.

### Dependencies

- **Blocks:** Sprint 20, which applies the breakpoint to this markup.
- **Blocked by:** Sprint 18, at `complete_ready` — close it first.
- **External:** None.

### Risks & Mitigations

- **A markdown library, to render paragraphs nicely.** The single most likely
  regression in this epic, predicted by name at Sprint 18's final gate, and this sprint
  supplies the motive. — R11, plus README's standing note explaining why the convenient
  path is the vector.
- **A Google Fonts `<link>`.** The fastest route to the right typography, and it adds a
  runtime dependency on a host this project has never called. — R3.
- **The prototype's astronomy gets ported.** It is self-contained and it works, and it
  would produce positions disagreeing with the stored row. — R4, the same failure Sprint
  13's file named.
- **The submit phase faked on a timer.** The design shows two busy phases; only one may
  be real. Faking the other makes the interface lie about what it is doing. — R6.
- **The rise animation on every load.** Cheap to implement unconditionally and it makes
  a stored reading feel like it is being generated each visit. — R8.
- **Nobody looks at it.** Every gate can pass on a page that serves correct, safe,
  well-structured HTML and looks wrong. — Named above as a user step with an owner.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned. Sprint 20 restyles this markup and cannot run beside it.
