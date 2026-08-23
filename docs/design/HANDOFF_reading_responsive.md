# Handoff: `/reading/<id>` page + responsive views

## Overview

Two things:

1. A designed `/reading/<id>` page for the Retroactive Horoscope app — the stored chart, the day's events, and the generated horoscope — replacing the current unstyled server-rendered tables.
2. Responsive (390 px) treatments for both `/chart` and `/reading/<id>`.

Horoscope generation stays **explicit** (R7 in `app/reading/[id]/actions.ts` is preserved). The design adds the states around it: idle → reading the chart → writing → written.

The `/chart` desktop design was handed off previously and already lives in the repo at `docs/design/HANDOFF_chart_constellation.md`. This bundle does not change it; it extends it.

## About the design files

`prototype_reading_responsive.html` is a **design reference created in HTML** — a prototype showing intended look and behavior, not production code to copy. Open it in a browser (it needs `support.js` beside it) and read it as a spec.

The task is to recreate these designs in the existing codebase: **Next.js App Router, React server components, TypeScript**, under `app/reading/[id]/` and `app/chart/`. The prototype's own astronomy code (`ELEM`, `helio`, `moonLon`, `lonAt` in the inline script) is a throwaway — the repo already has `lib/ephemeris/` and `lib/chart/model.ts`, and those are authoritative. Do not port the prototype's math.

The prototype is a single canvas holding three things side by side. Ignore the canvas chrome (`1a` / `2a` / `2b` badges, the browser-window and phone-shell wrappers, the section headings). Only what is *inside* those frames is the design.

- `1a` — `/chart` desktop (already handed off, unchanged)
- `2a` — `/reading/<id>` desktop ← new
- `2b` — four 390 px phone screens ← new

## Fidelity

**High-fidelity.** Colors, type, spacing, and states are final. Recreate faithfully. All colors are `oklch()`, which is what the design was authored in — keep them as `oklch()` rather than converting to hex.

---

## Screens

### 2a — `/reading/<id>`, desktop

**Purpose:** the permanent, shareable page for a sealed reading. Anyone with the link opens this. It must be complete and legible *before* any horoscope exists.

**Page structure** (top to bottom):

1. **Date band** — full width, `padding: 34px 40px 26px`, bottom border `1px solid oklch(0.21 0.018 288)`, `display: flex; align-items: flex-end; justify-content: space-between; gap: 28px`.
   - Left: eyebrow "The sky over" (IBM Plex Mono, 9.5px, `letter-spacing: 0.22em`, uppercase, `oklch(0.50 0.015 285)`), then the date as an h2 — Cormorant Garamond 44px / weight 300 / line-height 1. The **year is italic and accented**: `oklch(0.70 0.13 145)`. Format is `20 July 1969` (day, full month, year), not the ISO `event_date`.
   - Right: a 30×30 moon-phase glyph drawn as real geometry (see *Moon phase* below) + phase name (Mono 10.5px, `letter-spacing: 0.14em`, `oklch(0.62 0.015 285)`); then a right-aligned mono block, 10px, `line-height: 1.8`, `oklch(0.44 0.015 285)`: `JD {julianDay to 4dp}` / `sealed · anyone with the link`.

