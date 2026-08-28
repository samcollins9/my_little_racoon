---
id: 20
title: "Mobile breakpoint"
epic: "Reading Design"
status: done
created: 2026-08-23T03:01:01+00:00
---

# Master Controller Sprint Definition — Sprint 20

> **Three record corrections applied 23 Aug 2026, after this sprint closed.** All were
> raised as carried notes by QA1 round 3 and GroundTruth, none blocked the work, and
> all three were errors in this file rather than in the code. Deferred past the gates
> deliberately: a fourth QA1 round for two wrong sprint numbers and a mis-worded
> criterion would have been disproportionate on a sprint that had already spent three
> rounds on box-model arithmetic. Marked inline where they occur.

**Epic:** Reading Design
**Sprint Objective:** Apply the 390px treatments — screen 2b, frames 3 and 4 — to `/reading/<id>` under a single breakpoint.

### Context

Screen 2b of `docs/design/HANDOFF_reading_responsive.md`. **There is no separate
mobile route** — this is the same markup under a breakpoint, which the handoff
suggests at 900px for the desktop two-column grid.

**Re-scoped 23 Aug 2026 to `/reading` only — frames 3 and 4.**

This sprint originally covered all four frames. It said frames 1 and 2 were "the first
mobile work on `/chart`, whose desktop design was handed off earlier and is unchanged."
That is wrong, and it is my error: `app/chart/page.tsx` is still the plain Sprint 6/10
page — no dark theme, no constellation, no design fonts, at any viewport. The desktop
build that would have shipped it was **Sprint 13, which was aborted and reverted by
Sprint 14**. Only the handoff document survives, plus the geometry code Sprint 19
recovered.

I read the chart handoff's line — "already lives in the repo at
`docs/design/HANDOFF_chart_constellation.md`" — as meaning the design was built. It
says the *document* is in the repo. Frames 1 and 2 are mobile deltas on an existing
design: a cropped viewBox, dropped labels, condensed rows. There is nothing underneath
to crop.

Frames 3 and 4 have no such gap — Sprint 19 shipped `/reading`'s desktop — so this
sprint keeps them and drops the rest. `/chart`'s design is a separate decision, not a
requirement quietly folded in here.

The interesting content here is not layout — it is what the design **drops** at
390px. The constellation is cropped rather than shrunk (`viewBox="60 60 520 520"` on
`/chart`, `110 110 420 420"` on `/reading`), sign-ring glyphs and outer rings go, body
labels go, and the aspect list truncates to the five tightest. Those are deliberate
losses, and reproducing them is the sprint.

### Requirements

1. A single breakpoint at 900px collapsing the desktop two-column grid to one column.
   **No separate mobile route and no parallel component tree.**

   *Corrected 23 Aug 2026, after close.* This read "no duplicated markup", which read
   literally forbids what criterion 2 requires: serving byte-identical markup to both
   viewports means CSS-gated pairs — the `/chart` link renders twice, shown at one
   width and hidden at the other. QA1 passed it, GroundTruth recorded the tension so
   nobody would be startled by it later. The requirement was always about routes and
   component trees, not about any element appearing once. My wording, and the fourth
   instance of a habit QA1 named: read a criterion back literally against the
   repository and ask whether it says what the requirement means.
2. ~~Frames 1 and 2 — `/chart` entry and computed.~~ **Removed 23 Aug 2026** — see
   Context. They require a `/chart` desktop design that does not exist. `/chart` is
   untouched by this sprint and remains the plain page at every viewport.
3. Frames 3 and 4 — `/reading` generating and written — including the harder
   constellation crop and condensed events grid. **The fixed footer does not carry
   "Cast again"** — Sprint 22 removed the regenerate control at the user's direction
   and this sprint inherits that, rather than reintroducing it at a different
   viewport. The footer carries the `/chart` link and "Copy link".
4. Touch targets clear 44px. The handoff bumps input and button padding to 17px at
   this size deliberately; that is an accessibility floor, not a style preference.
5. ~~The aspect list on `/chart` mobile shows the five tightest only.~~ **Removed** —
   belongs with `/chart`'s design.
6. The bottom 64px mask (`mask-image: linear-gradient(...)`) on the scrolling column
   where the footer is fixed, so long text fades rather than being cut mid-word.
7. Every guarantee from Sprint 19 holds unchanged at every viewport: escaped horoscope
   rendering, `isSafeExternalUrl` on event URLs, self-hosted fonts, explicit
   generation, no prototype astronomy, reduced-motion gating.
8. Desktop rendering is unchanged. This sprint adds a breakpoint; it does not revisit
   Sprint 19's decisions.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: one breakpoint, one set of markup. A parallel mobile component tree fails — it
  doubles every future change and is how the two views drift apart.
- R7: **the criterion that matters most.** The Sprint 18 and 19 guarantees are
  reasserted here rather than assumed. A responsive pass touches every render path,
  and a markdown library or an unguarded `href` introduced for the mobile view would
  be just as exploitable as one introduced for desktop. Grepped, not inferred.
- R4: interactive targets meet 44px at 390px.
- R8: the desktop diff is limited to what the breakpoint requires. Restyling desktop
  under cover of a responsive sprint is scope creep against a sprint whose value is
  that it changes one thing.
- `/chart` is untouched. A diff that restyles it is out of scope, however small —
  `/chart`'s design is a separate decision that has not been made.

**GroundTruth — live, after Pipeman pushes:**

- `/reading/<id>` serves correctly at desktop width, unchanged from Sprint 19, and
  `/chart` is unchanged from its current plain form.
- The served markup is the same for both viewports — no viewport-conditional
  server rendering.
- The Sprint 18 XSS payloads still render escaped, and no external font request
  appears in the served HTML.
- The Sprint 14 fixture still renders a complete page.

**Verified by the user, not by a gate:**

Everything this sprint exists for. GroundTruth has no browser and cannot resize one;
there is no preview environment. **The mobile rendering is verifiable only by a person
opening it on a phone or in device emulation.** Both frames on `/reading`. The same structural gap named in Sprint 19, and more acute here — a
responsive sprint whose entire deliverable is invisible to every automated gate.

### Out of Scope

- Any change to Sprint 19's desktop design beyond what the breakpoint requires.
- A "show all" control for the truncated aspect list — the handoff notes the prototype
  does not draw it.
- Tablet or intermediate breakpoints. One breakpoint, two layouts.
- Native app behaviours, gestures, or install prompts.
- Any schema, action, or `lib/` change.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Nothing. Final sprint of the epic.
- **Blocked by:** Sprint 19.
- **External:** None.

### Risks & Mitigations

- **A parallel mobile component tree.** Faster to write and it guarantees the two
  views diverge on the next change. — R1.
- **Sprint 19's guarantees quietly lost.** A responsive pass rewrites render paths, and
  a security property re-introduced as a regression looks like ordinary new code. — R7,
  reasserted rather than inherited.
- **Desktop restyled along the way.** The design is fresh and the temptation to adjust
  it while in the file is real. — R8.
- **The truncated aspects rendered and hidden.** CSS-hidden rows still ship the data
  and still cost the render; the handoff means omitted. — ~~R5~~, struck when this
  sprint was re-scoped to `/reading` only. *Corrected 23 Aug 2026:* the risk describes
  `/chart`'s aspect list, which left scope with frames 1–2. It never applied to what
  shipped.
- **Nobody opens it on a phone.** Every gate can pass on a layout that is unusable at
  390px. — Named above as a user step.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned.
