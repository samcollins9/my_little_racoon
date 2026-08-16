# Handoff: /chart — Aspect Constellation

## Overview

Two UI states for the `/chart` route of Retroactive Horoscope (`samcollins9/my_little_racoon`):

1. **Empty state** — the date-entry screen before anything is computed.
2. **Results state** — the computed sky: an aspect-constellation visualisation, an aspect table with orbs, and element/modality balance.

The visual direction is "occult elegance": near-black cool ink, a single verdigris accent, a rust accent reserved for hard aspects and retrogrades, serif display type against monospace data.

## About the Design Files

`Retroactive Horoscope — Chart.dc.html` in this bundle is a **design reference created in HTML**. It is a prototype showing intended look and behaviour — it is not production code to copy into `app/`.

The task is to **recreate this design inside the existing Next.js + TypeScript App Router codebase**, using its established patterns: a client component under `app/chart/`, the existing `lib/ephemeris/` adapter around `astronomy-engine` for positions, and whatever styling approach the repo already uses.

One important substitution: the prototype computes planetary longitudes itself, client-side, from JPL approximate Keplerian elements (accurate to roughly an arcminute) purely so the mockup could be interactive in isolation. **Do not port that code.** Positions must come from `lib/ephemeris/`. The prototype's ephemeris exists only to prove the visualisation reacts correctly to real data.

## Fidelity

**High-fidelity.** Colours, typography, spacing, and interaction behaviour are final and should be matched closely. The visualisation geometry below is specified exactly and should be reproduced as given.

---

## Screens / Views

### 1. Empty state — date entry

**Purpose:** the user names a past moment. Nothing else is asked of them — no place, no time zone, no account.

**Layout:** single centred card, 480px wide, inside a 1px border. Content padding `58px 46px 50px`, `display: flex; flex-direction: column; align-items: center; text-align: center`.

**Components, top to bottom:**

| Element | Spec |
| --- | --- |
| Ornament | 168×168 SVG. Outer circle r=94, `stroke: oklch(0.25 0.02 288)`, `stroke-dasharray: 1 10`. Inner group of 4 small stars wired by 0.7px lines, rotating 360° over 260s. Centre dot r=2.5. Whole SVG drifts vertically ±4px over 12s. `margin-bottom: 32px` |
| Headline | "The sky keeps its / old positions". 31px / weight 400 / line-height 1.24 / letter-spacing 0.01em. Second line italic, `oklch(0.70 0.13 145)`. `margin-bottom: 15px` |
| Subhead | "Name a moment that has already passed. The planets will be put back where they stood." 17px / line-height 1.6 / `oklch(0.65 0.015 285)` / max-width 306px / `text-wrap: pretty`. `margin-bottom: 32px` |
| Field label | "DATE PAST" — mono 9.5px, letter-spacing 0.2em, uppercase, `oklch(0.50 0.015 285)`, left-aligned |
| Date input | Full width, `background: oklch(0.105 0.012 285)`, `border: 1px solid oklch(0.27 0.02 288)`, radius 2px, padding `15px 16px`, mono 15px, letter-spacing 0.09em. Placeholder `yyyy — mm — dd` in `oklch(0.38 0.015 285)`. Focus: border → `oklch(0.70 0.13 145)` |
| Submit | "COMPUTE THE SKY" — full width, transparent, `border: 1px solid oklch(0.33 0.02 288)`, mono 11px, letter-spacing 0.18em, uppercase, padding 14px, radius 2px. Disabled until a valid past date is entered (`cursor: not-allowed`, text `oklch(0.58 0.015 285)`). Enabled: text `oklch(0.92 0.012 85)`, border `oklch(0.70 0.13 145)` |
| Footnote | "No account. No place of birth. No houses. / Nothing kept but what you choose to seal." Mono 10px, line-height 1.85, `oklch(0.42 0.015 285)`. `margin-top: 24px` |

Field group gap: 9px; 10px extra above the submit button.

### 2. Results state

**Purpose:** read the computed sky. An astrologer must be able to check aspects and orbs at a glance.

