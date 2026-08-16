---
id: 11
title: "Root redirect and deployment observable"
epic: "Design Pass"
status: todo
created: 2026-08-16T19:09:06+00:00
---

# Master Controller Sprint Definition — Sprint 11

**Epic:** Design Pass
**Sprint Objective:** Send `/` to `/chart` so visitors reach the application, having first moved the deployed-commit marker somewhere a UI redesign cannot disturb.

### Context

`/` currently serves the Sprint 1 proof page, and a visitor landing there has no way
to reach the app — `/chart` is unlinked and undiscoverable. Redirecting is the
obvious fix and it is what was asked for.

It also quietly destroys something. **The deployed-commit SHA lives only in
`app/page.tsx`, and every GroundTruth live test since Sprint 1 has read it** to
confirm which build is actually serving traffic. Redirect `/` away and that
observable disappears — not with an error, but by simply no longer being anywhere.
Every subsequent live test would be verifying a deployment it can no longer
identify.

So the marker moves first, into `/api/health/db`'s JSON response. That endpoint is
already GroundTruth's other observable, it is not a design surface, and putting the
SHA there decouples deployment verification from the UI permanently — including
from the redesign landing in Sprint 13.

### Requirements

1. `/api/health/db` includes the deployed commit SHA in its JSON response, full and
   short form, sourced from the existing `lib/deployed-commit.ts` with its local
   development fallback intact.
2. `/` redirects to `/chart`. A real redirect, not a rendered page with a link.
3. The redirect is permanent-by-intent but must not be cached so aggressively that
   it cannot be changed later. Prefer a framework-level redirect over a hand-rolled
   client-side one.
4. `app/page.tsx` and its proof-page content are removed, since nothing renders
   them once the redirect is in place. `lib/deployed-commit.ts` and its tests stay —
   they now serve the health endpoint.
5. `README.md` records that the deployed-commit observable now lives in
   `/api/health/db`, and why: so a future UI change cannot silently remove it again.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: the health route returns the SHA in both forms, and the local fallback branch
  is preserved rather than dropped as dead code.
- R2/R3: the redirect is framework-level. A `<meta refresh>`, a client-side
  `router.push` in an effect, or a page that renders content before redirecting all
  fail this — each ships a page to the visitor first.
- R4: no orphaned component or route left behind that nothing reaches.
- R5: `README.md` states where the observable lives and why it moved.
- **Ordering:** the SHA must appear in the health endpoint in the same commit that
  removes it from `/`, or earlier. A diff that removes the marker and adds it back
  in a later commit leaves a window with no observable at all.

**GroundTruth — live, after Pipeman pushes:**

- `GET /` returns a redirect to `/chart`, and following it serves the chart page.
- `/api/health/db` reports the deployed commit SHA, and it matches the commit
  Pipeman shipped. **This is the sprint's actual proof** — it is the replacement
  observable, and every later live test depends on it working.
- The old proof page is gone: no route serves it.

### Out of Scope

- Any visual change to `/chart`. Sprint 13 redesigns it; this sprint routes to it
  as it stands.
- Aspects, the constellation, and anything from the design handoff — Sprints 12
  and 13.
- A landing or marketing page at `/`. The redirect is the whole answer.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Nothing strictly. Independent of Sprints 12 and 13, and deliberately
  sequenced first so the observable is safe before the redesign touches anything.
- **Blocked by:** Nothing.
- **External:** None.

### Risks & Mitigations

- **The observable disappears in the gap.** If the marker is removed from `/` before
  the health endpoint carries it, there is a shipped state where nothing reports the
  deployed commit — and the tool that would catch it is the one that just lost its
  instrument. — The ordering criterion above, checked by QA1 as a sequencing question
  rather than a content one.
- **A soft redirect.** A page that renders and then navigates still ships the old
  content, still flashes it, and still counts as `/` serving something. — R2's
  acceptance criterion names the three common forms that fail.
- **`lib/deployed-commit.ts` deleted along with the page.** It looks like part of the
  proof page's machinery and it is now load-bearing for the health endpoint. — R4
  says explicitly that it stays.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned. Small sprint, no parallel track.
