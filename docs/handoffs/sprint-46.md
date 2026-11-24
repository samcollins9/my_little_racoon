# Sprint 46 handoff — Install Google Analytics through Google Tag Manager

## Round 1

**Status:** ready for QA1's gate-1 audit.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (45 test files, 511 tests).

### What changed

| Req | Where | How |
|---|---|---|
| R1 | `app/layout.tsx`, `app/TagManager.tsx` (new) | The root layout renders `<TagManager />` once, inside `<body>`. Nothing else renders it; no page touches the tag. |
| R2 | `app/TagManager.tsx`, `lib/analytics/tag-manager.ts` (new) | Google's snippet as given, loaded through `next/script`. The inline half (`dataLayer`, `gtag`, `gtag('js', new Date())`) is `beforeInteractive`, and the `gtm.js?id=…` container is `afterInteractive`. There's no `gtag/js?id=G-…` tag, and no second Google tag. |
| R3 | `lib/analytics/tag-manager.ts` `shouldLoadTagManager` | It's true only when the server's `VERCEL_ENV` is exactly `production`, read from `process.env`, which is injectable for tests (the same pattern as `lib/deployed-commit.ts`). `TagManager` is a server component and returns `null` otherwise, so on other deployments nothing reaches the client. There's no `NEXT_PUBLIC_` variable. |
| R4 | `lib/analytics/tag-manager.ts` | The ID lives only in `GTM_CONTAINER_ID`. `GTM_SCRIPT_URL` is built from it. |
| R5 | `app/layout.tsx` | The font comment now reads "fonts make no runtime request to fonts.googleapis.com or any other host", and names analytics as the one deliberate third-party request. No page component changed, and neither did metadata. |
| R6 | `lib/analytics/tag-manager.test.ts`, `app/TagManager.test.tsx` (new) | See Tests. |
| R7 | `README.md`, new "Analytics" section | It covers the container ID, that only production loads it and why, that the GA4 tag is configured in Tag Manager and not in this repo (with a warning against adding it to the code too), and the history-change setting needed for in-app page views. |
| R8 | this file | No new dependency. |

### Why `next/script` and Google's snippet, not `@next/third-parties`

R2 allows either. `@next/third-parties` isn't installed, and adding it would mean a new dependency for a component that wraps the same two `next/script` calls. Writing them directly keeps Google's snippet exactly as given (a test pins its text), and makes the order explicit:
- a `beforeInteractive` script is in the initial HTML, ahead of any app code;
- an `afterInteractive` script is injected only after hydration, so it never blocks rendering and always finds `dataLayer` already there.

The root layout doesn't re-render on client navigation, so neither script loads twice.

### Acceptance greps (run at this commit, unpiped, exit codes as printed)

- `grep -rn "GTM-T9WQSKH3" app lib --exclude=*.test.ts --exclude=*.test.tsx` gives one match, `lib/analytics/tag-manager.ts:7`. `grep exit=0`. A broader `grep -rnoE "GTM-[A-Z0-9]+"` over the same files gives the same single match.
- `grep -rn "NEXT_PUBLIC_VERCEL_ENV"` over every `.ts/.tsx/.js/.mjs` file outside `node_modules` and `.next` matches nothing. `grep exit=1`.
- `grep -rn "VERCEL_ENV" app lib`: outside tests, the variable is read only at `lib/analytics/tag-manager.ts:31`. The other two hits are comments: one in `tag-manager.ts`, and one in `app/TagManager.tsx`.
- `grep -rnE "G-[A-Z0-9]{6,}|gtag/js" app lib` gives one match, and it isn't a tag. It's the comment in `lib/analytics/tag-manager.test.ts:21`, "No GA4 measurement ID or gtag/js tag alongside the container", which explains the test asserting their absence. `grep exit=0` because of that comment. There's no measurement ID anywhere in `app/` or `lib/`.

### Tests

- **`lib/analytics/tag-manager.test.ts`:**
  - R6: the ID is `GTM-T9WQSKH3`, and the script URL is exact.
  - R2: the inline half is Google's text, verbatim, with no `G-` ID, `gtag/js` or `gtag('config'`.
  - R3: `shouldLoadTagManager` is true only for `production`. It's false for `preview`, `development`, unset, empty and `Production`.
