---
id: 14
title: "Revert chart UI to text-only"
epic: "Data Model Revision"
status: done
created: 2026-08-22T12:46:06+00:00
---

# Master Controller Sprint Definition — Sprint 14

**Epic:** Data Model Revision
**Sprint Objective:** Restore `/chart` to its pre-Sprint-13 text-only form — a date in, positions rendered as text, a reading saved — while leaving Sprint 12's aspect engine, Sprint 11's redirect, and Sprint 10's save-and-retrieve untouched.

### Context

Sprint 13's Aspect Constellation was aborted before it closed: the UX is being
withdrawn ahead of a data-model revision, not because it failed. A new PRD will add
fields to each chart date and a new UX will be built on them. Sprint 13's interface
was designed against the current model and would have to be rebuilt regardless, so
it comes out now rather than being maintained through a migration it cannot survive.

This is a **revert, not a redesign**. The page goes back to what it was. Every
temptation to improve it on the way past is scope creep against a sprint whose only
value is returning to a known-good state that the next phase can build from
confidently. A revert that half-implements the next thing is neither thing.

Sprint 13 changed no schema, which makes this far cleaner than it could have been.
It did change `app/chart/actions.ts` — the save path — which is why data continuity
is this sprint's sharpest question and not an afterthought.

### Requirements

1. `/chart` restored to its pre-Sprint-13 form at commit `080ce1e`: date input,
   planetary positions rendered as text, reading saved.
2. Sprint 13's artifacts removed entirely — `app/chart/chart.module.css`,
   `app/chart/constellation.ts`, `app/chart/constellation.test.ts` — with no
   orphaned import, no dead style reference, and no dependency left in
   `package.json` that only Sprint 13 used.
3. `app/chart/actions.ts` restored to its `080ce1e` form, preserving server-side id
   generation via `node:crypto` and save failures surfacing to the user.
4. **Sprint 12's aspect engine is untouched.** `lib/ephemeris/aspects.ts`,
   `balance.ts`, `julian-day.ts`, `moon-phase.ts` and their tests remain, and their
   tests keep running in CI. They become unused by the UI and **that is intentional**
   — the next phase's data model is expected to consume them, and deleting tested
   working code to re-derive it in three weeks is a worse trade than carrying it
   unused.
5. Sprint 11's `/` → `/chart` redirect and the deployed-commit SHA in
   `/api/health/db` are unaffected.
6. Sprint 10's guarantees are unaffected: unguessable ids, no listing route,
   surfaced save failures, retrieval by id only.
7. **No schema change.** Sprint 13 made none and this revert makes none.
8. `README.md` reflects the reverted UI, and records why the aspect engine is
   retained while unused — otherwise the next reader deletes it as dead code.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1/R2/R3: the diff undoes `2fb6062` and `9b132e3`, **plus exactly the README
  paragraph R8 requires, and nothing else.** Any other change fails this criterion,
  including improvements to the restored page. This is what keeps a revert a revert.

  **Amended 22 Aug 2026 after QA1 round 1.** This previously read "and nothing else",
  full stop, which contradicted R8: a README note explaining why the aspect engine is
  retained is by definition not attributable to reverting those two commits. Read both
  criteria literally — as QA1 correctly did — and the only commit satisfying R1 fails
  R8, and vice versa. The distinction that resolves it: **R8's note is work this sprint
  asks for, and is therefore attributable to the sprint; an improvement to the restored
  page is not.** My contradiction, not Dev Team's error, and recorded here so the next
  revert sprint does not re-run it.
- R2: grep confirms no surviving reference to `chart.module.css` or `constellation`,
  and `package.json` carries no dependency introduced by Sprint 13.
- R3: id generation is still server-side via `node:crypto`; a write failure still
  propagates rather than being swallowed.
- R4: `lib/ephemeris/` is byte-identical to its state at `080ce1e`, and its tests
  are still wired into the suite rather than skipped because nothing calls them.
- R5: the redirect and the health endpoint's commit block are present and unchanged.
- R6: the no-listing-route guardrail and the RLS tests are intact and still run.
- R7: no DDL anywhere in the diff, and no new file under `supabase/migrations/`.

**GroundTruth — live, after Pipeman pushes:**

