---
id: 18
title: "Display and operability"
epic: "Synthesis PoC"
status: done
created: 2026-08-23T01:17:48+00:00
---

# Master Controller Sprint Definition — Sprint 18

**Epic:** Synthesis PoC
**Sprint Objective:** Show all three sources on the reading page, and close the three error-handling gaps carried since Sprint 14.

### Context

The closing sprint of the proof of concept. Everything is built; this is where it
becomes visible, and where three deferred fixes land together because they are the
same kind of problem.

Each was correctly deferred at the time. `saveReading` discarding its Supabase error
was restored intact by Sprint 14's revert, where fixing it would have been exactly
the scope creep that sprint forbade. `generate.ts` discarding the OpenAI error was
raised at Sprint 17's last static gate, too late to add a criterion. The 2100-12-31
crash violated no stated criterion, and QA1 declined to invent one on a final gate —
correctly. All three are now in scope, named, and cheap.

The pattern across them is worth stating: **a swallowed error is affordable until
someone has to diagnose a failure from outside the process.** Sprint 16 already
promoted this to a requirement for a free API. Sprint 17's has money behind it and
fails for quota, rate-limit and billing reasons that cannot be diagnosed from a
user-facing message.

### Requirements

1. `/reading/[id]` displays all three sources: the chart from `composeChart`, the
   events, and the horoscope.
2. The `matchedYear` flag is surfaced honestly — a reading whose events are the
   day-of-year fallback rather than that specific year says so. PRD §3.2 asks for
   this explicitly, and with 23 entries spanning ~900 years the fallback is the
   normal case, not the exception.
3. A regenerate control replacing Sprint 17's plain button. Regeneration overwrites
   in place, per PRD open item 3.
4. Null-safe throughout: `events` null, `horoscope` null, and both null each render
   sensibly. Readings created before Sprints 16 and 17 have both, including the
   Sprint 14 fixture.
5. **`generate.ts` logs the failure reason before surfacing the error.** Carried from
   Sprint 17 note 2. The user-facing message stays as it is; this adds a server-side
   log so a quota or billing failure is diagnosable from Vercel's logs.
6. **`saveReading` logs the Supabase error before redirecting.** Carried since Sprint
   14. Same shape, same reasoning.
7. **The `2100-12-31` generation crash is fixed.** Carried from Sprint 17 note 1:
   `computePromptAspects` adds a day to compute the later snapshot, which pushes past
   `MAX_SUPPORTED_DATE` and throws past the caller, producing a framework error page
   instead of the inline message every other failure produces. **Fall back to
   `composeChart`'s aspects when the later snapshot is out of range** rather than
   catching — catching yields "try again", which is misleading for a date that will
   never work.
8. Tests: the three display states from R4, the `matchedYear` label, and the
   `2100-12-31` path returning a result rather than throwing.

**Added 23 Aug 2026 from GroundTruth's Sprint 17 finding.**

9. **The horoscope column is untrusted input and must be rendered escaped.** Never
   `dangerouslySetInnerHTML`, never a markdown renderer that permits raw HTML, never
   any path that interprets its content as markup. GroundTruth demonstrated this
   rather than theorised it: using only the public anon key, they wrote arbitrary
   text into a reading's horoscope and the row accepted it. That is Sprint 17's R3 and
   R4 working exactly as specified — the link is the access control, as it has been
   since Sprint 4 — but it means the stored horoscope is attacker-controlled content
   for any shared link, and this sprint is what renders it.

   The realistic vector is not malice, it is convenience. The output is "two to four
   short paragraphs" arriving as one string, so someone will reasonably want it to
   render as paragraphs. **Split on newlines and map to `<p>` elements** — that stays
   escaped. Reaching for a markdown library to get the same result is what turns a
   shared link into stored XSS.
10. Styling stays plain — legibility only, consistent with Sprints 6 and 10. No design
    pass is scheduled and improvising one is not this sprint's job.

**Added 23 Aug 2026 from QA1 round 1, note 3.** QA1's PASS stands; this is new scope,
not a defect against what they audited.