2. **Body** — `display: grid; grid-template-columns: 560px 1fr`.

   **Left column** (`border-right: 1px solid oklch(0.21 0.018 288)`, flex column):
   - The aspect constellation, 560×560, `viewBox="0 0 640 640"`. Identical construction to `/chart`'s figure — see the existing chart handoff for the full spec. Differences here: no scrub slider, no hover interaction, and the centre label reads `1969 · 07 · 20` at y=316 (Mono 12px, `letter-spacing: 0.24em`, `oklch(0.54 0.015 285)`) with `12:00 UT` at y=338 (Mono 11px, `oklch(0.40 0.015 285)`). The moon disc that sits at the centre on `/chart` is **not** repeated here — it has moved to the date band.
   - Below it, pushed to the bottom with `margin-top: auto`: Elements / Modalities, `grid-template-columns: 1fr 1fr`, divided by a 1px border, each cell `padding: 20px 26px`. Section labels are Mono 9px / `0.2em` / uppercase / `oklch(0.46 0.015 285)`, 13px bottom margin. Each row is `grid-template-columns: 52px 1fr 18px` (62px first column for modalities), `gap: 9px`: name in Cormorant 16px `oklch(0.86 0.012 85)`, a 3px track `oklch(0.23 0.018 288)` with an absolutely-positioned fill (`oklch(0.70 0.13 145)` for elements, `oklch(0.68 0.13 25)` for modalities) at `count/10 × 100%`, and the count right-aligned in Mono 10.5px `oklch(0.62 0.015 285)`.

   **Right column** (flex column):
   - **What happened** — `padding: 30px 40px 26px`, bottom border. Heading Cormorant 23px weight 400 `letter-spacing: 0.02em`; on the same baseline, right-aligned, a Mono 9.5px `0.14em` uppercase `oklch(0.48 0.015 285)` status that reflects `events.matchedYear`: `this exact date` when true, `on this day, other years` when false. Each event is `grid-template-columns: 62px 1fr; gap: 16px; padding: 13px 0`, separated by `1px solid oklch(0.185 0.014 286)`: year in Mono 12px `oklch(0.70 0.13 145)` `letter-spacing: 0.06em`, text in Cormorant 17.5px / 1.5 / `oklch(0.84 0.012 85)` / `text-wrap: pretty`. When `events` is null, keep the section and render the existing null copy from `display.ts` in place of the list.
   - **The reading** — `padding: 30px 40px 34px`, `flex: 1`, `display: flex; flex-direction: column; gap: 20px`. Heading matches "What happened". The right-aligned status label is Mono 9.5px `0.16em` uppercase and changes with state (below).
   - **Footer**, pinned with `margin-top: auto`, `padding-top: 22px`, top border: the generate button (see below) plus a Mono 9.5px `line-height: 1.8` `oklch(0.44 0.015 285)` two-line note — `Written on request from 10 positions and {n} aspects.` / `The reading is kept; casting again replaces it.`

**The reading panel's four states**

| State | Status label | Colour | Body | Button |
|---|---|---|---|---|
| idle (no stored horoscope) | `not read yet` | `oklch(0.50 0.015 285)` | dim triangle sigil (34px, `opacity: 0.5`) + a Cormorant 19px / 1.55 `oklch(0.62 0.015 285)` line, max 46ch | `Read the chart` |
| submitting | `reading the chart` | `oklch(0.78 0.11 85)` | busy block, detail line = `10 positions · {n} aspects within orb` | disabled |
| generating | `writing` | `oklch(0.78 0.11 85)` | busy block, detail line = `gpt-4o-mini · temperature 0.9` | disabled |
| written | `written` | `oklch(0.62 0.10 145)` | paragraphs | `Cast it again` |

The prototype fakes the two busy phases on timers (1.7 s, then 2.9 s) purely to demonstrate them. In the real app they are the genuine phases of the server action: the first covers submit + re-fetch, the second covers the OpenAI call. If you can't distinguish them, ship only the second (`writing`) — do not fake the first.

**Busy block**: `display: flex; align-items: center; gap: 16px`. A 34px sigil — circle `r=17` stroke `oklch(0.30 0.02 288)`, an inscribed triangle `M20 3 L34 28 L6 28 Z` stroke `oklch(0.70 0.13 145)`, centre dot `r=3` fill `oklch(0.70 0.13 145)` — the whole SVG rotating `360deg / 9s linear infinite` about its centre, the dot flickering on a 2.4 s ease-in-out cycle (`0.30 → 0.95 at 42% → 0.42 at 58% → 0.30`). Beside it: Cormorant 19px italic `oklch(0.86 0.012 85)` phrase ("The chart is being read." / "The reading is being written.") over the Mono 10px `0.12em` `oklch(0.48 0.015 285)` detail line. Below, six shimmer bars, `gap: 11px`, height 9px, widths `96% 89% 93% 61% 91% 74%`, each `linear-gradient(90deg, oklch(0.20 0.016 288) 0%, oklch(0.28 0.02 288) 42%, oklch(0.20 0.016 288) 84%)` at `background-size: 420px 100%`, animated `background-position: -220px → 420px` over 2.6 s linear infinite, staggered by 0.18 s per bar.

**Written state**: paragraphs from `horoscopeParagraphs()`, `gap: 17px`, Cormorant 19.5px / 1.62 / `oklch(0.88 0.012 85)`, `max-width: 62ch`, `text-wrap: pretty`. Each rises in — `opacity 0 → 1`, `translateY(8px) → 0`, 0.9 s ease-out, staggered 0.45 s per paragraph, `forwards`. Run this only on first appearance after generation, not on every page load of a stored reading (a returning visitor should not watch their saved horoscope fade in). Respect `prefers-reduced-motion` by skipping the stagger.

