# Sprint 43 handoff — Ask Reloy site banner

## Round 1

**Status:** ready for QA1's gate-1 audit.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (39 test files, 483 tests).

### Decisions made mid-sprint (the user's, 24 Nov 2026)

Requirement 2 puts the banner on `/reading/[id]`'s error boundary, but Requirement 8 says the tagline is picked on the server. Next requires `error.tsx` to be a `"use client"` component, so no server-picked value can reach it. I asked the user before building, and they chose **"banner, no tagline"** for the error state. `SiteBanner` takes `tagline: string | null`, and the error boundary passes `null`.

The user also chose to delete the untracked root `new_banner.html` from the primary checkout themselves. It was never tracked, so it isn't on this branch. A test checks that git tracks no `new_banner.html`, rather than checking the filesystem, so verify still passes in the primary checkout while the original is there.

### What changed

| Req | Where | How |
|---|---|---|
| R1 | `docs/design/banner_variations.html` | Copied unmodified. sha256 `0dd05937de99f5be28272e3495d0f9edebb78af8785579eac984a89246e90ee3`, the same as the original `new_banner.html`. `grep -rn banner_variations app/` finds nothing, test files included. The provenance comments say "the banner variations file in docs/design/" so the grep stays empty. The design-record tests live in `lib/banner/design-record.test.ts`, outside `app/`, for the same reason. |
| R2 | `app/components/SiteBanner.tsx` (new), `ReadingView.tsx`, `error.tsx` | One component. `ReadingView` mounts it as the card's first child, above the date band. Both routes render every state through `ReadingView`, so the render paths are listed below. The error boundary mounts it at the top of its own card. |
| R3 | `SiteBanner.tsx` | Two anchors to `/`, as in 0a. The wordmark is the one tab stop, with `aria-label="Ask Reloy — home"`. The portrait's anchor has `tabIndex={-1}` and `aria-hidden="true"`. One `<a>` around both wasn't possible: the tagline sits between them in 0a's layout and mustn't become part of the link's name. |
| R4 | `public/reloy-seer.png` | Manifest entry `a22c751d…`, base64-decoded. sha256 `63faa419c40d93094b53af6f3a871df19dcfcc238ea56ccdd7a1320a09dc57db`, the same as the bytes production serves (checked with curl). Rendered through `next/image` with `unoptimized`, so it's served as-is with no srcset and no `/_next/image`. It's 133×138 CSS px with `image-rendering: pixelated`, and the CSS has no fractional px value anywhere (tested). **Alt approach:** `alt=""`. The image sits inside the aria-hidden duplicate link, so the meaning is carried by the wordmark link's name, "Ask Reloy — home". |
| R5 | `app/components/site-banner.module.css` | Values in the table below. |
| R6 | same, `@media (max-width: 900px)` | 0e's Seer header. Portrait window 133×92 with `overflow: hidden`, `margin-left: -24px` and the image at `margin-top: -46px`. Wordmark 32px, line-height 1. Tagline `display: none`. No menu button. The banner is `position: static`, so it scrolls away (measured: its top is at −151px after scrolling 600px). |
| R7 | `lib/banner/taglines.ts` | `TAGLINES`, a constant. It's identical to the design's `BYLINES` array, which I checked programmatically against both the sprint file and the template. Number 16 keeps both curly apostrophes, U+2019. |
| R8 | `lib/banner/taglines.ts`, both `page.tsx` | `pickTagline(random)` takes the random source as a parameter. Both pages call `pickTagline(Math.random)` while rendering, after `await connection()`. I added `connection()` to `/reading/[id]`: awaiting `searchParams` already made that page dynamic, but now it's explicit, the same as the date page. No `"use client"` file in `app/` contains `Math.random`, `getRandomValues` or `randomUUID`; a test walks every file. |
| R9 | CSS | No `aria-live` and no `role="status"` (tested). The tagline box is 520px with `max-width: 100%` and `min-height: 46px`. It has no fixed height and no overflow rule, so it grows instead of clipping. Tagline 8 at 1440 measured 46px tall, 2 lines, `scrollHeight` not over `clientHeight`. |
| R10 | — | `app/layout.tsx` is untouched, so `metadata` is unchanged. Below the banner, the only diff is the `tagline` prop through `ReadingView` and the mount. `reading.module.css` is untouched. |
| R11 | tests below | |
| R12 | this file | Screenshots are in `docs/handoffs/sprint-43/`. |

