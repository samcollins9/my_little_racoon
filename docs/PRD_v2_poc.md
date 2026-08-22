# Retroactive Horoscope — PRD v2 (Proof of Concept)

**Status:** Draft — supersedes the earlier v2 draft
**Author:** Sam Collins
**Date:** August 22, 2026
**Reference:** `CHART_MODEL.md` (Sprint 12 engine output, 22 Aug 2026)

---

## 1. What this is

A proof of concept demonstrating synthesis of three independent data sources through an LLM client:

| Source | Produces | Nature |
|---|---|---|
| Ephemeris engine (`lib/ephemeris/`) | Planetary positions and everything derived from them | Computed, deterministic |
| Wikipedia on-this-day API | Things that happened on the date | Retrieved, external |
| OpenAI | A horoscope explaining the events via the astrology | Generated, nondeterministic |

The output is explicitly **for entertainment**. It makes no claim to astrological rigor, adheres to no tradition, and is not intended to be defensible. The goal is a working pipeline that pulls from two unrelated sources and produces something coherent and fun from both.

Three deliverables: revise the data model, add event lookup, add an LLM client with a prompt template.

### Explicitly out of scope

Called out because the previous draft specified all of it, and dropping it is a decision rather than an oversight: source-validation gates against fabrication, curated astrological doctrine tables, blind-mode integrity mechanics, per-date event normalization, correspondence matching with null results, and coverage beyond the engine's supported range. None of it belongs in a PoC whose output is avowedly not serious.

---

## 2. Data model

### 2.1 The rule, applied

`CHART_MODEL.md` states the principle well: every derived value — aspects, elements, modalities, moon phase, Julian Day — is a pure function of `positions`, so it is reproducible from an existing row and earns no column. Applying that same test to the two new values:

| Value | Pure function of `positions`? | Verdict |
|---|---|---|
| aspects, elements, modalities, moon phase, Julian Day | Yes | Stay derived. No change. |
| `events` | No — external retrieval | **Persist.** Nothing in the chart implies what happened that day. |
| `horoscope` | No — nondeterministic model output over positions *and* events | **Persist.** Re-running the same inputs yields different prose; a stored reading that regenerates its own horoscope on every view is not a stored reading. |

The rule holds and points cleanly in both directions.

### 2.2 Migration

```sql
-- Drop the vestigial place columns. Nothing writes them; all values are null.
alter table readings
  drop column place_name,
  drop column latitude,
  drop column longitude,
  drop column timezone;

-- Add the two new sources, mirroring how positions already works.
alter table readings
  add column events                 jsonb,
  add column horoscope              text,
  add column horoscope_generated_at timestamptz,
  add column horoscope_model        text;
```

After this, one row holds all three sources — `positions` from the ephemeris, `events` from Wikipedia, `horoscope` from OpenAI. The entire proof of concept is visible in a single `SELECT`, which is worth something when demonstrating it.

`horoscope_generated_at` and `horoscope_model` are two cheap columns that pay for themselves immediately: during a PoC the prompt changes ten times in an afternoon, and knowing which rows came from which model and when is the difference between iterating and guessing.

**One thing to confirm:** the sample row shared earlier had an `event_time` column, but the persisted-column table in `CHART_MODEL.md` omits it. If it still exists it belongs in the same vestigial category — `calculationInstantForDate` fixes the instant at 12:00 UTC and nothing in the current path supplies a time. Worth checking against the live schema before writing the migration.

### 2.3 The composed model

`CHART_MODEL.md` notes that after Sprint 14 the engine is five independent functions with no composed shape and no caller, and that defining that shape deliberately is work for the next phase. This phase supplies the caller, so it should supply the shape.

```ts
// lib/chart/model.ts

type ChartModel = {
  date:       string;                      // ISO date — the reading's event_date
  julianDay:  number;
  positions:  PlanetPosition[];
  aspects:    Aspect[];                    // sorted tightest first
  elements:   Record<Element, number>;
  modalities: Record<Modality, number>;
  moonPhase:  MoonPhase;
};

// Composes from PERSISTED positions rather than recomputing them, so a stored
// reading and a fresh calculation produce an identical model.
function composeChart(date: string, positions: PlanetPosition[]): ChartModel;

type DateEvent = {
  year: number;
  text: string;
  sourceUrl?: string;
};

type ReadingModel = {
  id:        string;
  chart:     ChartModel;
  events:    DateEvent[];
  horoscope: string | null;
};
```