**Button**: transparent, `1px solid oklch(0.33 0.02 288)`, `oklch(0.72 0.015 285)`, Mono 10.5px `0.18em` uppercase, `padding: 11px 18px`, `border-radius: 2px`. Hover: border `oklch(0.70 0.13 145)`, text `oklch(0.80 0.10 145)`. Disabled while the action is in flight: `cursor: not-allowed`, drop text to `oklch(0.46 0.015 285)`.

If `isHoroscopeEnabled()` is false, replace the button and note with a single Mono 10px `oklch(0.44 0.015 285)` line and keep the idle sigil.

---

### 2b — mobile, 390 px

One column throughout. There is no separate mobile route — this is the same markup under a breakpoint. Suggested breakpoint: the desktop two-column grid collapses below **900 px**.

**Shared shell**: page background `oklch(0.118 0.012 285)`; the browser-window chrome and phone bezel in the prototype are canvas decoration, not UI.

**Frame 1 — `/chart`, entry.** Vertically centred, `padding: 0 30px 40px`, centre-aligned. 140px drifting sigil (the existing `/chart` empty-state mark, `om-drift` 12 s), h2 Cormorant 30px / 1.2 with the accented italic second line, a 17px / 1.55 `oklch(0.65 0.015 285)` line, then a full-width stack (`gap: 10px`): the date field (`padding: 17px 16px`, Mono 16px, border `oklch(0.27 0.02 288)`, background `oklch(0.105 0.012 285)`) and a full-width primary button (`background: oklch(0.70 0.13 145)`, text `oklch(0.12 0.012 285)`, Mono 11px `0.18em` uppercase, `padding: 17px`). Note the deliberate size bump over desktop: 17px inputs, 17px button padding — every target clears 44px. Footnote Mono 9.5px / 1.85 `oklch(0.42 0.015 285)`.

**Frame 2 — `/chart`, computed.** Constellation full-bleed at the top, cropped to `viewBox="60 60 520 520"` so the figure fills 390px without shrinking the glyphs; sign-ring glyphs and the outer ring are dropped at this size, threads and bodies are kept, body labels are dropped (glyphs only, 16px). Centre date/time labels grow to 13px / 12px. Below: the scrub row (`padding: 4px 22px 14px`), then the aspect list at `padding: 0 22px` — each row is one line, `display: flex; justify-content: space-between; padding: 11px 0`, Cormorant 18px `{glyph} {name} {aspect symbol, in aspect colour} {glyph} {name}` on the left and the orb in Mono 10.5px on the right. The five tightest only; the rest are behind a "show all" the prototype doesn't draw. Sticky footer, `padding: 14px 22px 22px`, background `oklch(0.122 0.014 286)`, top border, holding the full-width primary "Seal this reading".

**Frame 3 — `/reading/<id>`, generating.** Date band shrinks: eyebrow Mono 9px, h2 Cormorant 32px. Constellation cropped harder (`viewBox="110 110 420 420"`, 390×300, threads + body glyphs at 18px, no labels, no rings). Then the reading panel in the same busy treatment as desktop, sigil at 30px, phrase at 18px.

**Frame 4 — `/reading/<id>`, written.** Events and horoscope stacked in one scrolling column, `padding: 18px 24px 0`, `gap: 20px`. Events condense to `grid-template-columns: 52px 1fr`, year Mono 11.5px, text Cormorant 16.5px / 1.45. Horoscope paragraphs Cormorant 18px / 1.58. Fixed footer with two equal ghost buttons, `gap: 10px` — "Cast again" and "Copy link" (Mono 10px, `padding: 14px`).

**One mobile-only detail:** the prototype masks the bottom 64px of that scrolling column with `mask-image: linear-gradient(to bottom, black calc(100% - 64px), transparent)` so long text fades under the fixed footer instead of being cut mid-word. Worth keeping in the real page; it only makes sense where the footer is fixed.

---

## Interactions & behaviour

- `/chart` submit → existing `saveReading` server action → redirect to `/reading/<id>`.
- `/reading/<id>` "Read the chart" → existing `generateReadingHoroscope` server action, unchanged. Wire the disabled/busy state with `useFormStatus` in a small client component so the panel can show "writing" without turning the whole page into a client component.
- Errors: the existing `?error=` copy renders in place of the busy block, Mono 10.5px `oklch(0.68 0.13 25)`, with the button re-enabled and relabelled "Try again".
- Constellation is non-interactive on `/reading` (hover highlighting belongs to `/chart`).
- Animations: `om-breathe` on aspect threads (7–13.8 s, staggered 0.4 s), `om-twinkle` on stars (5–14 s), `om-halo` on body haloes (8 s), `om-turn` on the busy sigil (9 s), `om-flicker` on its centre dot (2.4 s), `om-shimmer` on skeleton bars (2.6 s), `om-rise` on paragraphs (0.9 s). All decorative — gate the lot behind `prefers-reduced-motion: no-preference`.

