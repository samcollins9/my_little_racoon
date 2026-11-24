---
id: 43
title: "Ask Reloy site banner"
epic: "Site identity"
status: todo
created: 2026-11-24T02:09:23+00:00
---

# Master Controller Sprint Definition — Sprint 43

**Epic:** Site identity
**Sprint Objective:** Every date page and reading page opens with the "Ask Reloy" banner from Claude Design's direction 0a ("The Seer"). Its portrait and wordmark link home, and it shows one of 19 taglines, chosen at random for each page load.

### Context

The user commissioned banner variations from Claude Design. They're saved, untracked, as `new_banner.html` at the repository root: a 600 KB self-unpacking bundle. On 24 Nov 2026 the user chose direction **0a, The Seer**, plus its phone version from **0e**.

The bundle contains five sections:
- four desktop directions, 0a to 0d;
- 0e, which shows each of those directions at 390px wide;
- a script with the 19 taglines, which the mock-up cycles every 5.2 seconds with a dot picker.

**The user's decisions, which override the mock-up where they differ:**
- **One tagline, never cycling.** One tagline is picked at random for each page load and doesn't change. That means no timer, no dot picker and no "n / 19" counter.
- **No nav.** The mock-up's "New chart", "Readings" and "About" links are dropped. `/chart` was retired in Sprint 31, and the other two pages don't exist.
- **The name changes in the banner only.** The page `<title>` and description stay "Retroactive Horoscope".

**How to read the design file.** It's a bundle. The markup is a JSON-encoded template inside `<script type="__bundler/template">`, and the images and fonts are base64 inside `<script type="__bundler/manifest">`, keyed by UUID.
- 0a's portrait is manifest entry `a22c751d-6a0c-445a-b519-3c7ddb95d36b`: a 133×138 PNG.
- The other portrait, `a07d4809-…`, belongs to 0b and 0d and isn't used.

Master Controller unpacked it this way to write this sprint. Dev Team takes the exact styles from the template. The values quoted below were read from it and are there for QA1 to check against.

### Requirements

**The design record**

1. **Commit the design.** `new_banner.html` is committed, unmodified, as `docs/design/banner_variations.html`, as the design record, the same way Sprint 13's and 19's prototypes were kept. It's removed from the repository root. Nothing in `app/` loads it.

**The banner**

2. **Placement.** The banner is a `<header>` at the top of the reading card, above the date band, on `/date/[date]` and `/reading/[id]`, in every state those pages render. That includes the "unavailable" states and the reading page's error boundary wherever it renders the card. It's the full card width, as in 0a. It's built once and shared, not copied into each page.
3. **The home link.**
   - The portrait and the "Ask *Reloy*" wordmark link to `/`.
   - Keyboard users meet **one** link, one tab stop, named "Ask Reloy — home" or equivalent. Either wrap both in a single `<a>`, or keep two anchors with the portrait's anchor out of the tab order and hidden from assistive technology. Which approach is Dev Team's choice; the outcome is one tab stop.
4. **The portrait.**
   - The image is 0a's PNG (`a22c751d…`), extracted byte for byte to `public/`.
   - It's shown at 133×138 CSS pixels, or another whole-number multiple, with `image-rendering: pixelated`, never smoothed or scaled by a fraction.
   - Its alt text is the design's: "Reloy, bald with a third eye and a gold medallion, gazing at a crystal ball". If it sits inside the home link with the wordmark, the link's own name carries the meaning, and the image's alt may be empty. Dev Team decides, and states which in the handoff.
5. **Desktop layout matches 0a**, apart from the removed nav and dot row. Specifically:
   - the header's padding and gradient;
   - the bottom border;
   - the portrait at the left, rising from the bar's bottom edge;
   - the wordmark: Cormorant Garamond 300, 52px; "Reloy" italic in the accent green;
   - the tagline under it: italic, 17px, `oklch(0.74 0.02 85)`.

   Use the project's existing colour tokens and `next/font` variables (`--font-cormorant`, `--font-mono`) wherever an equivalent exists, not raw literals.