`composeChart` taking persisted positions as an argument rather than a date is the detail that matters. It keeps the engine's determinism intact, makes the function trivially testable against the Sprint 14 fixture, and means displaying an old reading never silently recomputes it against a newer ephemeris.

### 2.4 Date bounds

The engine supports `1700-01-01` through `2100-12-31`. Validation should reject outside that range with a clear message rather than producing a chart the ephemeris can't stand behind. (The earlier draft assumed a ~1500 range — superseded.)

---

## 3. Event lookup

### 3.1 Endpoint

```
GET https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/{MM}/{DD}
```

Zero-padded two-digit month and day. No authentication, no key, no cost. Wikimedia asks for a descriptive `User-Agent` identifying the application — set one.

Response is an object containing an array of events, each carrying a `year`, a `text` string, and linked `pages`. *Note:* Wikimedia domains are not fetchable from the environment this PRD was drafted in, so the exact field names should be confirmed on the first real call rather than taken from this document. The path format is confirmed from the Wikifeeds documentation, which also flags the endpoint as **experimental** — fine for a PoC, worth remembering if this ever grows up.

### 3.2 The day-of-year wrinkle

This is the one thing that will bite on day one: the API is keyed on **month and day, not on a full date**. A request for `03/31` returns notable March 31st events from across all of history, not events from March 31st of the year you asked about.

Recommended handling:

1. Fetch `{MM}/{DD}`.
2. Filter to `year === reading.year`. If anything matches, use it and set `matchedYear: true`.
3. If nothing matches — which will be the common case, since any given year contributes at most a couple of entries — fall back to the unfiltered set, take the top 3–5, and set `matchedYear: false`.

The fallback is what makes the demo reliable: every date in range returns material, so the pipeline never has an empty middle. It is also thematically harmless here. A horoscope that explains what March 31st *means as a day* across history is, if anything, a slightly better demo than one tied to a single year, and nothing about this product is claiming otherwise.

Store the flag in the `events` jsonb so the UI can label it honestly.

### 3.3 Shape stored

```json
{
  "source": "wikipedia-onthisday",
  "requestedDate": "1977-03-31",
  "matchedYear": false,
  "fetchedAt": "2026-08-22T14:02:11Z",
  "events": [
    { "year": 1889, "text": "...", "sourceUrl": "https://en.wikipedia.org/wiki/..." }
  ]
}
```

Cache by `MM/DD` — the response is identical for every reading of the same calendar day, so one fetch per day-of-year serves everything.

---

## 4. LLM client and prompt template

### 4.1 Client

One function, no abstraction layer:

```ts
// lib/llm/horoscope.ts
async function generateHoroscope(reading: ReadingModel): Promise<{
  text: string;
  model: string;
}>;
```

Temperature **0.9**. This is the one place across both drafts where nondeterminism is the point — the same date should be able to produce a different reading on a second run, because the output is entertainment and variety is a feature.

### 4.2 Prompt template

**System:**

```
You are an astrologer writing playful retroactive horoscopes for entertainment.

You will be given the astrological conditions of a specific date, and a list of
things that happened on that date. Write a short horoscope that explains those
events as though the astrology caused them.

Rules:
- Name actual planets, signs, and aspects from the data you are given.
- Connect specific placements to specific events. Do not be vague.
- Commit to it. No hedging, no "may have," no disclaimers, no acknowledging
  that this is retroactive.
- Warm and a little grand. Never ominous.
- Two to four short paragraphs.
- Invent no astrological data beyond what is supplied.
```

**User:**

```
DATE: {{date}}

POSITIONS
{{#positions}}
{{body}} in {{sign}} at {{degreeInSign}}°{{#retrograde}} (retrograde){{/retrograde}}
{{/positions}}

TIGHTEST ASPECTS
{{#topAspects}}
{{bodyA}} {{aspect}} {{bodyB}} — orb {{orb}}°, {{applyingLabel}}
{{/topAspects}}

BALANCE
Elements: Fire {{elements.Fire}}, Earth {{elements.Earth}}, Air {{elements.Air}}, Water {{elements.Water}}
Modalities: Cardinal {{modalities.Cardinal}}, Fixed {{modalities.Fixed}}, Mutable {{modalities.Mutable}}
Moon: {{moonPhase.phaseName}}

WHAT HAPPENED
{{#events}}
{{year}}: {{text}}
{{/events}}

Write the horoscope.
```

