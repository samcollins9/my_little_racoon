---
id: 10
title: "Save and retrieve a reading"
epic: "Thin Vertical Slice"
status: todo
created: 2026-08-15T20:07:45+00:00
---

# Master Controller Sprint Definition — Sprint 10

**Epic:** Thin Vertical Slice
**Sprint Objective:** Persist a reading and its curated factor set under the Sprint 4 policies, and retrieve it from a library, closing the loop from input to stored artifact on production.

### Context

The closing sprint of the exercise. Every layer built so far meets every other one
here: a chart cast from user input, factors extracted and scored, a set curated by
hand, written to Postgres under row level security by an authenticated user, and
read back. Nothing new is proven in isolation; what is proven is that the stack
holds together on production.

Once this sprint closes, the exercise's definition of done in `docs/ROADMAP_v1.md`
should be assessed deliberately rather than assumed — including the requirement
that the full lifecycle has run cleanly twice, not once.

### Requirements

1. A migration extending `readings` to hold the chart input and the curated factor
   set, applied through the Sprint 2 pipeline and obeying Sprint 5's
   expand-then-contract rule.
2. Saving a reading writes the chart input, the extracted factors with their scores
   and identifiers, and the pin and dismiss state, owned by the signed-in user.
3. All reads and writes go through the authenticated user's session, under the
   Sprint 4 policies. **The service role key is not used anywhere in this feature.**
4. A library listing the signed-in user's saved readings, most recent first, showing
   enough to tell them apart.
5. Opening a saved reading restores the chart and the curated set exactly as saved,
   including which factors were pinned and dismissed.
6. Stored factors keep the identifiers from Sprint 8, so a saved reading refers to
   the same factors when reopened.
7. Save failures surface to the user as failures. No silent loss, and no success
   state shown for a write that did not complete.
8. Tests covering: save and retrieve round trip, curation state preserved, a user
   cannot retrieve another user's reading, and save failure surfaces an error.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: a new timestamped migration, no DDL outside `supabase/migrations/`, and no
  destructive change to an existing column.
- R3: **the criterion that matters most here.** A grep of the diff shows the service
  role key is not referenced in this feature. Using it would bypass every policy
  Sprint 4 exists to enforce, and it would work perfectly, which is what makes it
  dangerous.
- R5/R6: the round trip preserves identifiers and curation state. Regenerating
  factors on load instead of reading what was saved does not satisfy this — it
  produces a reading that changes when the code does.
- R7: write failures propagate to the interface. An awaited call whose error is
  swallowed fails this criterion.
- R8: all four listed cases present, including the cross-user retrieval test.

**GroundTruth — live, after Pipeman pushes:**

- Signed in on production, a reading can be created, curated, saved, and found in
  the library.
- Opening it restores the chart and the curated set exactly, with pins and
  dismissals intact.
- After signing out and back in, the reading is still there and still correct.
  **This is the exercise's closing proof** — a full pass through Vercel, Supabase
  Auth, RLS, and a migrated schema, verified from outside the system.

### Out of Scope

- Search and filtering of the library. §7.7 requires it; a chronological list
  satisfies this exercise.
- Editing or deleting a saved reading.
- Export in any form, and chart wheel rendering.
- Draft generation, traceability, significations.
- Blind mode, its lock, and its audit trail.
- Metrics instrumentation. §9 depends on this data existing, which it now will, but
  measuring it is beyond the exercise.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Nothing. This is the final sprint of the exercise.
- **Blocked by:** Sprints 4 and 9. Policies must exist before user data is written,
  and curation must exist before it can be persisted.
- **External:** None. Every account-level action was completed in earlier sprints.

### Risks & Mitigations

- **The service role key used to make saving work.** It bypasses RLS, so it works
  immediately and silently discards every guarantee Sprint 4 established. The
  symptom is that everything passes. — R3, checked as a direct grep, and the
  cross-user test in R8 which fails loudly if policies are being bypassed.
- **Factors regenerated on load rather than read.** Cheaper to implement and it means
  a saved reading silently changes whenever scoring changes — the opposite of the
  stable artifact §6 describes. — R5 and R6.
- **Silent save failure.** The write fails, the interface shows success, and the
  astrologer discovers it when the reading is gone. — R7.
- **Curation state lost in the round trip.** Pins and dismissals are the astrologer's
  judgement and, per §9, the most valuable data here. — R5 and R8.
- **A destructive migration.** Sprint 5's expand-then-contract rule exists precisely
  for a schema change on a table that now holds real data. — R1.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned. Epic B stayed single-track throughout, as predicted in
  `docs/ROADMAP_v1.md` — the chart model runs through every sprint from 6 onward, and
  splitting that across two worktrees would have created collisions rather than
  parallelism.