6. **Phone layout matches 0e's Seer version** at the project's existing phone breakpoint (`max-width: 900px`). That means:
   - the portrait cropped to a 92px-tall window (`overflow: hidden`, the image offset `-46px`, `margin-left: -24px`);
   - the wordmark at 32px;
   - **no tagline**, following 0e;
   - **no menu button**, because there's no nav to fold.

   The banner scrolls with the page, as Sprint 38 requires. It isn't sticky, and it causes no horizontal scroll at 390px.

**The tagline**

7. **The list.** These are the 19 taglines, verbatim. Keep the curly apostrophe in "Tomorrow’s".
   1. Yesterday a fortune awaits
   2. The uncertainties of yesterday are the certainties of tomorrow, as understood today.
   3. Fortune reveals itself most clearly to those who have already experienced it.
   4. The stars foretell that which time has graciously confirmed.
   5. What fate has already bestowed, the heavens need only reveal.
   6. The wise consult the heavens before drawing conclusions about what has already occurred.
   7. The wheel of fortune turns most accurately in the direction of its previous rotation.
   8. When the celestial bodies are in agreement with yesterday, the destiny of man becomes without doubt.
   9. The future of the past is seldom concealed from the properly aligned heavens.
   10. He who understands the arrival of yesterday need not fear its approaching.
   11. Only through the backward illumination of fortune can destiny become previously apparent.
   12. The stars do not alter what has been, but provide certainty in its having become.
   13. Discover what destiny had in store for you.
   14. Ancient wisdom. Unprecedented hindsight.
   15. Unlock the mysteries of what was to be.
   16. Tomorrow’s wisdom for yesterday’s uncertainties.
   17. Revealing the inevitable, one occurrence at a time.
   18. Let the heavens confirm your suspicions.
   19. For every yesterday, a prophecy awaits.

   They live in one module as a constant, not in a data file read at runtime.
8. **Random for each page load, with no client JavaScript.**
   - One tagline is chosen **on the server** for each request and rendered as plain text. Both pages are already rendered on each request (`connection()`).
   - It never changes after load.
   - It works with JavaScript disabled, and there's no hydration mismatch, because no random choice is made on the client.
   - The selection function takes its random source as a parameter, so it's unit-testable.
9. **Accessibility.** The tagline isn't an `aria-live` region, because nothing changes after load. The longest tagline (number 8) fits the desktop tagline box without being cut off; the box may grow to a third line if needed, but must not clip.

**Unchanged**

10. **Nothing else changes.** No nav, no tagline timer or picker, and `metadata` (title and description) stays "Retroactive Horoscope". The date band, chart, events and reading sections below the banner are visually unchanged. The only difference on desktop is the banner's added height.

**Record and checks**

11. **Tests.** Unit tests cover:
    - the selection function: every index is reachable at the boundaries of the random source (0, and just under 1), and it returns a member of the list;
    - the list itself: exactly 19 entries, matching Requirement 7.
12. **Handoff.** The handoff follows CLAUDE.md's committed-handoff standard: `docs/handoffs/sprint-43.md`, with `npm run verify`'s final line and `exit=0`. It includes screenshots, committed under `docs/handoffs/sprint-43/`:
    - desktop at 1440 wide, beside 0a rendered from the design file;
    - phone at 390×844, beside 0e's Seer version;
    - one with JavaScript disabled.

### Acceptance Criteria

- **R1:** `docs/design/banner_variations.html` is byte-identical to the original (`sha256sum` is in the handoff). The root copy is gone. Grep of `app/` finds no reference to it.
- **R2:** One banner component is used by both pages' render paths, including their unavailable and error states. QA1 lists each render path and confirms it.
- **R3:**
  - The rendered markup has exactly one focusable link to `/` in the banner.
  - The accessible name includes "Ask Reloy".
- **R4:**
  - `public/`'s PNG matches the manifest entry's decoded bytes (`sha256sum` is in the handoff).
  - The CSS has `image-rendering: pixelated` and whole-number dimensions.
  - The alt approach is stated.
- **R5 and R6:** QA1 compares the CSS values against the template's 0a and 0e blocks. LiveQA compares them visually (below).
- **R7:** A test asserts the list equals the 19 strings above, verbatim.
- **R8:**
  - Grep finds no `Math.random` or equivalent in any `"use client"` file in the banner.
  - The tagline is present in the server HTML (`curl` output).
  - The function takes its random source as a parameter.
