---
id: 15
title: "Schema revision and composed chart model"
epic: "Synthesis PoC"
status: done
created: 2026-08-22T22:16:23+00:00
---

# Master Controller Sprint Definition — Sprint 15

**Epic:** Synthesis PoC
**Sprint Objective:** Revise `readings` to hold all three sources, and define the composed chart model that everything downstream reads from.

### Context

First sprint of PRD v2 (`retroactivehoroscopeprdv2poc.md`). It builds no feature —
it lays the shape the next three sprints depend on, which is why it is worth not
rushing. `docs/design/CHART_MODEL.md` records that after Sprint 14 the engine is
five independent functions with no composed type and no caller; Sprint 13 improvised
that shape inline and it was deleted with the rest. This sprint supplies it
deliberately.

`composeChart` takes **persisted positions**, not a date. That is the detail that
matters: it keeps the engine's determinism intact, makes the function testable
against the Sprint 14 fixture, and means displaying an old reading can never
silently recompute it against a newer ephemeris.

### Requirements

1. A migration dropping five vestigial columns: `event_time`, `place_name`,
   `latitude`, `longitude`, `timezone`. All predate Sprint 6's removal of place
   input; none is written by any deployed version.
2. A migration adding four columns, all nullable: `events` jsonb, `horoscope` text,
   `horoscope_generated_at` timestamptz, `horoscope_model` text. Nothing backfills
   them; existing readings keep null.
3. `lib/chart/model.ts` exporting `ChartModel`, `ReadingModel`, `DateEvent`, and
   `composeChart(date: string, positions: PlanetPosition[]): ChartModel`, per PRD §2.3.
4. `composeChart` composes from the positions passed to it and **never recomputes
   them**. No call to `computePositions` inside it.
5. Date validation rejects outside `1700-01-01`–`2100-12-31` with a clear message.
6. Isomorphic — no `node:` imports, no `server-only`. The model will be read in the
   browser, exactly as Sprint 12's engine is.
7. Tests: `composeChart` against the Sprint 14 fixture's stored positions, producing
   the recorded values in `docs/design/CHART_MODEL.md`; plus date-bound rejection.
8. No UI change, no events fetching, no OpenAI. The four new columns ship empty.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: **the expand-then-contract check, and the first time it has ever bitten.**
  Dropping a column is a contract operation. It is permitted here only because no
  deployed version reads or writes those columns — `saveReading` inserts exactly
  `id`, `event_date`, `positions`. QA1 confirms by grep across `app/` and `lib/`
  rather than accepting it from this file. If any reference exists, the drop waits.
- R2: all four new columns are nullable. A `not null` on any of them breaks inserts
  from the currently deployed version and fails outright.
- R1/R2: DDL lives only in `supabase/migrations/`, timestamped, and the
  `schema_migrations` ledger insert is present — the convention QA1 has flagged as
  enforced by nothing.
- R4: no `computePositions` call inside `composeChart`. A model that recomputes is a
  model that can disagree with the row it came from.
- R6: grep shows no `node:` import or `server-only` marker in the reachable graph.
- R7: the fixture test asserts specific values from `CHART_MODEL.md`, not merely that
  an object was returned.

**GroundTruth — live, after Pipeman pushes:**

- `/api/health/db` reports the new migration version, and the shipped commit.
- The Sprint 14 fixture reading still opens and renders identically —
  https://my-little-racoon.vercel.app/reading/f8d046f7-6432-4961-b996-d65c9f623a8e
  — compared value by value against the table in Sprint 14's file. **This is the
  sprint's actual proof:** five columns were dropped from a table holding real rows,
  and this is what shows the rows survived it.
- A new reading can still be created and retrieved at its link.

### Out of Scope

- Wikipedia event lookup — Sprint 16. `events` ships empty.
- OpenAI, the prompt template, and the horoscope write path — Sprint 17. Its
  `SECURITY DEFINER` write function lands there, with the caller that exercises it,
  rather than shipping untested here.
- Any UI change — Sprint 18.
- Backfilling any new column.
- Fixing `saveReading`'s discarded Supabase error, carried from Sprint 14's audit.
  It belongs to this epic but not to this sprint; Sprint 18 is its natural home.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Sprints 16, 17, and 18. All three read this model or write these columns.
- **Blocked by:** Sprint 14, at `complete_ready` — close it first, so the revert is a
  settled baseline rather than a sprint still in flight.
- **External:** None.

### Risks & Mitigations

- **A dropped column turns out to be read somewhere.** Contract operations are the
  irreversible half of expand-then-contract, and the rule has never been tested here.
  — R1's grep, as a named QA1 check rather than a claim inherited from this file.
- **A new column marked `not null`.** It would reject inserts from the running app
  before the new code ships. — R2.
- **`composeChart` recomputes positions.** Convenient, and it silently decouples a
  stored reading from what it displays. — R4.
- **The composed model drifts from what the PRD specified.** It is the shape three
  sprints read; getting it wrong is expensive downstream. — R3 names PRD §2.3 as the
  reference.
- **Real rows lost in the migration.** `readings` holds live data including the
  fixture. — GroundTruth's second criterion checks it from outside.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned. Sprints 16 and 17 both depend on this shape; starting
  either in parallel would build against a moving target.