### 4.3 Three template decisions worth making deliberately

**Send the top 6 aspects, not all of them.** The 1977-03-31 fixture produces 15 aspects within orb, and the tail is noise — Moon square Jupiter sits at a tightness of 0.009, meaning it barely qualifies at all. Feeding all 15 gives the model a menu to pick from and dilutes everything above it. Six is more than enough material for four paragraphs.

**Round degrees to two decimals in the prompt.** The stored values carry ~15 significant digits; `10.656992801956903°` spends tokens and reads as noise. `10.66°` carries every bit of meaning the model can use.

**Keep "invent no astrological data" even though accuracy is not the goal.** The reason is demo quality, not rigor: the entire point is showing that the LLM synthesized *the supplied inputs*. A horoscope citing planets that weren't in the payload looks like the model ignored the pipeline, which is precisely the opposite of what the PoC is meant to show.

---

## 5. Worked example — 1977-03-31

Real chart data from the Sprint 14 fixture. Events are placeholders, since the live API response could not be verified from this environment.

**Assembled prompt (abbreviated):**

```
DATE: 1977-03-31

POSITIONS
Sun in Aries at 10.66°
Moon in Leo at 22.45°
Mercury in Aries at 25.52°
Venus in Aries at 19.87° (retrograde)
Mars in Pisces at 8.90°
Jupiter in Taurus at 29.39°
Saturn in Leo at 10.05° (retrograde)
Uranus in Scorpio at 10.95° (retrograde)
Neptune in Sagittarius at 16.09° (retrograde)
Pluto in Libra at 12.88° (retrograde)

TIGHTEST ASPECTS
Sun trine Saturn — orb 0.60°, separating
Saturn square Uranus — orb 0.89°, applying
Mars trine Uranus — orb 2.05°, applying
Sun opposition Pluto — orb 2.23°, applying
Moon trine Venus — orb 2.58°, separating
Saturn sextile Pluto — orb 2.83°, applying

BALANCE
Elements: Fire 6, Earth 1, Air 1, Water 2
Modalities: Cardinal 4, Fixed 4, Mutable 2
Moon: Waxing gibbous

WHAT HAPPENED
[3–5 events from the API]

Write the horoscope.
```

**Expected output shape**, in the register the brief describes:

> Six of ten bodies burning in Fire, and a Moon swelling toward full in Leo — this was never going to be a quiet day. Aries held the Sun, Mercury, and a retrograde Venus, which is the sky's way of saying that something old was about to be attempted again, louder.
>
> Saturn in Leo squared Uranus in Scorpio at less than a degree, still closing. That is the signature of a structure meeting the thing that will not respect it...

The fixture is a good demo date on its own merits: heavily Fire-weighted, five retrogrades, and a sub-degree applying square between Saturn and Uranus that gives the model something genuinely specific to hang a narrative on.

---

## 6. Build sequence

1. Migration — drop the four vestigial columns, add the four new ones
2. `lib/chart/model.ts` — `composeChart`, `ChartModel`, `ReadingModel`, tested against the Sprint 14 fixture
3. Wikipedia client — fetch, year-filter with day-of-year fallback, cache by `MM/DD`
4. Persist `events` on reading creation
5. `lib/llm/horoscope.ts` — client and prompt template
6. Generate on demand from the reading view; persist `horoscope`, `horoscope_generated_at`, `horoscope_model`
7. Display: chart, events, horoscope, with a regenerate button

Step 2 is the one worth not rushing. It is the shape everything downstream reads from, and `CHART_MODEL.md` is right that improvising it inline again would be the wrong move.

---

## 7. Open items

1. Does `event_time` still exist on `readings`? If so it drops with the other vestigial columns.
2. Confirm the on-this-day response field names on first integration.
3. Regenerate behavior — overwrite in place, or keep prior horoscopes? Overwrite is right for a PoC; keeping them is one extra table if the demo turns out to be about showing variety.
4. Where does generation trigger — automatically on reading creation, or an explicit button? A button gives a better live demo, since the audience sees the pipeline run.