11. **`README.md` carries a standing note on the horoscope rendering constraint.**
    R9 is currently enforced by this sprint file and by one code comment. Both close
    when the epic does. The note must state three things: the `horoscope` and `events`
    columns are anon-writable for anyone holding a reading id, so their contents are
    untrusted; they must be rendered as escaped text and never through
    `dangerouslySetInnerHTML`, a markdown renderer permitting raw HTML, or `innerHTML`;
    and any external URL from `events` must be scheme-checked before reaching an
    `href`. QA1 raised this as the one thing in the epic deserving a home outside a
    closed sprint file, and they are right — the requirement is most likely to be
    undone by someone reasonably trying to make prose render as paragraphs.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R5/R6: both log the underlying error before the user-facing path continues. The
  swallow itself remains correct in both cases; what changes is that the reason is
  recorded. An unchanged `catch { }` fails.
- R7: the fix is a fallback, not a `try/catch` around the throw. The distinction is
  the point — one produces correct output, the other produces a misleading retry
  prompt.
- R4: every null combination is handled explicitly rather than by rendering an empty
  region.
- R2: `matchedYear` is read from the stored payload, not inferred from whether the
  years happen to match.
- R9: **the criterion that matters most in this sprint.** The horoscope is rendered
  as escaped text. Any `dangerouslySetInnerHTML`, any markdown renderer without HTML
  disabled, or any `innerHTML` assignment on this value fails outright. Paragraph
  splitting via newline-to-`<p>` mapping satisfies the display need and stays safe.
- R10: no new styling system, no component library, no design tokens.
- R11: `README.md` covers all three points. A note mentioning only escaping is
  incomplete — the `sourceUrl` scheme check guards a separate path that React's
  escaping does not cover at all, since escaping protects text content and does
  nothing about a `javascript:` URL in an `href`.
- No schema change, no new migration, no DDL.

**GroundTruth — live, after Pipeman pushes:**

- A reading with all three sources shows chart, events, and horoscope, and states
  whether the events are year-matched or day-of-year.
- The Sprint 14 fixture reading — with `events` and `horoscope` both null — still
  opens and renders sensibly rather than erroring.
  https://my-little-racoon.vercel.app/reading/f8d046f7-6432-4961-b996-d65c9f623a8e
- Regenerating produces different prose and persists it. **This is the sprint's
  actual proof** — and it is what the whole proof of concept was for: three
  independent sources, synthesised, visible in one place, from outside the system.
- A reading for `2100-12-31` generates without a framework error page.

### Out of Scope

- Any design pass. R9 — plain and legible.
- Rate limiting, authentication, spend controls beyond the existing cap and kill
  switch.
- Tightening `set_reading_horoscope`'s `anon` grant. QA1 recorded it as a decision:
  R3 of Sprint 17 required that grant, so anyone holding a reading id can set its
  horoscope text. Acceptable at the same trust level as the public insert, and
  changing it would alter nothing a user sees.
- Keeping prior horoscopes; streaming; token accounting.
- The date-bound question — that the input accepts future dates on a retroactive
  tool. Real, raised in Sprint 6, and a product decision rather than a bug fix. R7
  closes the crash without it.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Nothing. Final sprint of the epic.
- **Blocked by:** Sprint 17.
- **External:** None.

### Risks & Mitigations

- **The carried fixes get deferred again.** Each has survived one deferral already,
  and a display sprint is where "we'll do it next time" is easiest to say. — R5, R6
  and R7 are requirements here, not notes.
- **R7 fixed by catching rather than falling back.** Both stop the crash; only one
  produces a correct answer. — Named in the acceptance criterion.
- **Null-handling gaps on older readings.** Every reading created before Sprint 16
  has null events and null horoscope, including the fixture that has verified every
  migration in this epic. — R4 and GroundTruth's second criterion.
- **Stored XSS through the horoscope column.** Anyone with a shared link can write
  arbitrary text into it, and this sprint renders it. The vector is a markdown library
  reached for to render paragraphs, not an attack anyone planned. — R9, checked as an
  explicit prohibition rather than an assumption that React escapes by default.
- **A design pass by accident.** The page finally has real content, which is exactly
  when someone starts styling it. — R10.
- **R9 is silently undone after this epic closes.** Enforced today by a sprint file
  about to be archived and one code comment. The next person wanting paragraphs to
  render nicely has no reason to know why a markdown library is forbidden. — R11
  moves the constraint somewhere it will still be read.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned.