## State

Server: `reading` row (`event_date`, `positions`, `events`, `horoscope`) via `get_reading_by_id`; `chart = composeChart(event_date, positions)`. Nothing else is computed at render.

Client: exactly one piece of state — the pending flag from `useFormStatus`. Idle vs written is decided by `reading.horoscope` being null, on the server.

## Design tokens

Colours

| Token | Value | Use |
|---|---|---|
| ink | `oklch(0.118 0.012 285)` | page background |
| ink raised | `oklch(0.142 0.014 286)` | card / window surface |
| ink sunk | `oklch(0.105 0.012 285)` | input wells |
| ink footer | `oklch(0.122 0.014 286)` | footer bars |
| rule strong | `oklch(0.29 0.02 288)` | outer borders |
| rule | `oklch(0.21 0.018 288)` | section dividers |
| rule faint | `oklch(0.185 0.014 286)` | list-row dividers |
| bone | `oklch(0.92 0.012 85)` | body text |
| bone dim | `oklch(0.84 0.012 85)` | secondary text |
| grey | `oklch(0.60 0.015 285)` | mono captions |
| grey dim | `oklch(0.44 0.015 285)` | fine print |
| verdigris | `oklch(0.70 0.13 145)` | accent, harmonic aspects, primary button |
| verdigris light | `oklch(0.80 0.10 145)` | accent hover |
| rust | `oklch(0.68 0.13 25)` | hard aspects, modality bars, errors |
| gold | `oklch(0.84 0.07 85)` | conjunctions |
| amber | `oklch(0.78 0.11 85)` | in-progress status |

Type — Cormorant Garamond (300/400) for prose and headings; IBM Plex Mono (300/400/500) for labels, data, and buttons. Scale in use: 44 / 32 / 30 / 23 / 21 / 19.5 / 19 / 18 / 17.5 / 16.5 / 16 (serif) and 12 / 11 / 10.5 / 10 / 9.5 / 9 (mono). Mono labels are uppercase with `letter-spacing` between `0.12em` and `0.22em`.

Spacing — 4px base. Section padding 30–40px desktop, 18–24px mobile. Radius: 2px on every control (the phone bezel's 30px is canvas decoration).

Shadow — `0 44px 100px -46px oklch(0.02 0 0 / 0.95)` on the window/phone shells only; no shadows inside the UI.

## Moon phase

Drawn, not glyphed. With elongation `e = normalize(moonLon − sunLon)` and `k = cos(e)`, the disc is a circle of radius `r` plus a terminator arc of x-radius `|k|·r`:

```
M cx (cy−r)
A r r 0 0 {waxing ? 1 : 0} cx (cy+r)
A {|k|·r} r 0 0 {waxing ? (k<0 ? 1 : 0) : (k<0 ? 0 : 1)} cx (cy−r) Z
```

where `waxing = e < 180`. Fill `oklch(0.86 0.05 85)`, on an unfilled circle stroked `oklch(0.34 0.02 288)`. Phase names bucket at 10/80/100/170/190/260/280/350°. `lib/ephemeris/moon-phase.ts` already computes the phase — use its output and draw the geometry from the elongation it derives.

## Assets

None. Everything is drawn inline as SVG or set in the two Google fonts (Cormorant Garamond, IBM Plex Mono). No icon library, no images.

## Content in the prototype

The demo reading is 20 July 1969. The three events and three horoscope paragraphs in the file are **sample content** standing in for Wikipedia and OpenAI output — do not ship them as fixtures beyond a test.

## Files

- `prototype_reading_responsive.html` — the design. Open in a browser; `support.js` must sit beside it.
- `support.js` — runtime for the prototype only. Not part of the design, not to be copied into the app.

## Repo files this touches

- `app/reading/[id]/page.tsx` — the whole of 2a and frames 3–4
- `app/reading/[id]/actions.ts` — unchanged; wrap the submit in a client component for the busy state
- `app/reading/[id]/display.ts` — unchanged; `eventsLabel` copy now appears as the right-aligned status
- `app/chart/page.tsx` — frames 1–2
- `app/globals.css` — dark ground, fonts, keyframes; the current light `--background` goes
- `lib/chart/model.ts`, `lib/ephemeris/*` — data source, unchanged