**Layout:** card 1320px wide. Below the browser chrome bar, a CSS grid: `grid-template-columns: 700px 1fr; align-items: stretch`.

**Left column** (`display: flex; flex-direction: column; justify-content: center`, right border `1px solid oklch(0.21 0.018 288)`):
- Constellation SVG, 640×640, padding `22px 30px 6px`
- Scrub control, padding `4px 34px 26px`

Note: the two grid columns stretch to equal height and the left content is shorter, so the left column centres its content vertically rather than leaving a trailing void. Keep the scrub control immediately beneath the SVG it controls.

**Right column** (`display: flex; flex-direction: column`), five stacked blocks separated by `1px solid oklch(0.21 0.018 288)`:

1. **Inputs row** — padding `26px 32px 22px`, `align-items: flex-end`, gap 20px. Date input (`type="date"`, `max` = today) and Time UT input (`type="time"`), each with a mono 9.5px / 0.2em uppercase label above; both `background: oklch(0.105 0.012 285)`, `border: 1px solid oklch(0.29 0.02 288)`, mono 14px, padding `9px 11px`, radius 2px, focus border `oklch(0.70 0.13 145)`. Right-aligned meta: `JD 2446546.5576` / `geocentric · apparent`, mono 10px, `oklch(0.46 0.015 285)`, line-height 1.7.
2. **Section head** — padding `22px 32px 4px`. "Aspects within orb" at 24px serif weight 400, letter-spacing 0.02em; right side "N exact-ish", mono 10px, letter-spacing 0.1em.
3. **Aspect table** — padding `10px 32px 0`, `max-height: 300px; overflow: auto`. Columns `1fr 26px 1fr 74px 1fr`, gap `0 10px`. Header row: mono 9px / 0.18em uppercase `oklch(0.46 0.015 285)`, bottom border `1px solid oklch(0.23 0.018 288)`, labels `Body / (blank) / Body / Orb / Aspect`. Data rows: padding `8px 6px`, `margin: 0 -6px`, bottom border `1px solid oklch(0.185 0.014 286)`. Body cells 17px serif `oklch(0.90 0.012 85)`, prefixed by the planet glyph. Aspect symbol centred, mono 15px, coloured by aspect class. Orb mono 11.5px `oklch(0.82 0.012 85)`, two decimals + `°`. Aspect name mono 10px / 0.14em uppercase, coloured, suffixed ` · A` (applying) or ` · S` (separating).
4. **Elements / Modalities** — 2-column grid, `1fr 1fr`, divider between. Each cell padding `22px 32px`. Header mono 9px / 0.2em uppercase, `margin-bottom: 14px`. Rows are a 3-column grid (`58px 1fr 20px` for elements, `66px 1fr 20px` for modalities), gap 10px, row gap 10px: name 17px serif `oklch(0.86 0.012 85)`; a 3px track `oklch(0.23 0.018 288)` with an absolutely-positioned fill at `count/10 × 100%` — verdigris `oklch(0.70 0.13 145)` for elements, rust `oklch(0.68 0.13 25)` for modalities; count mono 11px right-aligned `oklch(0.62 0.015 285)`.
5. **Footer** — `margin-top: auto`, padding `22px 32px`, `background: oklch(0.122 0.014 286)`, gap 18px. Primary button "SEAL THIS READING": `background: oklch(0.70 0.13 145)`, text `oklch(0.12 0.012 285)`, mono 11px / 0.18em uppercase, padding `13px 22px`, radius 2px, no border; hover `oklch(0.79 0.12 145)`. Beside it, mono 10px `oklch(0.48 0.015 285)`, max-width 380px: "No place, no houses, no angles — see Sprint 6. Saved anonymously; the returned link is the only way back in."

**Browser chrome bar** (both screens, for presentation only — omit in the real app): padding `11px 16px`, `background: oklch(0.112 0.012 285)`, bottom border, three 9px dots `oklch(0.33 0.02 288)` at gap 12px, then the URL in mono 11px `oklch(0.50 0.015 285)` with `margin-left: 14px`.

---

## The Aspect Constellation — exact geometry

640×640 viewBox, centre `(320, 320)`.

