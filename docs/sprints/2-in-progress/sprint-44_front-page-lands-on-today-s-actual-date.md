---
id: 44
title: "Front page lands on today's actual date"
epic: "Date pages (PRD v3)"
status: in_progress
created: 2026-11-24T12:47:48+00:00
---

# Master Controller Sprint Definition — Sprint 44

**Epic:** Date pages (PRD v3)
**Sprint Objective:** `/` redirects to today's actual UTC date again, reversing Sprint 41's latest-year landing.

### Context

Sprint 41 (`0aad17a`) made `/` land on today's month and day in the latest year that has a Wikipedia event. On 24 Nov 2026 that resolved to `/date/2023-11-24`, because the feed's newest year for 24 November is 2023. Seeing it live, the user decided on 24 Nov 2026 that `/` should land on today's actual date, 2026-11-24. They accept that today usually shows Sprint 39's message that a horoscope can't be written for this date, with links to other years. The decision is recorded in `docs/decisions.md`.

This restores Sprint 28's behaviour for `/`. Nothing on the date page itself changes.

### Requirements

1. **`/` lands on today.** `/` redirects to `/date/<utcToday()>`, computed for each request, as in Sprint 28. It's still a 307, dynamic and never cached, and `connection()`, or its equivalent, stays.
2. **`/` makes no outbound calls.** Rendering `/` doesn't call Wikipedia or Supabase.
3. **Remove what's now unused.** Sprint 41's front-door code (`lib/date-page/front-door.ts` and its tests) is removed, along with anything in `lib/events/wikipedia.ts` that nothing uses any more (for example `fetchDayEventYears` and its tests).
   - Sprint 41's behaviour-neutral refactors that `fetchDayEvents` still uses, such as `entryMatchesDateYear` and `feedMonthDay`, may stay. Dev Team decides, and says which in the handoff.
   - `fetchDayEvents`' behaviour and its existing tests are unchanged.
4. **Comments match.** `app/page.tsx`'s header comment describes what it now does, and no longer mentions the latest-year rule.
5. **README.** The "Running the built app locally" route list says `/` redirects (307) to `/date/<today, UTC>`.
6. **Handoff.** The handoff follows CLAUDE.md's committed-handoff standard: `docs/handoffs/sprint-44.md`, with `npm run verify`'s final line and `exit=0`.

### Acceptance Criteria

- **R1:** `app/page.tsx` redirects to `datePagePath(utcToday())`. `npm run build`'s route table shows `/` as dynamic.
- **R2:** QA1 confirms that nothing on `/`'s path imports the Wikipedia module or Supabase.
- **R3:**
  - Grep finds no `frontDoorDate`, `front-door` or `fetchDayEventYears` anywhere in `app/` or `lib/`.
  - `lib/events/wikipedia.test.ts`'s `fetchDayEvents` tests still pass, unchanged.
- **R4 and R5:** the comment and the README text match the behaviour.
- **R6:** QA1 reads `docs/handoffs/sprint-44.md` at the audited commit, and `npm run verify` ends with `VERIFY PASS … exit=0`.

**LiveQA (the deployed app):**
1. `curl -sI https://my-little-racoon.vercel.app/` gives a 307 with `location: /date/<today, UTC>`. Record the time of the check in UTC.
2. Load `/` twice, several seconds apart, and confirm neither response is a cached copy (the `cache-control` and `age` headers).
3. Follow the redirect. Today's page shows Sprint 39's message, with year links if today's feed has linkable years. That's expected, not a defect.
4. If the test runs within an hour of midnight UTC, check again after midnight that the date moves on. If not, record that this is covered by the existing tests for `utcToday`.

### Out of Scope

- **A note on today's page pointing to the latest year with an event.** That was option 3, which the user didn't choose.
- **Any change to the date page, the date picker or Sprint 39's messages.**

### Dependencies

- **Blocks:** nothing.
- **Blocked by:** Sprint 41 must be resolved first, either closed after LiveQA or aborted. It's at `liveqa_live` with the same files deployed. The user decides which; see the handoff note from Master Controller.
- **External:** none.

### Human Prerequisites

None.

### Team Assignments

- **Dev Team 1:** all of it, after Sprint 41 is resolved.
- **Dev Team 2:** not assigned.

### Risks & Mitigations

- **Removing shared code breaks the date page.** Sprint 41 refactored `fetchDayEvents`' internals. — Requirement 3 keeps whatever `fetchDayEvents` still uses, and its unchanged tests guard it.
- **The first impression is the "can't write" message.** — The user chose this knowingly, and it's recorded in `docs/decisions.md`.