**R2 render paths.** All go through `ReadingView` unless noted; each is tested in `banner-pages.test.ts`.
- `/date/[date]`:
  - the write form (no saved horoscope);
  - a saved horoscope (`ReadingPanel`, same path);
  - saved horoscopes unavailable (paused database);
  - generation disabled;
  - Sprint 39's unmatched and failed-events message.
- `/reading/[id]`:
  - written;
  - unwritten;
  - disabled;
  - Sprint 39's message.
- `/reading/[id]` error boundary (`error.tsx`): its own card, with no tagline.
- Not covered: the 404s from `notFound()`, which are Next's global page, not a card (Out of Scope).

**R5 values, design vs. implementation.** The design's values are from the template's 0a `<header>`, its children, and the `bylines` style string.

| Property | 0a | Here |
|---|---|---|
| header padding | `16px 40px 0` | same |
| header background | `linear-gradient(180deg, oklch(0.112 0.012 285) 0%, oklch(0.16 0.02 288) 100%)` | same (literal: no token has either stop) |
| bottom border | `1px solid oklch(0.29 0.02 288)` | `var(--om-rule-strong)`, the same value |
| portrait | `align-items: flex-end`, 133×138, pixelated | same; it rises from the bar's bottom edge |
| portrait ↔ text gap | 24px | 24px |
| text column | `gap: 8px; padding-bottom: 18px` | same |
| wordmark | Cormorant Garamond 300, 52px, line-height 0.95, `letter-spacing: 0.005em`, `oklch(0.94 0.012 85)` | `var(--font-cormorant)`, the rest the same; the colour is a literal because `--om-bone` is 0.92 |
| "Reloy" | italic, `oklch(0.70 0.13 145)` | italic, `var(--om-verdigris)`, the same value |
| tagline | italic 17px, line-height 1.35, `oklch(0.74 0.02 85)`, box 520×46 | same, except `min-height: 46px` instead of `height` (R9) |

I added two things the design doesn't specify: a `:focus-visible` outline on the wordmark (2px verdigris, 4px offset; see `desktop-1440-focus-ring.png`), and a `:hover` rule that keeps the wordmark's colour. The design sets the colour inline, which beats the global `a:hover`, and this reproduces that.

### Screenshots (`docs/handoffs/sprint-43/`)

