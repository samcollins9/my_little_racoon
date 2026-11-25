# Sprint 49 handoff — Page title shows the date

## Round 1

**Status:** ready for QA1's gate-1 audit.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (52 test files, 595 tests).

**Sprint file:** I re-read it at this commit. It's unchanged since `/sprint-start` (`12574c0`): `git log 12574c0..HEAD` on the file is empty.

### What changed

| Req | Where | How |
|---|---|---|
| R1 | `lib/site-title.ts` (new) | `SITE_TITLE = "Retroactive Horoscope"` and `datedTitle(isoDate)`, which returns `` `${SITE_TITLE} ${isoDate}` `` with one ASCII space. The root layout's `metadata.title` now uses `SITE_TITLE`. `grep -rn '"Retroactive Horoscope' app lib` outside tests and comments finds only `lib/site-title.ts:5`, so no title string is built anywhere else. |
| R2 | `app/date/[date]/page.tsx` `generateMetadata` | Reads `params.date` and runs it through `parseDatePageParam` and `isAfterToday`, then `datedTitle`. The function uses nothing else, so it makes no Supabase or Wikipedia call; a test checks that `createAnonClient` and `fetch` are never called. A date the page 404s or redirects (malformed, impossible, out of range or in the future) returns `{}`, so the layout's plain title stands. The module still imports Supabase for the page itself, but the metadata function doesn't use it. |
| R3 | `app/reading/[id]/load.ts` (new) `loadReadingById`; `app/reading/[id]/page.tsx` | **How the read is shared:** the page's `get_reading_by_id` lookup moved, with its Sprint 25 classification and logging unchanged, into `loadReadingById = cache(async (id) => …)`. It returns `found`, `notFound` or `unavailable`. Both the page and the new `generateMetadata` call it. React's `cache()` memoizes within one server request, so whichever runs first makes the RPC and the other awaits the same promise. The page still throws `DatabaseUnavailableError` for `unavailable` and calls `notFound()` for `notFound`, so its behaviour is unchanged. The metadata returns the dated title for `found` and `{}` otherwise. |
| R4 | `app/not-found.tsx` (new), with your go-ahead | See "The 404 title" below. Redirects (`/`, `/date`, `/chart`) set no metadata of their own. The error page (`error.tsx`) sets no title, and the metadata returns `{}` during an outage, so both keep `SITE_TITLE`. |
| R5 | — | `description`, the banner and the date band are unchanged. The layout's `description` line isn't touched by the diff. |

### The 404 title: a decision you made during the build

While checking R4 against a production build, I found that in a browser, every route-level 404 (`/date/2024-02-30`, an unknown or malformed reading id) already had the tab title **"404: This page could not be found."** That title comes from Next's built-in 404 component (`HTTPAccessErrorFallback` renders its own `<title>`), which the browser put ahead of the site title. It predates this sprint: Sprint 46's LiveQA notes record that title on `/date/not-a-date`. The server HTML that curl sees had only the plain title, but R4 ("no error text") and LiveQA's step 4 check what the browser shows.

I asked you. You chose to add `app/not-found.tsx`. That file is Next 16.3's built-in 404 markup, copied (the same inline styles, `next-error-h1` class and colour-scheme `<style>`), with the `<title>` left out. The source files are named in its comment. It's deliberately a copy, so that nothing visible changes. The 404 status and Next's `<meta name="robots" content="noindex">` are Next's own, and they're unaffected.

**Evidence that nothing visible changed** ([404-before-after.txt](sprint-49/404-before-after.txt)): I screenshotted `/date/2024-02-30` and `/no-such-page` at 1280×800, in light and dark colour schemes, from builds with and without `app/not-found.tsx` ([shot404.mjs](sprint-49/shot404.mjs)). All four pairs are **byte-identical** (matching sha256). The "after" shots are committed: [404-after-date_2024-02-30-light.png](sprint-49/404-after-date_2024-02-30-light.png) and the three others under `sprint-49/`.

### Tests

