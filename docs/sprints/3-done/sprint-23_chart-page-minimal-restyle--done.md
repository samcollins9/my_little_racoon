---
id: 23
title: "Chart page minimal restyle"
epic: "Reading Design"
status: done
created: 2026-08-23T04:38:33+00:00
---

# Master Controller Sprint Definition — Sprint 23

**Epic:** Reading Design
**Sprint Objective:** Bring `/chart` into the design language Sprint 19 established — tokens, fonts, spacing — without the constellation, the scrub control, or hover interaction.

### Context

`app/chart/page.tsx` is still the plain Sprint 6/10 page. The desktop design that
would have restyled it was **Sprint 13, aborted and reverted by Sprint 14**; only the
handoff document survived. Sprint 20 originally assumed that design existed and was
re-scoped when Dev Team caught it.

Sprint 19 changed `globals.css` to a dark ground globally, so `/chart` currently
inherits the dark background with none of the styling — unstyled tables and a
browser-default date input, sitting directly in front of a fully designed reading page.
That mismatch is live, and it is the first thing anyone demonstrating this sees.

**This sprint deliberately does not build `docs/design/HANDOFF_chart_constellation.md`.**
The constellation, the scrub slider and hover isolation are the most speculative parts
of that handoff and the ones a proof of concept least needs — live recomputation on
every input event, client-side ephemeris, interaction state. `/reading` is the page
people share; `/chart` is a date field they pass through. This sprint makes it look
like it belongs to the same product, and stops there.

### Requirements

1. `/chart` restyled using **the tokens, fonts and spacing Sprint 19 already
   established**. No new design system, no new tokens, no new fonts — the values exist
   and this sprint consumes them.
2. The date entry form: input well, label, and submit button styled to match the
   controls on `/reading`. Focus states included.
3. The computed results — the positions table and any supporting copy — styled to match
   `/reading`'s tables and typography.
4. The supported-range and error copy styled as fine print, consistent with
   `/reading`'s mono captions.
5. **No constellation SVG, no scrub control, no hover interaction, no aspect table.**
   `/chart` continues to show what it shows today, restyled.
6. `/chart` stays a server component. Nothing here needs client state, and the one
   client component in the codebase exists for `useFormStatus` on `/reading`.
7. Desktop only. `/chart` mobile is not scoped, and is not implied by this sprint.
8. Every carried guarantee holds: self-hosted fonts, no external requests, no schema or
   action change, `saveReading` untouched.
9. **Copy change, requested 23 Aug 2026:** remove "No account required to view them —
   save one and anyone with the link can open it." from `app/chart/page.tsx:40`. The
   sentence advertises the sharing model on the entry page, where it is noise rather
   than reassurance. Leave the rest of the intro copy intact.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: **the criterion that keeps this sprint small.** No new token, font, keyframe or
  design primitive is introduced. Every value traces to what Sprint 19 shipped. A
  parallel set of chart-specific tokens is how two pages drift into two design systems.
- R5: no constellation, no SVG figure, no scrub input, no hover state, no aspect
  rendering. Their absence is the scope boundary, and the geometry sitting in
  `app/reading/[id]/constellation.ts` makes importing it the obvious temptation.
- R6: no `"use client"` in `app/chart/`.
- R8: no change to `actions.ts`, `lib/`, `supabase/`, or `package.json`.
- R9: the sentence is gone and nothing else in the intro copy moved. This is a
  deletion, not a rewrite — a restyle sprint is where copy quietly gets "improved"
  alongside it.
- The diff is confined to `app/chart/` plus, at most, a stylesheet alongside it.

**GroundTruth — live, after Pipeman pushes:**

- `/chart` serves, accepts a date, and produces positions exactly as before.
- Saving still returns a link, and the saved reading still opens and renders — the
  Sprint 10 round trip, unaffected by a restyle.
- The Sprint 14 fixture still renders. It has verified every change in this project
  and a styling sprint is no exception.
- No external font or asset request appears in the served HTML.

**Verified by the user, not by a gate:**

Whether `/chart` now looks like it belongs beside `/reading`. That is the entire point
of the sprint and no gate can assess it — GroundTruth has no browser, and there is no
preview environment. Open both pages in sequence and judge whether the transition
reads as one product.

### Out of Scope

- The constellation, scrub control, hover isolation, and aspect table — R5. Deliberate,
  not deferred pending a decision.
- `/chart` mobile, and any breakpoint work. Not scoped, and Sprint 20 covers `/reading`
  only.
- Building `docs/design/HANDOFF_chart_constellation.md`. It stays committed as a design
  record of a direction not taken for this build.
- Any change to what `/chart` computes or displays. This is a restyle.
- The date-bound question — that a retroactive tool accepts future dates. Raised in
  Sprint 6, still a product decision, still not this.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Nothing. Independent of Sprint 20, which touches `/reading` only — but
  both are in flight on one branch, so **they must not build concurrently**: the second
  sprint's commits would land inside the first's audited tree and `/sprint-ship` would
  refuse. Sequence them.
- **Blocked by:** Sprint 22, at `complete_ready`.
- **External:** None.

### Risks & Mitigations

- **The constellation gets imported.** It is written, tested, twice-audited, and sitting
  one directory away in `app/reading/[id]/constellation.ts`. Adding it would be an
  afternoon and would silently convert this sprint into the one it was chosen instead
  of. — R5, as an explicit absence check.
- **A second set of tokens.** Chart-specific values are the natural way to write this
  quickly, and they are how one design becomes two. — R1.
- **Scope drift into `/chart` mobile.** The breakpoint is right there in the other
  sprint. — R7 and Out of Scope.
- **Concurrent building with Sprint 20.** Same branch, one checkout; the interleaved
  commit is the failure. — Named in Dependencies as a sequencing rule.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned.
