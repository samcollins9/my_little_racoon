---
id: 16
title: "Wikipedia event lookup"
epic: "Synthesis PoC"
status: done
created: 2026-08-22T23:32:02+00:00
---

# Master Controller Sprint Definition — Sprint 16

**Epic:** Synthesis PoC
**Sprint Objective:** Fetch what happened on a date from Wikipedia's on-this-day feed and persist it to the reading, without letting an external service failure block a save.

### Context

The second of PRD v2's three sources, and **the project's first outbound network
call at runtime**. Since Sprint 6 dropped geocoding the app has made none: it could
be slow or broken only for reasons inside its own code. That changes here, and the
requirement that matters most is not the fetch — it is what happens when the fetch
fails.

The endpoint and its response shape were verified live on 22 Aug 2026 rather than
taken from documentation, so R2 below is confirmed fact, not an assumption to check
on first integration.

### Requirements

1. A client calling
   `GET https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/{MM}/{DD}`
   with zero-padded month and day, and a descriptive `User-Agent` identifying the
   application, as Wikimedia asks. No key, no auth, no cost.
2. Parsing against the **confirmed** response shape: a top-level `selected` array,
   each entry carrying `text`, `year`, and `pages`. `sourceUrl` comes from
   `pages[0].content_urls.desktop.page`.
3. Year filtering per PRD §3.2: entries matching the reading's year are used with
   `matchedYear: true`; otherwise fall back to the top 3–5 unfiltered entries with
   `matchedYear: false`.
4. Results cached by `MM/DD`, not by full date — the response is identical for every
   reading of the same calendar day.
5. Persisted to `events` jsonb in the PRD §3.3 shape: `source`, `requestedDate`,
   `matchedYear`, `fetchedAt`, and the `events` array.
6. **A fetch failure or timeout must not block the save.** The reading is created
   with `events` null, and the user is not shown an error for it. The chart is the
   product; the events are an enrichment.
7. An explicit timeout on the request.
8. Tests covering both branches, including **the year-match branch exercised
   deliberately** — see the risk below — plus a fetch failure leaving the save intact,
   and a timeout.
9. No UI change. Sprint 18 displays events.

**Added 22 Aug 2026 from QA1 round 1.** Three of QA1's six notes are promoted to
requirements; the other three are carried below. QA1's PASS stands — these are
additions to the spec, not defects against it.

10. The `User-Agent` identifies the application **by project URL, not by a personal
    email address**. The repository is public, so the committed value is scrapable,
    and it is sent to a third party on every request. Wikimedia's policy accepts a
    URL or an email equally, so the URL satisfies the same requirement at no cost.
    Free to change now, awkward once it is in commit history people have cloned.
11. **An unexpected response shape must not be cached as a success.** `body.selected
    ?? []` caches an empty array, so every later reading for that day receives a
    successful-looking payload with no events rather than the null that means "we did
    not get this" — and that outcome would also fail GroundTruth's first criterion.
    If `selected` is absent or is not an array, treat it as a failure: return null and
    **do not cache**. An empty array that is genuinely present remains a real answer.
12. Log the failure reason before returning null. R6 requires the swallow, and that is
    correct — but an outage should be traceable in Vercel's logs rather than
    indistinguishable from a date that simply had no events.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R2: field access matches the confirmed shape. Any field not in `text` / `year` /
  `pages` / `content_urls.desktop.page` is invented and fails — the shape was
  verified live and is recorded here.
- R1: a descriptive `User-Agent` is set. A default or absent one is a request
  Wikimedia asks you not to make.
- R3: both branches exist and `matchedYear` is recorded in the stored payload, not
  merely computed and discarded.
- R4: the cache key is month and day. A key including the year defeats the cache
  entirely, since every reading of a different year would miss.
- R6: **the criterion that matters most here.** A rejected fetch, a non-2xx response,
  and a timeout each leave the reading saved with `events` null. A code path where a
  Wikipedia outage prevents a user saving a chart fails this outright.
- R7: the timeout is explicit, not inherited from a default.
- R8: the year-match branch is exercised by a test asserting `matchedYear: true`.
- No secret, key, or token appears anywhere — this API needs none.
- R10: no email address appears in the diff. The `User-Agent` carries the project URL.
- R11: a response whose `selected` is absent or not an array returns null and leaves
  the cache unpopulated. A test drives this case.
- R12: the failure path logs before returning.

**GroundTruth — live, after Pipeman pushes:**

Nothing renders events yet, so verification goes through the anon client, the same
route used to prove RLS in Sprint 4: call `get_reading_by_id` with the anon key and
read the `events` column.

- A reading created for a date with **no** year match stores events with
  `matchedYear: false` and a non-empty array.
- A reading created for **1986-03-31** stores `matchedYear: true`. That date is
  confirmed to have a 1986 entry in the `03/31` feed, so it exercises the branch that
  otherwise almost never fires. **This is the sprint's actual proof.**
- The Sprint 14 fixture reading still opens and renders unchanged, with `events`
  null — older readings are unaffected.

### Out of Scope

- Displaying events — Sprint 18.
- OpenAI and the horoscope — Sprint 17.
- Backfilling `events` on existing readings.
- Retrying a failed fetch, or a background job to fill in nulls later.
- Normalising, ranking, or deduplicating event text.
- Any source other than Wikipedia on-this-day.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Carried forward — QA1 round 1 notes not promoted

Real, and none of them worth another round on a PoC. Recorded so they are decisions
rather than oversights:

- **Failures are not cached**, so during a Wikipedia outage every save pays the full
  5s timeout, repeatedly. R6 holds — it does not block — but the cost lands in exactly
  the scenario R6 exists for. Caching null briefly would bound it with nothing
  observable when the service is healthy.
- **Test isolation is by convention, not construction.** The module cache survives
  `vi.unstubAllGlobals()`, and the suite avoids collisions only by using eight
  distinct month/days. Reuse one and the fetch mock silently is not called, and the
  failure presents as something else entirely. An exported reset or `vi.resetModules()`
  closes it.
- **On Vercel the cache is per lambda instance**, so it reduces requests rather than
  minimising them. Fine here, and stated so nobody later reads it as a global rate
  limiter.

### Dependencies

- **Blocks:** Sprint 17, whose prompt needs events, and Sprint 18, which displays them.
- **Blocked by:** Sprint 15, complete.
- **External:** None. The endpoint needs no key and was confirmed reachable.

### Risks & Mitigations

- **A Wikipedia outage blocks reading creation.** The app's first dependency on
  someone else's uptime, and the natural implementation — await the fetch, then
  insert — makes their availability a precondition of the core product. — R6, checked
  across three distinct failure modes rather than one.
- **The year-match branch ships untested.** `03/31` returns 23 entries spanning
  1146–2023, so an arbitrary date almost never matches; the branch is the exception
  path and will look fine while never running. — R8 and GroundTruth's second
  criterion, both naming a date confirmed to match.
- **Field names guessed rather than used.** — R2, with the confirmed shape recorded
  here so QA1 checks against fact rather than plausibility.
- **The cache keyed by full date.** It would never hit, and the miss is invisible —
  everything works, just slower and with more requests to a service that asked to be
  treated politely. — R4.
- **The endpoint is flagged experimental by Wikimedia.** Acceptable for a PoC, and
  named so nobody is surprised if the shape moves. — Recorded here; R6's degradation
  is what keeps it from being a product risk.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned. Sprint 17 depends on this sprint's stored shape.