- **R9:** There's no `aria-live` in the banner, and the R12 screenshots show tagline 8 unclipped.
- **R10:** `layout.tsx`'s `metadata` is unchanged. The diff touches no section below the banner except to mount it.
- **R11:** The named tests exist, and `npm run verify` ends with `VERIFY PASS … exit=0`.
- **R12:** QA1 reads `docs/handoffs/sprint-43.md` at the audited commit.

**LiveQA (the deployed app):**
1. **Desktop, 1440 wide:** open a date page and compare the banner with 0a from `docs/design/banner_variations.html`, opened locally in a browser (it unpacks itself). Check:
   - the portrait is crisp, not blurred;
   - the wordmark and tagline match;
   - there's no nav and no dots.
2. **The tagline varies.** Reload, or `curl` the page, 10 times and record the taglines seen. More than one distinct tagline should appear. If all 10 match, try 10 more before calling it a defect.
3. **The home link.** Click the portrait, then the wordmark; each should end on Sprint 41's `/` destination (or today's date, if 41 hasn't shipped yet). Tab from the top of the page: the banner should give exactly one tab stop.
4. **Phone, 390×844:** compare with 0e's Seer version. Check that the portrait is cropped and crisp, there's no tagline, there's no horizontal scroll, and the banner scrolls away with the page.
5. **JavaScript disabled:** the banner and tagline render, and the link works.
6. **`/reading/<id>`:** check one saved reading for the same banner.
7. **Screen reader:** the banner reads as one link plus one line of text, with nothing announced after load. Try the screen reader available on this machine: Windows Narrator, NVDA, or Orca if WSLg is available. Record which one was used. If none can be started, record what was tried.

### Out of Scope

- **Readings and About pages, and any nav.** These are user decisions for later sprints, if wanted.
- **Renaming the site** (title, description or domain): the user decided the banner only.
- **Directions 0b, 0c and 0d,** and the second portrait.
- **The banner on routes other than `/date/[date]` and `/reading/[id]`,** such as the global 404 page. They're not cards, and adding it there is a follow-up if wanted.
- **The Silkscreen font,** which only 0c uses.

### Dependencies

- **Blocks:** nothing.
- **Blocked by:**
  - Sprint 42's worktree branch (`devteam2/sprint-42`) reaching main through Pipeman. Its `ReadingView.tsx` changes must be on main before a new worktree branches from it.
  - The fast-lane halo and long-word fix, which has already landed (`71b8e88`).
- **Shared files:** none with Sprints 40 and 41 (`README.md`, `app/page.tsx`, `lib/events/wikipedia.ts`). If Requirement 2 needs `app/layout.tsx`, it's a new file for this sprint only.
- **External:** none. The fonts are already self-hosted through `next/font`.

### Human Prerequisites

- **Before Dev Team 2 creates its worktree:** Pipeman merges `devteam2/sprint-42` into main. The user tells Pipeman to do this, in Pipeman's session.
- **The user confirms that the portrait may be published.** It's a pixel portrait that resembles a real person ("Reloy"). Confirm that whoever it depicts is fine with it appearing on the public site. If not, the sprint is blocked until a replacement image exists.

### Team Assignments

- **Dev Team 2:** all of it, in its own worktree, created **after** `devteam2/sprint-42` is merged into main. Run `/sprint-worktree 43`. It runs alongside Dev Team 1's Sprints 40 and 41, and no file is shared (see Dependencies).
- **Dev Team 1:** not assigned (Sprints 40 and 41).

### Risks & Mitigations

- **The banner pushes the reading down on desktop.** The 0a bar is about 150px tall. — That's accepted by choosing 0a. LiveQA's screenshots record the before-and-after first screen, so the user sees the cost.
- **A random choice causes a hydration mismatch.** — Requirement 8 keeps the choice on the server, and the acceptance check greps client files.
- **The portrait gets blurred by scaling.** — Requirement 4 requires whole-number sizes and `pixelated`, and LiveQA checks it at both widths.
- **The design file grows the repository by 600 KB.** — It's accepted as the design record, as earlier prototypes were. The banner itself ships only the 4 KB PNG.