- **The fixture reading below still opens and renders identically.** *This is the
  sprint's actual proof.* Sprint 13 changed the save path; the schema did not, so a
  Sprint-13-era row should render — but "should" is doing real work in that sentence.
  It cannot be tested after the fact, because once this sprint deploys no one can
  create another such row.

  Fixture, captured from production at `9b132e3` on 22 Aug 2026, before the revert:
  https://my-little-racoon.vercel.app/reading/f8d046f7-6432-4961-b996-d65c9f623a8e

  It returned 200 and rendered exactly this. Compare against it value by value —
  a page that loads is not the same as a page that is right, and the failure mode
  here is a silently altered number, not a blank screen.

  | Body | Sign | Degree | Retrograde |
  |---|---|---|---|
  | Sun | Aries | 10.66 | No |
  | Moon | Leo | 22.45 | No |
  | Mercury | Aries | 25.52 | No |
  | Venus | Aries | 19.87 | Yes |
  | Mars | Pisces | 8.90 | No |
  | Jupiter | Taurus | 29.39 | No |
  | Saturn | Leo | 10.05 | Yes |
  | Uranus | Scorpio | 10.95 | Yes |
  | Neptune | Sagittarius | 16.09 | Yes |
  | Pluto | Libra | 12.88 | Yes |

  Heading reads `Reading for 1977-03-31`. Note that `/reading/[id]` was out of
  Sprint 13's scope and is unchanged by it, so any difference after the revert is a
  data problem, not a rendering one.
- `/` returns a redirect to `/chart`, and `/chart` serves the text-only page. A date
  produces planetary positions.
- Saving returns a link, and opening it in a fresh session with no cookies renders
  the reading — Sprint 10's round trip surviving the revert.
- `/api/health/db` reports the shipped commit.

### Out of Scope

- **Removing Sprint 12's aspect engine.** Deliberate — see R4.
- Any new data model work, new fields, or anything from the forthcoming PRD. This
  sprint returns to known-good; the next one builds forward.
- Any improvement, refactor, or cleanup of the restored page. It goes back as it was,
  including anything about it that looks improvable.
- Schema changes of any kind.
- Redesigning `/reading/[id]`.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.
- **`@supabase/ssr` in `package.json`.** Uncommitted at QA1 round 1, imported nowhere,
  and traceable to the aborted Sprint 3 auth work — it entered there and left at
  `f90429a`. It is not part of this revert and must be discarded, not committed:
  `git checkout package.json package-lock.json`. Discard both together, since the
  committed pair is currently consistent and committing one would break that. If there
  is a reason to keep it that is not visible from the diff, it belongs here as a
  recorded deviation rather than arriving silently.

### Carried to the next phase — raised by QA1, not this sprint's work

- **`saveReading` discards the Supabase error rather than logging it.** Restored
  intact by this revert, which is correct; fixing it here is exactly the scope creep
  R1 forbids. It belongs in the next phase's sprint rather than being lost.
- **Sprint 12's applying/separating uses a one-day lookahead.** Nothing renders A/S
  today, but the engine still computes it and whatever consumes it next inherits the
  decision. QA1 measured roughly one verdict in nine differing with a shorter step,
  and judged the shorter step correct. See `docs/design/CHART_MODEL.md`.

### Dependencies

- **Blocks:** the next phase's data-model work, which should not be built on a UI
  scheduled for removal.
- **Blocked by:** Sprint 13's abort — complete.
- **External:** Satisfied 22 Aug 2026. The fixture reading was captured from
  production at `9b132e3` before the revert, and both its link and its expected
  rendered values are recorded in the GroundTruth criteria above. Nothing further is
  needed from the user for this sprint.

### Risks & Mitigations

- **~~The fixture is not captured in time.~~** Closed 22 Aug 2026 — captured before
  any work began, with its expected values recorded rather than just its URL, so the
  comparison is exact rather than an impression.
- **The revert takes out more than intended.** Sprint 11's redirect, the health SHA,
  and Sprint 12's engine all sit near the reverted code and none of them are Sprint
  13's. — R4, R5, R6, each checked individually rather than as a general impression.
- **The revert takes out less than intended.** Orphaned CSS, a dead import, a
  dependency nothing uses — none of which break the build, all of which leave the
  next phase building on debris. — R2, checked by grep.
- **"While we're in there."** The restored page has known rough edges; this is the
  worst possible moment to address them, because a revert diff that also contains
  improvements cannot be verified as a revert. — The first acceptance criterion
  treats any non-revert change as failure.
- **Sprint 13's save-path changes silently dropped something.** `actions.ts` gained
  35 lines and lost 18; restoring it wholesale is right, but the round-trip criterion
  is what proves it. — GroundTruth's second and third criteria together.
- **The aspect engine gets deleted as dead code.** After this sprint it is genuinely
  unreferenced, and a tidy-minded reader will remove it. — R4 and R8, with the reason
  written into the README rather than living only here.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned. Single coherent revert; a second checkout would only
  reproduce the tree-hash problem from Sprint 11.
