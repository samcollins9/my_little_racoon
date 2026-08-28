---
id: 17
title: "Horoscope generation"
epic: "Synthesis PoC"
status: done
created: 2026-08-23T00:41:39+00:00
---

# Master Controller Sprint Definition — Sprint 17

**Epic:** Synthesis PoC
**Sprint Objective:** Generate a horoscope from the chart and the events via OpenAI, persist it through a `SECURITY DEFINER` write path, and put the whole thing behind a kill switch.

### Context

The sprint the proof of concept exists for: three independent sources — computed
positions, retrieved events, generated prose — meeting in one row. Everything before
this was plumbing.

Two things make it different from every sprint so far. **It writes to an existing
row**, which the RLS model does not currently permit — Sprint 4 grants insert and a
`SECURITY DEFINER` read, and denies update outright. And **it spends money on a
public, unauthenticated endpoint**, which no previous sprint has done.

A minimal trigger ships here rather than waiting for Sprint 18. Without one, the
generation path could not be exercised live, and a sprint that cannot be
live-tested is a sprint whose acceptance criteria are hypothetical. Sprint 18 builds
the designed display; this sprint builds a plain button that proves the pipeline runs.

### Requirements

1. `lib/llm/horoscope.ts` exporting `generateHoroscope(reading: ReadingModel):
   Promise<{ text: string; model: string }>`, temperature `0.9` per PRD §4.1 —
   nondeterminism is the point here, not a defect.
2. The prompt template of PRD §4.2, with §4.3's three decisions applied: **top 6
   aspects only**, degrees **rounded to two decimals**, and the "invent no
   astrological data" instruction retained.
3. A migration adding `public.set_reading_horoscope(reading_id uuid, horoscope text,
   model text)` as `SECURITY DEFINER` with `set search_path = public`, granted to
   `anon`. It sets exactly `horoscope`, `horoscope_generated_at`, and
   `horoscope_model` and nothing else.
4. **No update policy is added to `readings`.** The function is the entire write
   surface. Sprint 4's deny-update property must still hold after this sprint.
5. `OPENAI_API_KEY` is read server-side only. Never `NEXT_PUBLIC_`-prefixed, never
   reachable from a client component or anything one imports.
6. `HOROSCOPE_ENABLED` gates generation. Absent or any value other than an explicit
   disable means **enabled**, so the feature cannot ship silently off. When disabled,
   no OpenAI call is made and the interface says so plainly rather than appearing
   broken.
7. Generation is **explicit, not automatic**. It runs when requested, never on
   reading creation. A reading that already has a horoscope does not regenerate
   unless regeneration is explicitly requested; regeneration overwrites in place.
8. **Failures surface.** Unlike Sprint 16's event fetch, which degrades silently
   because nobody asked for it, a user pressed this button — an OpenAI error,
   timeout, or rate limit must be shown, and must leave the stored reading unchanged.
   No partial write, no success state for a failed generation.
9. A minimal unstyled generate button on `/reading/[id]`, sufficient to trigger and
   observe the path. Sprint 18 replaces it.
10. **No test may call OpenAI.** The client is mocked. A live call in CI costs money
    on every push and makes the build flaky for reasons unrelated to the code.
11. Tests: prompt assembly from a known `ReadingModel` including the top-6 and
    rounding rules, the disabled-flag path, an API failure surfacing, and the
    persisted columns after a successful generation.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R3/R4: **the criterion that matters most.** The migration adds a `SECURITY DEFINER`
  function with `set search_path = public` — the same hardening `get_reading_by_id`
  carries, and for the same reason. It writes exactly the three horoscope columns. No
  `create policy ... for update` appears anywhere. A function accepting a column name,
  a JSON patch, or arbitrary fields is an update policy wearing a disguise and fails
  this outright.
- R5: a grep shows `OPENAI_API_KEY` is not `NEXT_PUBLIC_`-prefixed and appears only
  in server-only modules. This is the same check applied to the service role key in
  Sprint 2 and Sprint 10, and it matters more here because this key has a credit card
  behind it.
- R6: the flag defaults to enabled when absent. A default of disabled fails — it
  would ship a path that never runs in production, which is the failure mode this
  design was chosen to avoid.
- R7: no generation call on the reading-creation path.
- R8: the failure path surfaces to the interface and performs no write. An awaited
  call whose error is swallowed fails this, and the distinction from Sprint 16 is
  deliberate rather than an inconsistency.
- R10: no test performs a real network call to OpenAI. Grepped, not assumed.
- R2: the prompt sends 6 aspects, not 15. The fixture's tail includes a Moon–Jupiter
  square at 0.009 tightness, which is noise that dilutes everything above it.
- No DDL outside `supabase/migrations/`, and the `schema_migrations` ledger insert
  is present.

**GroundTruth — live, after Pipeman pushes:**

- On a reading with events, requesting generation produces a horoscope that is
  persisted and survives a reload. **This is the sprint's actual proof** — three
  independent sources in one row, verified from outside.
- The generated text references planets, signs, or aspects that were actually in the
  payload. Not a quality judgement — the output is explicitly not being judged — but
  prose citing placements absent from the data means the model ignored the pipeline,
  which is the one thing this PoC exists to demonstrate.
- With `HOROSCOPE_ENABLED` set to disabled, no generation occurs and the interface
  says so. Set it back afterwards.
- A reading with `events` null still loads and does not error.

### Out of Scope

- The designed display — Sprint 18. R9's button is deliberately plain.
- Rate limiting, per-IP throttling, and abuse prevention. The OpenAI account spend
  cap is the control, and it is the only one that cannot be bypassed by a bug in this
  code. Named as an accepted risk rather than an oversight.
- Authentication. Cut from this project; re-adding it is roughly the aborted Sprint 3.
- Keeping prior horoscopes. Regeneration overwrites, per PRD open item 3.
- Streaming responses, token accounting, model selection UI, prompt tuning tools.
- Backfilling horoscopes onto existing readings.
- Fixing `saveReading`'s discarded Supabase error, carried since Sprint 14 — Sprint 18.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Sprint 18.
- **Blocked by:** Sprint 16, complete. The prompt needs events.
- **External:** `OPENAI_API_KEY` and `HOROSCOPE_ENABLED` are both already set in
  Vercel for Production and Preview, and a spend cap is in place on the OpenAI
  account. Nothing outstanding.

### Risks & Mitigations

- **An update policy added to make the write work.** The direct route, and it would
  let anyone holding a link overwrite that reading's contents — dismantling Sprint 4
  in one line while looking like a routine migration. — R3 and R4, with QA1 checking
  for the absence of a policy as a named item.
- **The OpenAI key reaches the client bundle.** Worse than the service role key,
  because this one bills. — R5.
- **A test calls the real API.** Cost on every push, flakiness unrelated to the code,
  and it grows with the suite. — R10, grepped.
- **The flag ships defaulting to disabled.** It would look safe and would mean the
  path never runs where it matters. — R6.
- **A failed generation writes a partial or empty horoscope.** Worse than no
  horoscope, because it looks like a real result and blocks regeneration under R7. —
  R8.
- **Spend on a public endpoint.** Accepted knowingly: no auth, no rate limiting, a
  public button that costs money per press. The spend cap bounds the loss to a known
  ceiling, and the kill switch turns it off without a redeploy. Not a security
  incident — a bill with a maximum.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned. Sprint 18 depends on this sprint's stored shape.