- **`lib/site-title.test.ts`, R1:** `datedTitle("1969-07-20")` is `"Retroactive Horoscope 1969-07-20"`, and `SITE_TITLE` is unchanged.
- **`app/reading/[id]/title-metadata.test.ts`** (new):
  - **R2:** `/date/1969-07-20` and today give the dated title, with no Supabase or `fetch` call. Malformed, impossible, out-of-range and future dates give `{}`.
  - **R3/R4:** a found reading gives its stored `event_date`. An unknown id, a malformed id (22P02) and an outage all give `{}`.
  - **R3, sharing:** Vitest loads React's client build, where `cache()` doesn't memoize; I checked, and two calls give two runs. So this file mocks `react` with a `cache()` that memoizes per test, standing in for one server request. With it, `generateMetadata` plus a full page render make **exactly one** `get_reading_by_id` call, and an unknown id gives one call, `{}` and the page's 404. I checked that the test can fail: with that `cache()` made pass-through, both sharing tests fail with two calls.
- **`app/not-found.test.tsx`** (new), R4: the page renders no `<title`, and does render "404" and "This page could not be found."
- All existing reading-page tests pass unchanged against the cached loader.

### Manual check against a production build

I ran `next build && next start` against Sprint 47's stand-in with Sprint 48's rows ([sprint-47/fake47.mjs](sprint-47/fake47.mjs), [sprint-48/rows48.json](sprint-48/rows48.json)), and checked with curl ([curl-titles.txt](sprint-49/curl-titles.txt)) and with headless Chrome 156 ([cdp49.mjs](sprint-49/cdp49.mjs), [browser-titles.json](sprint-49/browser-titles.json)).

- **Server HTML, curl:** the first `<head>` title is "Retroactive Horoscope 1969-07-20" on `/date/1969-07-20` and on `/reading/<the 1969-07-20 reading>`, and "Retroactive Horoscope 2026-11-25" on today's page. Each has exactly one title in `<head>`; metadata wasn't streamed into `<body>`. Every 404 (`/date/2024-02-30`, `/date/1969-7-20`, an unknown id, `not-a-uuid`, `/no-such-page`) returns HTTP 404, with "Retroactive Horoscope" as its only head title, plus `noindex`. `/`, `/date?date=…` and `/chart` still give 307.
- **Browser `document.title`** (what a tab and Google Analytics read):
  - `/date/1969-07-20` reads "Retroactive Horoscope 1969-07-20". After clicking "Next day", a same-document navigation, it reads "Retroactive Horoscope 1969-07-21", with no reload.
  - The reading page shows its date, and `/` lands on today's dated title.
  - All four 404s read "Retroactive Horoscope", and the 404 message is visible on them and on no other page. Before `app/not-found.tsx`, three of them read "404: This page could not be found."
- **One read (R3):** counted from the stand-in's RPC log, one request to `/reading/<found>`, an unknown id or `not-a-uuid` makes exactly **1** `get_reading_by_id` call. `/date/1969-07-20` makes 0.

### Notes for LiveQA

- **Step 1's `curl … | grep -o '<title>[^<]*</title>'`** also prints the chart's SVG labels ("Aries: Fire, Cardinal", "Sun in Cancer …"). They're inline `<svg><title>` elements, unchanged, and not page titles. The page title is the first one, inside `<head>`.
- **Route-level 404s** (a bad date, an unknown id) are still Next's client-rendered error document. That's unchanged and was seen in Sprints 46–47. So their 404 message isn't in the server HTML, only in the browser, while their title is in both.

### Known limitations

- `app/not-found.tsx` copies Next 16.3's 404 markup. If a later Next version changes its built-in 404's look, this page keeps the 16.3 look, by design, and would need updating by hand.
- **Lint:** the same 3 warnings in my Sprint 45/46 probe scripts, still waiting on Master Controller's decision. This sprint adds none.

### Questions for QA1

None. The 404 decision above is yours (the user's), made during the build. I'm flagging it so it isn't mistaken for scope creep.