How they were taken:
- Locally, with `next build` and `next start`, through headless Chromium (Playwright's cached `chrome-headless-shell` 1248) over the DevTools protocol.
- With placeholder Supabase values (an unreachable database), so the date page shows its "saved horoscopes unavailable" state and `/reading/<id>` reaches the error boundary.
- Wikipedia was live.

Desktop (1440):
- `desktop-1440-banner.png` beside `design-0a.png` (cropped from the committed design file, rendered in the same browser).
- `desktop-1440-date-page.png` (the first screen) and `desktop-1440-tagline-8.png`: tagline 8 swapped in, two lines, unclipped.
- `desktop-1440-focus-ring.png`.

Phone (390×844):
- `phone-390-date-page.png` beside `design-0e-seer.png`.
- `phone-390-scrolled.png`: the banner scrolls away.

JavaScript disabled: `desktop-1440-no-js.png` and `phone-390-no-js.png`. The banner, tagline and link all render.

Error boundary: `desktop-1440-reading-error.png` and `phone-390-reading-error.png`.

Measurements: `probe.json`. It shows:
- one focusable banner link, at both widths, on both routes;
- `scrollWidth` equal to `innerWidth` at 390;
- the first Tab stop is the wordmark link, and the second is outside the banner;
- the portrait and the wordmark each land on `/date/<today>` when clicked;
- 10 curls of `/date/1969-07-20` gave 7 different taglines.

### Tests added

- `lib/banner/taglines.test.ts` (9):
  - the list equals Requirement 7, typed out again in the test, verbatim and in order, with exactly 19 entries;
  - the curly apostrophes;
  - no duplicates;
  - `pickTagline`: 0 gives the first and just under 1 gives the last; both edges of every index's slice of [0, 1); it calls the source exactly once; it always returns a member for `Math.random`; a source that breaks its contract (1, 7, −0.2, NaN, Infinity) still returns a member.
- `lib/banner/design-record.test.ts` (5):
  - the design file's sha256;
  - no `banner_variations` anywhere under `app/`;
  - git tracks no `new_banner.html`;
  - the PNG equals the manifest entry's decoded bytes;
  - the PNG's IHDR is 133×138.
- `app/components/SiteBanner.test.tsx` (15):
  - markup: a `<header>`; exactly one focusable `/` link with the label; the portrait link hidden; the wordmark structure; img src, size, `alt=""` and no optimizer; the tagline as plain text; no live region; no nav, buttons or counter; `null` gives no tagline line;
  - CSS: pixelated and whole-number px; 0e's crop and 32px wordmark, tagline hidden; never sticky or fixed; the tagline has no fixed height and no clipping;
  - no randomness in any `"use client"` file, and the banner isn't a client component.
- `app/reading/[id]/banner-pages.test.ts` (10):
  - the six render paths above through the real pages, each checking that the banner opens the card and shows one of the 19;
  - the error boundary, with the banner and no tagline;
  - the error card's padding is on `.cardBody`, never `.card`, at both widths;
  - `Math.random` at 0 and just under 1 picks the first and last on the date and reading pages;
  - two requests can differ.
- `ReadingView.test.tsx` and `ChartTabs.test.tsx`: these pass `tagline` now that it's required. No assertions changed.

### Approach notes

- **Error card padding.** The `unavailable.module.css` card padding (`40px 44px`, and `28px 24px` on phones) moved from `.card` onto a new `.cardBody`, so the banner spans the card. The values are unchanged. My first pass moved only the desktop rule. The phone screenshot caught the banner inset on phones, I moved the phone rule too, and a test now pins both.
- **`overflow: hidden` on the banner.** On phones 0e's `-24px` margin pushes the portrait 6px past the banner's left edge, and on the narrow error card that would cross the card's border. Clipping at the banner keeps it inside at every width.
- **Preload link.** React 19 emits `<link rel="preload" as="image">` for the eager portrait; on a real page it's hoisted into `<head>`. `loading="eager"` was used instead of `priority`, which is deprecated in Next 16 (`node_modules/next/dist/docs/…/image.md`).

### Independence check

The diff touches:
- `app/components/` (new);
- `lib/banner/` (new);
- `public/` (new);
- `docs/design/banner_variations.html` and this handoff;
- `app/reading/[id]/`: `ReadingView.tsx`, `page.tsx`, `error.tsx`, `unavailable.module.css`, and tests;
- `app/date/[date]/page.tsx`.

It doesn't touch `README.md`, `app/page.tsx`, `lib/events/wikipedia.ts` (Sprints 40 and 41), `app/layout.tsx`, or `reading.module.css` (Dev Team 1's halo fix).

### Known limitations

- **The phone portrait isn't flush with the screen edge.** In 0e it's cut by the frame's edge. Here it's cut by the banner's edge, which sits 8px in from the screen because of the browser's default `body` margin, which the app has never reset. The date band and everything else on the page is inset by the same amount. Resetting it would change every section on the page, which R10 rules out, so I left it.
- **The banner adds 155px at desktop** (0a's chosen cost; see the Risks section), and 103px on phones.
- **Not checked locally:** a saved horoscope or a live database. With no `.env.local`, the screenshots show the unavailable states. The written and idle states are covered by the page tests, and by LiveQA on the deployed app.
- **No screen-reader pass.** I didn't run one; that's LiveQA's step 7.
- **The error card has no tagline,** by the user's decision above.

### Questions for QA1

- `/reading/[id]/page.tsx` gained `await connection()`. Awaiting `searchParams` already made the page dynamic, so it's belt and braces. Is there any objection to it, since R10 limits changes below the banner?
- Is the aria-hidden, tabIndex −1 portrait link an acceptable reading of R3's second option? R3 names it explicitly, but I'd like a second opinion that a mouse-only duplicate link is fine here.
