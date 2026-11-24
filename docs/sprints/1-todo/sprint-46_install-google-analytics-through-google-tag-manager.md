---
id: 46
title: "Install Google Analytics through Google Tag Manager"
epic: "Analytics"
status: todo
created: 2026-11-24T22:07:51+00:00
---

# Master Controller Sprint Definition — Sprint 46

**Epic:** Analytics (measure how the site is actually used)
**Sprint Objective:** Every page on the production site loads the Google Tag Manager container `GTM-T9WQSKH3` exactly once, so page views reach the user's Google Analytics stream.

### Context

On 24 Nov 2026 the user created a Google Analytics stream and asked for the Google tag to be installed on every page. Google gave this snippet for the container, to go immediately after `<head>`, with no more than one Google tag per page:

```html
<script async src="https://www.googletagmanager.com/gtm.js?id=GTM-T9WQSKH3"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
</script>
```

The ID is a Tag Manager container (`GTM-`), not a GA4 measurement ID (`G-`). Page views only reach Analytics if the container itself has a GA4 tag, configured and published in Tag Manager, which is outside this repo (see Human Prerequisites). The user decided on 24 Nov 2026 that there is **no consent banner**: the tag loads for every visitor. This is the site's first runtime request to a third-party host. Fonts are deliberately self-hosted (the root layout's R3 comment), and that stays true.

### Requirements

1. **One container, every page.** Every page the app renders loads container `GTM-T9WQSKH3` exactly once. That includes `/date/[date]`, `/reading/[id]`, `/chart` and the 404 page. It's loaded from the root layout, not page by page.
2. **Equivalent to Google's snippet.** Either the snippet above as given, or Next's own `GoogleTagManager` from `@next/third-parties/google`, which is documented in `node_modules/next/dist/docs/01-app/02-guides/third-party-libraries.md`. Dev Team picks one and gives the reason in the handoff. Either way:
   - `window.dataLayer` exists before the container runs.
   - The container script loads `async`, or through `next/script`, so it never blocks rendering.
   - There's no second Google tag, and no `gtag/js?id=G-…` tag alongside it.

   Google's "immediately after `<head>`" isn't literally possible through Next's script loading. Loading once per page from the root layout meets this requirement.
3. **Production only.** The container loads only when `VERCEL_ENV` is `production`. Local `npm run dev`, a local `npm run build && npm start`, Vercel preview deployments and the test suite don't load it, and don't send hits. Read `VERCEL_ENV` on the server, not through a `NEXT_PUBLIC_` variable.
4. **The ID in one place.** `GTM-T9WQSKH3` appears in exactly one source constant. It's public, so it isn't a secret and needs no environment variable.
5. **Nothing else changes.** No page's markup, behaviour or metadata changes, apart from the tag. The root layout's font comment ("no runtime request to … any other host") is reworded so that it's still true: fonts are self-hosted, and analytics is the one deliberate third-party request.
6. **Tests.** Unit tests cover R3's switch: the tag renders when `VERCEL_ENV=production`, and doesn't render for `preview`, `development` or unset. A test confirms the container ID is `GTM-T9WQSKH3`.
7. **README.** A short "Analytics" section says that production loads GTM container `GTM-T9WQSKH3` and only production loads it. It also says where the GA4 tag is configured: in Tag Manager, not in this repo.
8. **Handoff.** Follow CLAUDE.md's committed-handoff standard: `docs/handoffs/sprint-46.md`, with `npm run verify`'s final line including `exit=0`. If R2 adds `@next/third-parties`, give the version and confirm it matches the installed `next` major.

### Acceptance Criteria

- **R1 and R2:** QA1 confirms that the tag is added in `app/layout.tsx` only and that no page adds another. There's exactly one `GTM-` reference in the source, and no `G-` measurement ID tag.
- **R3 and R6:** the tests pass. QA1 confirms `VERCEL_ENV` is read server-side, and that there's no `NEXT_PUBLIC_VERCEL_ENV` or other client-side switch.
- **R4:** grep finds `GTM-T9WQSKH3` once in `app/` and `lib/`. Tests may also reference it.
- **R5:** the diff touches no page component apart from the root layout. The font comment is accurate.
- **R7 and R8:** QA1 reads `docs/handoffs/sprint-46.md` at the audited commit and finds `VERIFY PASS … exit=0`. Any new dependency is named and justified there.