- **`app/TagManager.test.tsx`:** `next/script` renders nothing outside a Next request (I checked: `renderToStaticMarkup` gives `""`), so these tests read the elements `TagManager` returns.
  - R2: in production there are exactly two `next/script` elements, in order: `gtm-init` (`beforeInteractive`, Google's inline text), then `gtm-container` (`afterInteractive`, the `gtm.js` URL).
  - R3: it renders `null` for `preview`, `development` and unset.
  - With no `source`, it reads the real `process.env` (via `vi.stubEnv`).
  - The suite itself runs with `VERCEL_ENV` unset, so tests never load the container.

### Manual check against real builds

I ran `next build && next start` against a PostgREST stand-in ([fake46.mjs](sprint-46/fake46.mjs), Sprint 45's stand-in plus `get_reading_by_id`), driving Chrome 156 headless over CDP ([cdp46.mjs](sprint-46/cdp46.mjs)). For each page, the probe:
- counts the network requests for `gtm.js`;
- records whether `dataLayer` already exists at the moment the container's `<script>` is inserted (insertion comes before execution);
- clicks an in-app link to see what a client-side navigation does.

**Built with `VERCEL_ENV=production`** ([production-build-report.json](sprint-46/production-build-report.json)):

| Page | HTTP | `gtm.js` requests | `dataLayer` before container | `gtag/js` scripts | Client navigation |
|---|---|---|---|---|---|
| `/date/1969-07-20` | 200 | 1 | yes | 0 | to `/date/1961-04-12`, same document: 0 more `gtm.js` |
| `/reading/<id>` | 200 | 1 | yes | 0 | to `/date/1969-07-20`, same document: 0 more `gtm.js` |
| `/chart` (redirects to today's date page) | 200 | 1 | yes | 0 | — |
| `/no-such-page` | 404 | 1 | yes | 0 | — |

On every page, `google_tag_manager["GTM-T9WQSKH3"]` existed after load. The container is already configured: it sent a GA4 `page_view` for stream `G-NFY3Q9KSXH` on each page. That ID is in Tag Manager, not in this code. A client-side navigation sent **no** second `page_view` within 5 seconds. That matches the sprint's Human Prerequisites (history-change page views aren't on yet), and it's a container setting, not code.

**Built with `VERCEL_ENV` unset, `preview` and `development`** ([non-production-builds.txt](sprint-46/non-production-builds.txt)): for each value, I built, started, and fetched the same four pages. The page HTML contains no `googletagmanager`, `GTM-` or `dataLayer` in any of the 12 cases (`grep exit=1` for each).

### Known limitations

- **A server-error (500) page loads the container differently.** I caused one by stopping the stand-in, so `/reading/<id>` threw "Database unavailable" ([error-page-report.json](sprint-46/error-page-report.json)). Next then serves a bare error document (`<html id="__next_error__">`), and the root layout renders only on the client. The inline `beforeInteractive` half isn't in that HTML, so the container's `<script>` was inserted before `dataLayer` existed. Exactly one container `<script>` element was inserted, so the container ran once, but Chrome logged two network requests for it.
  - **Effect:** none that I found. GTM creates `dataLayer` itself, and the later inline `window.dataLayer = window.dataLayer || []` keeps it.
  - **Not specific to this approach:** it's Next's error shell. `@next/third-parties` or raw `<script>` tags in the layout would behave the same, because nothing in the root layout is server-rendered there.
  - **Question for QA1:** I'm flagging it so QA1 can decide whether R2's "`dataLayer` exists before the container runs" needs to hold on that page too.
- **Real hits from my first local run.** My first probe run, before I added blocking, sent 4 real GA4 hits from a local production build to stream `G-NFY3Q9KSXH`, because the container is live:
  - a `page_view` for `127.0.0.1/date/1969-07-20`;
  - a `page_view` for `/chart`, which redirected to `localhost/date/2026-11-24`;
  - a `page_view` and a `scroll` for `127.0.0.1/no-such-page`.

  Every later run blocked `google-analytics.com` (CDP `Network.setBlockedURLs`, with each blocked request confirmed by `loadingFailed.blockedReason`). The user may want to ignore those 4 localhost hits in GA4.
- **The ID is decided per build, not just per request.** The root layout is rendered at build time for static routes (`/_not-found`) and on request for dynamic ones. `VERCEL_ENV` is set at build time and at runtime on Vercel, so either way production gets the tag and previews don't. If a preview deployment were ever promoted to production *without a rebuild*, its static 404 page would lack the tag until the next build. LiveQA's step 5 covers the production 404.

### Questions for QA1

1. Is the 500-page ordering above acceptable under R2 as written, given it's Next's error shell and functionally harmless?