**Backdrop.** Full-bleed rect filled with a radial gradient (`cx 50% cy 46% r 56%`): `oklch(0.205 0.03 288)` → 62% `oklch(0.145 0.016 286)` → `oklch(0.112 0.012 285)`.

**Field stars.** 110 circles at deterministic pseudo-random polar positions (seed 20260816 so the field never reshuffles between renders): radius 40–308 from centre, r 0.4–1.6px, fill `oklch(0.80 0.02 288)`, base opacity 0.12–0.52. Each twinkles between opacity 0.18 and 0.62 over 5–14s with a 0–6s random delay.

**Frame.** Circle r=288 `stroke: oklch(0.235 0.02 288)`; circle r=60 `stroke: oklch(0.20 0.018 288)`.

**Sign sectors.** Twelve spokes from r=60 to r=288 at each 30° boundary, `stroke: oklch(0.22 0.018 288)`. A sign glyph at r=306 on each sector's midpoint, mono 17px. Glyph fill is `oklch(0.72 0.09 145)` if any body currently occupies that sign, otherwise `oklch(0.34 0.02 288)` — so the occupied signs light up.

**Angular mapping.** Screen angle for ecliptic longitude λ is `(180 − λ)` degrees. This puts 0° Aries at the left edge and runs signs counter-clockwise, matching chart convention.

**Radial mapping.** Radius = `78 + ring × 22`, where ring is orbital order: Moon 0, Sun 1, Mercury 2, Venus 3, Mars 4, Jupiter 5, Saturn 6, Uranus 7, Neptune 8, Pluto 9. Radii therefore run 78 → 276. Depth is meaningful, not decorative: this is what turns a wheel into a constellation, because aspect threads cross the field at varied lengths instead of all chording one circle.

**Body marks.** Per body: a halo circle r=18 in the body colour pulsing between opacity 0.09 and 0.26 over 8s; a solid dot (r=3.6 for Moon and Sun, r=2.6 otherwise); the planet glyph at r−15, mono 15px; and a data label at r+16, mono 9.5px `oklch(0.60 0.015 285)`, letter-spacing 0.05em, reading `DD°MM' ♊` plus `℞` when retrograde. Label `text-anchor` is `end` when the point is on the left half, `start` on the right.

Body colours: luminaries `oklch(0.88 0.06 85)`; direct planets `oklch(0.80 0.05 145)`; retrograde planets `oklch(0.74 0.11 25)`.

**Aspect threads.** A line between each pair within orb.

| Aspect | Angle | Max orb | Symbol | Colour | Dash | Base width |
| --- | --- | --- | --- | --- | --- | --- |
| Conjunction | 0° | 8° | ☌ | `oklch(0.84 0.07 85)` | solid | 1.6 |
| Opposition | 180° | 8° | ☍ | `oklch(0.68 0.13 25)` | solid | 1.4 |
| Trine | 120° | 7° | △ | `oklch(0.70 0.13 145)` | solid | 1.2 |
| Square | 90° | 7° | □ | `oklch(0.68 0.13 25)` | `5 4` | 1.2 |
| Sextile | 60° | 4° | ⚹ | `oklch(0.70 0.13 145)` | `2 5` | 1.0 |

Only the first matching aspect per pair is kept; pairs are sorted by ascending orb so the table leads with the tightest.

Tightness drives weight and opacity — this is the core of the idea. With `tight = 1 − orb / maxOrb`:
- `stroke-width = baseWidth × (0.5 + tight)`
- `opacity = 0.22 + tight × 0.5`

An exact aspect reads as a bright wire; a wide one nearly disappears. Threads also breathe between opacity 0.34 and 0.85 over 7–14s with staggered delays, so the figure is never static.

**Hover isolation.** Hovering an aspect table row sets a hover index. The matched thread goes to `opacity: 0.95` and `2.2×` its width, all other threads drop to `opacity: 0.07`, breathing animation stops, and the hovered row's background becomes `oklch(0.19 0.02 288)`.

