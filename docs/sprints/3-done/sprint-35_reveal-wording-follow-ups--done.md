---
id: 35
title: "Reveal wording follow-ups"
epic: "Date pages"
status: done
created: 2026-11-23T03:13:07+00:00
---

# Master Controller Sprint Definition — Sprint 35

**Epic:** Date pages. The app is addressed by date, and each page's horoscope sits
behind a **Reveal the horoscope** step (Sprint 33).

**Sprint Objective:** The two pieces of horoscope copy that still say "written" now say
"revealed", so they match Sprint 33's wording.

### Context

Sprint 33's R1 changed the panel's copy from "write" to "reveal" and allowed Dev Team
only to *propose* changes to the other messages. Dev Team proposed two, and the user
approved both on 23 Nov 2026. The change spans two files, one of which is a `.ts`
library file, so it doesn't meet the fast-lane criteria, and it goes through a sprint.

**Prior record checked (planning rule 11).** Sprint 33's R1, and Dev Team 1's
Sprint 33 handoff proposal. No measurement is relied on.

### Requirements

1. **The metadata line in `app/reading/[id]/HoroscopeReveal.tsx`** changes from
   "Written on request from 10 positions and N aspects." to "Revealed on request from
   10 positions and N aspects." Everything except that word stays the same, including
   how N is computed.
2. **The outage message in `lib/date-page/cast.ts`** changes from "The horoscope can't
   be written right now because the service is unavailable. Try again in a few
   minutes." to "The horoscope can't be revealed right now because the service is
   unavailable. Try again in a few minutes."
3. **Only text changes.** No logic, markup structure or styling changes, and no other
   messages change.
4. **Tests.** The existing assertions in `app/reading/[id]/ReadingPanel.test.ts`
   (lines 144 and 188) are updated to the new wording. Any test asserting the outage
   message is updated the same way, and there is none if no such test exists. No
   assertion is removed.

### Acceptance Criteria

**QA1 (static):**
- **R1–R3:** the diff is two string literals plus test expectations. `grep` for
  "Written on request" and "can't be written" under `app/` and `lib/` finds nothing.
- **R4:** test expectations change only in wording. Also, from Sprint 36's rule (now in
  CLAUDE.md's project standards): the handoff quotes every check's exit code, and QA1
  treats a missing or non-zero code as a FAIL.

**LiveQA (against the deployed app, after Pipeman pushes):**
1. Reveal a saved horoscope on any date page. The metadata line reads "Revealed on
   request from 10 positions and N aspects."
2. The outage message can't be triggered safely in production. Confirm it from the
   deployed source instead (QA1 covers it statically), and record that step 2 was
   checked that way, not observed live.

### Out of Scope
- Any other copy change.
- The verify command (Sprint 36).

### Dependencies
- Blocks: none.
- Blocked by: none. Sprints 32–34 are closed.
- Independent of Sprint 36, which touches `package.json`, `scripts/` and the README.
  The two could run in parallel, with Dev Team 2 in a worktree.
- External: none.

### Human Prerequisites
- None.

### Team Assignments
- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** not assigned, or Sprint 36 in parallel, after `/sprint-worktree 36`.

### Risks & Mitigations
- **A test still asserts the old wording and is deleted to make it pass.** R4 forbids
  removing assertions, and QA1 checks it.