**LiveQA (the deployed app, in a real browser with DevTools):**
1. Open `https://my-little-racoon.vercel.app/date/1969-07-20`, and in the Network panel confirm that `googletagmanager.com/gtm.js?id=GTM-T9WQSKH3` loads once.
2. In the console, `window.dataLayer` is an array, and `google_tag_manager["GTM-T9WQSKH3"]` exists.
3. A GA4 hit (`google-analytics.com/g/collect` or `region1.google-analytics.com/g/collect`) is sent on load. If no hit is sent but `gtm.js` loads, record that. It points to the container's configuration (Human Prerequisites), not to this code.
4. Navigate within the app without a full reload (Previous/Next reading, or the banner link). Record whether a second page-view hit is sent. Whether it is depends on the container's history-change setup (Human Prerequisites), so record it either way.
5. Check that `/reading/<a real id>` and a 404 URL each load the container once too.
6. View the page source of a Vercel preview deployment, if one exists. Otherwise run a local `npm run build && npm start`. Confirm the container is absent there.
7. If the person with access to Google Analytics can watch it during the test, they confirm the visit appears in GA4 Realtime. LiveQA records whether that was checked.

### Out of Scope

- **A consent banner.** The user declined it on 24 Nov 2026. It would be its own sprint if needed later.
- **Custom events** (for example "horoscope written" or "date picked") through `dataLayer` or `sendGTMEvent`. Page views only this sprint.
- **A privacy policy page.**
- **Content-Security-Policy headers.** The app sends none today (`next.config.ts` is empty), so nothing needs loosening.
- **Configuring tags in Tag Manager or Google Analytics.** It's done in Google's UI, by the user.

### Dependencies

- **Blocks:** nothing.
- **Blocked by:** nothing in code. It's queued after Sprint 45 for Dev Team 1, see Team Assignments.
- **External:** Google Tag Manager container `GTM-T9WQSKH3` and the user's GA4 stream.

### Human Prerequisites

- **The GA4 tag in the container.** Before LiveQA's step 3, the user makes sure Tag Manager container `GTM-T9WQSKH3` has a **Google tag** (or GA4 configuration tag) with the stream's `G-` measurement ID, firing on **All Pages**, and that the container version is **published**, not just saved. Without it, the code works but no data reaches Analytics.
- **Page views on in-app navigation.** For LiveQA's step 4, either the GA4 stream's Enhanced measurement has "Page changes based on browser history events" turned on (Admin → Data streams → the stream → Enhanced measurement → Page views → Advanced), or the container has a History Change trigger. Without one of them, only the first page of each visit is counted, because Next's links navigate without a full reload.
- **Optional, for LiveQA's step 7:** someone with access to Google Analytics watches Realtime during the live test.

### Team Assignments

- **Dev Team 1:** all of it, after Sprint 45. This sprint touches `app/layout.tsx`, the README and possibly `package.json`, and Sprint 45 doesn't touch those files apart from the README. If the user wants the two sprints in parallel instead, Dev Team 2 can take this one in its own worktree (`/sprint-worktree 46`). The only shared file is the README, and Pipeman resolves it at merge.
- **Dev Team 2:** not assigned unless the user asks for parallel work.

### Risks & Mitigations

- **`VERCEL_ENV` isn't visible at runtime.** It's a Vercel system variable, exposed by default. — LiveQA's step 1 catches a missing tag on production, and step 6 catches a tag leaking elsewhere.
- **Hits from development pollute the data.** — R3 restricts the tag to production. Tests never load it.
- **Double counting.** A second Google tag, or GA4 configured both in code and in the container, would count every view twice. — R2 rules out a `G-` tag in code. LiveQA's step 1 confirms one `gtm.js` load.
- **Nothing reaches Analytics even though the code is right.** — Human Prerequisites name the container setup. LiveQA's steps 3 and 4 record the result separately from the code verdict.