**Centre readout.** Date at y=304 (mono 12px, letter-spacing 0.24em, `oklch(0.54 0.015 285)`, format `1986 · 04 · 26`); time at y=326 (mono 11px, `oklch(0.40 0.015 285)`, `HH:MM UT`); moon phase at y=354; phase name at y=380 (mono 9px, letter-spacing 0.16em, `oklch(0.52 0.015 285)`).

**Moon phase — drawn, not a glyph.** Outline circle r=11 `stroke: oklch(0.36 0.02 288)`, plus a filled path in `oklch(0.86 0.05 85)`. With elongation `e = normalise(λmoon − λsun)`, `k = cos(e)`, `waxing = e < 180`, `gibbous = k < 0`:

```
outerSweep = waxing ? 1 : 0
returnSweep = waxing ? (gibbous ? 1 : 0) : (gibbous ? 0 : 1)
d = M cx cy-r  A r r 0 0 outerSweep  cx cy+r
              A |k|·r r 0 0 returnSweep  cx cy-r  Z
```

The lit limb is a true semicircle; the terminator is an ellipse whose horizontal radius is `|cos e| × r`, bulging away from the lit side for a crescent and toward it for a gibbous. Correct northern-hemisphere orientation, all phases distinct, nothing hardcoded.

Phase names by elongation, deliberately narrow at the cardinal points: `<10° or ≥350°` New · `<80°` Waxing crescent · `<100°` First quarter · `<170°` Waxing gibbous · `<190°` Full · `<260°` Waning gibbous · `<280°` Last quarter · else Waning crescent.

**Scrub control.** Below the SVG: a label row ("SCRUB THE MOMENT" mono 9px / 0.2em uppercase `oklch(0.48 0.015 285)`, and the current offset right-aligned in mono 10.5px `oklch(0.68 0.10 145)` reading `as entered` at zero or `±N d`), then a full-width `input[type=range]` `min -400 max 400 step 1`, gap 10px. Track: `height 1px; background: oklch(0.34 0.02 288)`. Thumb: 11px circle `oklch(0.70 0.13 145)`, `margin-top: -5px`, `cursor: ew-resize`.

Scrubbing adds days to the entered moment and recomputes everything on every input event — positions, signs, retrograde flags, aspect set, thread weights, element and modality counts, moon phase. Choosing a new date resets the offset to 0.

**Performance note.** Recomputing all ten bodies twice (t and t+1 day) per frame is cheap enough to run synchronously on `input` in the prototype. If `lib/ephemeris/` is slower, debounce the scrub to ~16ms or compute in a transition; do not remove the live redraw, since that live redraw is the whole point of the element.

---

## Interactions & Behaviour

- **Date entry (empty state):** submit disabled until a valid date strictly in the past is entered. `max` on the input is today.
- **Date / time change (results):** recompute; reset scrub offset to 0.
- **Scrub:** live recompute on every `input` event.
- **Aspect row hover:** isolate that thread (above); clears on mouse leave.
- **Seal this reading:** client generates the reading UUID and includes it in the insert (there is no `SELECT` policy on `readings`, so `insert … returning *` cannot read the row back — see the repo README). On success, route to `/reading/[id]`.
- **Animations:** ornament rotation 260s linear infinite; ornament drift 12s ease-in-out; star twinkle 5–14s ease-in-out staggered; halo pulse 8s ease-in-out; thread breathe 7–14s ease-in-out staggered. All are ambient loops — nothing depends on them for legibility. Respect `prefers-reduced-motion` by disabling all of them; the chart stays fully readable static.
- **Loading and error states are not designed.** Ask before inventing them.
- **Responsive:** not designed. The results layout assumes ≥1320px. A mobile treatment needs its own pass.

## State Management

Prototype state, all local:

| Variable | Type | Purpose |
| --- | --- | --- |
| `baseDate` | `string` (`YYYY-MM-DD`) | the entered moment; default `1986-04-26` |
| `time` | `string` (`HH:MM`) | UT time; default `01:23` |
| `offset` | `number` | days added by the scrub slider, −400…400 |
| `hover` | `number \| null` | index of the hovered aspect row |

