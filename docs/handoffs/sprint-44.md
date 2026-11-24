# Sprint 44 handoff — Front page lands on today's actual date

## Round 1

**Status:** ready for QA1's gate-1 audit.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (40 test files, 486 tests).

**Sprint 41 was closed first** (`c9c01d9`), as the sprint's Dependencies require.

### Approach

Nothing has touched sprint 41's files since its commit `0aad17a`, and nothing outside them used its code. So I restored sprint 41's changes from the commit just before it, `d638916`, rather than editing them out by hand:

- **Restored:** `app/page.tsx`, `lib/events/wikipedia.ts`, `lib/events/wikipedia.test.ts` and `README.md` (`git checkout d638916 -- …`).
- **Deleted:** `lib/date-page/front-door.ts` and `front-door.test.ts`.
- **Kept, rewritten:** `app/page.test.ts`.
- **Byte-identical to `d638916`:** `git diff d638916 -- README.md lib/events` is empty. `app/page.tsx` differs only by the comment lines described under R4.

### What changed

| Req | Where | How |
|---|---|---|
| R1 | `app/page.tsx` | `await connection(); redirect(datePagePath(utcToday()));`, Sprint 28's body. The build's route table shows `ƒ /` ([build-route-table.txt](sprint-44/build-route-table.txt)). A real request gets `307`, `location: /date/2026-11-24`, `Cache-Control: private, no-cache, no-store`, and no `age` header, on both requests 4 s apart ([front-door-live.txt](sprint-44/front-door-live.txt)). |
| R2 | `app/page.tsx` | Imports only `next/navigation`, `next/server` and `@/lib/date-page/params`. `params.ts` imports only `lib/ephemeris/adapter`, which imports `astronomy-engine` and `./zodiac`. No Wikipedia module and no Supabase. `app/page.test.ts` stubs `fetch` and asserts it's never called. With the network cut (`unshare -rn`, where `curl` to `api.wikimedia.org` exits 6), `/` still gives `307` to today ([front-door-offline.txt](sprint-44/front-door-offline.txt)). |
| R3 | `lib/` | **`front-door.ts` and its tests are deleted.** **From `wikipedia.ts`:** `fetchDayEventYears` and its tests are removed. **Also removed: `entryMatchesDateYear` and `feedMonthDay`.** The sprint let me keep them; I didn't, because their only purpose was sharing the year rule with the front door. Without it, the pre-41 inline code is simpler, and it restores `fetchDayEvents` exactly. **`fetchDayEvents`' tests:** sprint 41 only appended tests to the file (its sole removed line was the import, now restored), so the `fetchDayEvents` tests are the same text they were before and after sprint 41. `grep -rn "frontDoorDate\|front-door\|fetchDayEventYears" app lib` finds nothing (exit 1). |
| R4 | `app/page.tsx` | It's Sprint 28's header comment again. It adds one sentence: Sprint 44 confirmed it as the user's decision (`docs/decisions.md`), and rendering `/` makes no outbound call. It doesn't mention the latest-year rule. |
| R5 | `README.md` | The route list says "`/` redirects (307) to `/date/<today, UTC>`." (line 270). "Local setup"'s paragraph about `/` is also back to its pre-41 text, which says the same. Sprint 40's changes are intact, because `d638916` is after sprint 40's close. |

### Tests

- **`app/page.test.ts`** (rewritten), with `connection` and `redirect` replaced by spies:
  - `connection` runs before `redirect` to `/date/2026-11-24`.
  - Midnight UTC: `23:59:59.999Z` gives `…-24`, and `00:00:00.000Z` gives `…-25`.
  - `fetch` is never called.
- **Removed with the code they tested:** `front-door.test.ts` (19 tests) and the `fetchDayEventYears` and `entryMatchesDateYear` tests in `wikipedia.test.ts` (6 tests).
- **Test count:** 510 tests across 41 files at `0aad17a`; 486 tests across 40 files now.

### Known limitations

- **None in the code.** As the sprint says, today's page usually shows Sprint 39's "can't write" message.
- **Sprint 41's handoff and evidence stay in `docs/handoffs/sprint-41*`,** as the record of that sprint.

### Questions for QA1

None.
