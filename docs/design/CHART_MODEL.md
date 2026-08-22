# Chart Data Model — reference for PRD planning

Generated 22 Aug 2026 by running the Sprint 12 engine directly. Every value below
is real output, not illustrative.

## Persisted vs derived — the distinction that should drive the PRD

**Persisted** (`public.readings`):

| Column | Type | Note |
|---|---|---|
| `id` | uuid | `gen_random_uuid()` default; generated server-side in `app/chart/actions.ts` |
| `event_date` | date | not null |
| `positions` | jsonb | not null as of `20260816181929` |
| `created_at` | timestamptz | not null |
| `place_name` | text | **nullable, vestigial** — from the pre-Sprint-6 model |
| `latitude` | numeric | **nullable, vestigial** |
| `longitude` | numeric | **nullable, vestigial** |
| `timezone` | text | **nullable, vestigial** |

**Derived on read, stored nowhere:** aspects, elements, modalities, moon phase,
Julian Day. All are pure functions of `positions`, which is persisted — so they are
fully reproducible from an existing row with no new columns.

## Types, as they exist in `lib/ephemeris/`

> **Known limitation in `applying`** — raised by QA1, 22 Aug 2026. `computeAspects`
> determines application by comparing positions at `t` and `t + 1 day`. QA1 measured
> roughly **one verdict in nine** differing when a shorter step is used, and judged
> the shorter step correct. Nothing renders application today, so nothing is currently
> wrong on screen — but any new UX consuming `applying` inherits this. Worth deciding
> deliberately in the next phase rather than discovering it in a reading.

```ts
// zodiac.ts
type ZodiacSign = "Aries" | "Taurus" | ... | "Pisces";

// adapter.ts
type PlanetName = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars"
                | "Jupiter" | "Saturn" | "Uranus" | "Neptune" | "Pluto";
type PlanetPosition = {
  body: PlanetName;
  eclipticLongitude: number;   // 0–360
  sign: ZodiacSign;
  degreeInSign: number;        // 0–30
  retrograde: boolean;
};
computePositions(date: Date): PlanetPosition[]
calculationInstantForDate(isoDate: string): Date   // fixes 12:00 UTC
instantFromDateAndTime(isoDate, isoTime): Date
MIN_SUPPORTED_DATE = 1700-01-01 ... MAX_SUPPORTED_DATE = 2100-12-31

// aspects.ts
type AspectName = "conjunction" | "opposition" | "trine" | "square" | "sextile";
type Aspect = {
  bodyA: PlanetName; bodyB: PlanetName;
  aspect: AspectName;
  orb: number;        // degrees from exact
  tightness: number;  // 1 - orb/maxOrb
  applying: boolean;  // false = separating
};
computeAspects(positionsNow, positionsLater): Aspect[]   // sorted by ascending orb

// balance.ts
type Element  = "Fire" | "Earth" | "Air" | "Water";
type Modality = "Cardinal" | "Fixed" | "Mutable";
countElements(positions): Record<Element, number>
countModalities(positions): Record<Modality, number>

// moon-phase.ts
type PhaseName = "New" | "Waxing crescent" | "First quarter" | "Waxing gibbous"
               | "Full" | "Waning gibbous" | "Last quarter" | "Waning crescent";
type MoonPhase = { elongation: number; waxing: boolean; phaseName: PhaseName };
computeMoonPhase(positions): MoonPhase

// julian-day.ts
julianDay(date: Date): number
```

## There is no composed page-level model

Nothing in the codebase declares a type that combines these. Sprint 13's
`app/chart/page.tsx` assembled it inline, and `app/chart/constellation.ts` held
presentation mappings — glyphs, ring order, colours — rather than a data model.
**Sprint 14 removes both.** After it lands, the engine is five independent functions
with no composed shape and no caller.

Defining that composed model is work the next phase should do deliberately rather
than re-improvise inline.

## Worked example — 1977-03-31

The date behind the Sprint 14 fixture reading. Instant `1977-03-31T12:00:00Z`,
Julian Day `2443234`.

### positions

| Body | Longitude | Sign | Degree | Rx |
|---|---|---|---|---|
| Sun | 10.6570 | Aries | 10.66 | no |
| Moon | 142.4510 | Leo | 22.45 | no |
| Mercury | 25.5231 | Aries | 25.52 | no |
| Venus | 19.8669 | Aries | 19.87 | yes |
| Mars | 338.8993 | Pisces | 8.90 | no |
| Jupiter | 59.3903 | Taurus | 29.39 | no |
| Saturn | 130.0549 | Leo | 10.05 | yes |
| Uranus | 220.9488 | Scorpio | 10.95 | yes |
| Neptune | 256.0949 | Sagittarius | 16.09 | yes |
| Pluto | 192.8839 | Libra | 12.88 | yes |

### aspects — 15 within orb, sorted tightest first

| A | B | Aspect | Orb | Tightness | Application |
|---|---|---|---|---|---|
| Sun | Saturn | trine | 0.60 | 0.914 | separating |
| Saturn | Uranus | square | 0.89 | 0.872 | applying |
| Mars | Uranus | trine | 2.05 | 0.707 | applying |
| Sun | Pluto | opposition | 2.23 | 0.722 | applying |
| Moon | Venus | trine | 2.58 | 0.631 | separating |
| Saturn | Pluto | sextile | 2.83 | 0.293 | applying |
| Moon | Mercury | trine | 3.07 | 0.561 | separating |
| Neptune | Pluto | sextile | 3.21 | 0.197 | separating |
| Venus | Neptune | trine | 3.77 | 0.461 | applying |
| Sun | Neptune | trine | 5.44 | 0.223 | applying |
| Mercury | Venus | conjunction | 5.66 | 0.293 | separating |
| Saturn | Neptune | trine | 6.04 | 0.137 | separating |
| Moon | Neptune | trine | 6.36 | 0.092 | separating |
| Moon | Jupiter | square | 6.94 | 0.009 | applying |
| Venus | Pluto | opposition | 6.98 | 0.127 | applying |

> **The Application column above is not reproducible by `composeChart`**
> (`lib/chart/model.ts`, Sprint 15). `computeAspects` needs a second
> position snapshot (~1 day later) to tell applying from separating, and
> `composeChart` only ever receives one — deriving a second one would mean
> calling `computePositions` internally, which Sprint 15's R4 forbids
> outright, so that composed charts can never silently disagree with the
> row they came from. `composeChart` instead calls
> `computeAspects(positions, positions)`, which reproduces every other
> column above exactly but makes `applying` mechanically always `false` —
> right for 7 of these 15 rows, wrong for the other 8. Confirmed
> deliberately, not a bug: see `lib/chart/model.ts`'s own comment. Whoever
> wires up Sprint 17's prompt template (which does plan to show
> applying/separating) needs a real second snapshot from somewhere and
> should not read this field as meaningful before then.

### balance and phase

- elements: Fire 6, Earth 1, Air 1, Water 2
- modalities: Cardinal 4, Fixed 4, Mutable 2
- moon phase: Waxing gibbous, elongation 131.79°, waxing true