Everything else is derived per render: effective instant = `baseDate + time + offset days`, Julian Day, longitudes at t and t+1, bodies, aspect list, element/modality counts, moon phase. No fetching for the visualisation.

## Design Tokens

Colours are OKLCH (CSS Color 4). Hue 285–288 is the cool ink family, 85 the warm off-white and gold, 145 the verdigris accent, 25 the rust accent.

| Token | Value | Use |
| --- | --- | --- |
| ink | `oklch(0.115 0.012 285)` | page base |
| ink-raised | `oklch(0.122 0.014 286)` | footer bar |
| surface | `oklch(0.142 0.014 286)` | card |
| surface-inset | `oklch(0.105 0.012 285)` | inputs |
| chrome | `oklch(0.112 0.012 285)` | browser bar |
| border | `oklch(0.29 0.02 288)` | card and input borders |
| border-soft | `oklch(0.21 0.018 288)` | block dividers |
| rule | `oklch(0.185 0.014 286)` | table row rules |
| text | `oklch(0.92 0.012 85)` | body |
| text-strong | `oklch(0.94 0.012 85)` | headings |
| text-muted | `oklch(0.65 0.015 285)` | secondary |
| text-faint | `oklch(0.46 0.015 285)` | mono meta |
| accent | `oklch(0.70 0.13 145)` | verdigris: primary, harmonious aspects |
| accent-hover | `oklch(0.79 0.12 145)` | button hover |
| warn | `oklch(0.68 0.13 25)` | rust: hard aspects, retrograde |
| gold | `oklch(0.84 0.07 85)` | conjunctions, luminaries |
| page gradient | `radial-gradient(130% 70% at 50% -10%, oklch(0.185 0.022 288), oklch(0.115 0.012 285) 68%)` | |
| card shadow | `0 44px 100px -46px oklch(0.02 0 0 / 0.95)` | |

**Typography.** Display: Cormorant Garamond (300/400/500/600 + italic), fallback `Georgia, serif`. Data: IBM Plex Mono (300/400/500). Both from Google Fonts.

Scale: 33px page title · 31px empty-state headline · 24px section head · 17px body and table names · 15px inputs · 11.5px mono data · 10px mono meta · 9–9.5px mono labels (always uppercase with 0.18–0.2em letter-spacing).

**Spacing.** 4px base. Common: 4, 6, 8, 10, 14, 20, 22, 26, 32, 46, 58. **Radius:** 2px on every control; circles only in the visualisation. **Borders:** always 1px.

## Assets

None. No images, no icon font, no external SVG files. Planet, sign, and aspect symbols are Unicode characters rendered in IBM Plex Mono:

- Planets: `☽ ☉ ☿ ♀ ♂ ♃ ♄ ♅ ♆ ♇` (U+263D, 2609, 263F, 2640, 2642, 2643, 2644, 2645, 2646, 2647)
- Signs: `♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓` (U+2648–2653)
- Aspects: `☌ ☍ △ □ ⚹` (U+260C, 260D, 25B3, 25A1, 26B9)
- Retrograde: `℞` (U+211E)

Confirm IBM Plex Mono covers these on your target platforms; if any fall back, set an explicit fallback stack for symbol runs rather than swapping the whole font.

## Files

- `Retroactive Horoscope — Chart.dc.html` — the full prototype: empty state, results state, and the visualisation. Open it directly in a browser; the date field, time field, scrub slider, and row hover are all live.

The logic lives in the `class Component` block near the end of the file. `helio()`, `moonLon()`, `lonAt()`, and the `ELEM` table are the throwaway ephemeris — replace with `lib/ephemeris/`. `renderVals()` is the part worth reading: it is where positions become geometry, aspects, and counts.

## Repo context

Relevant constraints already documented in the repo README, restated so this file stands alone:

- `/chart` takes a past date only. No place, no houses, no angles (Sprint 6).
- No authentication. Anonymous, public tool.
- `readings.place_name` / `latitude` / `longitude` / `timezone` are vestigial and nullable — do not populate them.
- Saving returns a `/reading/[id]` link, and that link is the only access control. There is no listing route.
- Client must generate the reading id, because RLS has no `SELECT` policy on `readings`.
