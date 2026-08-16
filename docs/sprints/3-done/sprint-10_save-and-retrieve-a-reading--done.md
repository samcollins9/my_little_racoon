---
id: 10
title: "Save and retrieve a reading"
epic: "Thin Vertical Slice"
status: done
created: 2026-08-15T20:07:45+00:00
---

# Master Controller Sprint Definition — Sprint 10

**Epic:** Thin Vertical Slice
**Sprint Objective:** Save a reading anonymously and retrieve it at an unguessable link, under Sprint 4's policies — closing the loop from a date typed in to a stored artifact anyone with the link can open.

> **Rewritten 16 Aug 2026** for anonymous, link-addressed readings. The previous
> version assumed a signed-in owner; authentication has been cut from the exercise.

### Context

The closing sprint. Every layer meets every other one here: a date typed into a
public page, positions computed, a row written to Postgres through the anon key
under RLS, and a link that renders it for anyone who has it. Nothing new is proven
in isolation — what is proven is that the stack holds together on production.

The link **is** the access control. There are no accounts, so nothing else
distinguishes someone entitled to a reading from someone who is not. That places
the entire weight of this sprint on two things: ids that cannot be guessed, and the
absence of any way to list what exists. Sprint 4 wrote the policies; this sprint is
where they either hold or do not.

### Requirements

1. A migration extending `readings` to hold the date and the computed positions,
   applied through the Sprint 2 pipeline and obeying Sprint 5's expand-then-contract
   rule.
2. Saving a reading writes the date and positions with an unguessable id. No
   account, no session, no user concept.
3. All reads and writes use the anon client under Sprint 4's policies. **The service
   role key is not used anywhere in this feature.**
4. A saved reading is retrievable at a URL containing its id, and that page renders
   it for anyone holding the link.
5. Retrieval is by id only. **No listing route, no index of readings, no endpoint
   that returns more than one reading** — not for the UI, not for debugging.
6. Stored positions are read back as stored, not recomputed on load.
7. Save failures surface to the user as failures. No silent loss, and no success
   state shown for a write that did not complete.
8. Tests covering: save and retrieve round trip; a random unguessed id returns
   not-found; no listing route exists; a save failure surfaces an error.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: a new timestamped migration, no DDL outside `supabase/migrations/`, and no
  destructive change to an existing column.
- R2: ids come from a cryptographically unguessable source. A sequential integer, a
  timestamp-derived id, or anything an attacker could walk fails this — the link is
  the access control, and a guessable link is no access control.
- R3: **the criterion that matters most here.** A grep of the diff shows the service
  role key is not referenced in this feature. Using it bypasses every policy Sprint 4
  exists to enforce, and it would work perfectly, which is what makes it dangerous.
- R5: no route, handler, or query returns more than one reading. A listing endpoint
  added for convenience turns an unguessable link into a directory.
- R6: the round trip reads stored values. Recomputing positions on load does not
  satisfy this — it produces a reading that changes when the code does.
- R7: write failures propagate to the interface. An awaited call whose error is
  swallowed fails this criterion.
- R8: all four listed cases present with real assertions.

**GroundTruth — live, after Pipeman pushes:**

- On production, a date can be entered, a reading saved, and a link returned.
- Opening that link in a fresh session with no cookies renders the saved reading
  correctly. **This is the exercise's closing proof** — a full pass through Vercel,
  Supabase, RLS, and a migrated schema, verified from outside the system by a client
  that has never seen it before.
- A made-up id returns not-found rather than an error page or another reading.
- There is no reachable way to list readings.

### Out of Scope

- Editing or deleting a saved reading.
- Search, filtering, or any index of readings — forbidden by R5, not merely deferred.
- Export, PDF, and chart wheel rendering.
- Authentication in any form.
- Rate limiting and abuse prevention on the public write path. Real for a public
  product, out of scope for a proof of concept, named so its absence is a decision.
- Styling beyond legibility. The design pass follows.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Nothing. Final sprint of the exercise.
- **Blocked by:** Sprint 4 and Sprint 6. Policies must exist before anything is
  written; positions must exist before they can be stored.
- **External:** None.

### Risks & Mitigations

- **The service role key used to make saving work.** It bypasses RLS, so it works
  immediately and silently discards every guarantee Sprint 4 established. The symptom
  is that everything passes. — R3, checked as a direct grep.
- **Guessable ids.** The single point of failure in a product with no accounts. Every
  policy reports correct while anyone walks the table one request at a time. — R2.
- **A listing endpoint added for debugging.** Entirely reasonable-looking, and it
  converts unguessable links into a public index in one commit. — R5 forbids it
  outright, including for debugging.
- **Positions recomputed on load.** Cheaper to implement, and it means a saved
  reading silently changes whenever the calculation changes. — R6.
- **Silent save failure.** The write fails, the interface reports success, and the
  link leads nowhere. — R7.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned. Epic B stayed single-track throughout, as predicted in
  `docs/ROADMAP_v1.md`.
