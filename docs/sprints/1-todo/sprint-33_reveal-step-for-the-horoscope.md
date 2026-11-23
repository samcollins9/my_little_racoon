---
id: 33
title: "Reveal step for the horoscope"
epic: "Date pages"
status: todo
created: 2026-11-23T00:36:59+00:00
---

# Master Controller Sprint Definition — Sprint 33

**Epic:** Date pages. The app is addressed by date. A date page shows the chart and
events on load, and casts a horoscope on demand (Sprints 28–31).

**Sprint Objective:** Every reading opens on the stars and "What happened", with the
horoscope folded away. A single **Reveal the horoscope** step either unfolds the
saved horoscope instantly or generates a new one. The panel's wording changes from
"write" to "reveal".

### Context

Today a date that already has a horoscope opens with it fully displayed, and a date
without one says "Nothing has been written about it yet — write the horoscope…" with
a **Write the horoscope** button. The user wants one experience for both cases: the
visitor always sees the chart and events first, then takes a second step to open the
horoscope. Whether that step generates a new horoscope or reveals one written
earlier should make no difference to the visitor.

The user chose, on 23 Nov 2026: revealing a **saved** horoscope happens **in the
page, with no reload**. The text is already in the page, folded away, and
unfolding it needs no JavaScript. Generating a new one keeps the existing server
action.

**Prior record checked (planning rule 11).**
- Sprint 24 renamed the button ("Read the chart" → "Write the horoscope").
- Sprint 28's R5 and R6 define the cast and outage states.
- Sprint 31 replaced the "Cast a new chart" link.
- No finding records a measurement this sprint relies on.

### Requirements

1. **Wording: "write" becomes "reveal"** in the reading panel's user-visible copy:
   - the idle sentence becomes "The chart stands as it is. Nothing has been
     revealed about it yet — **reveal the horoscope** when you want the sky
     held…" (keep the rest of the sentence as it is);
   - the button becomes **Reveal the horoscope**;
   - any pending or in-progress label uses "reveal" wording too, for example
     "Revealing…";
   - "Try again" after a failed generation stays;
   - the existing error and disabled messages ("Horoscope generation failed, try
     again." and "Horoscope generation is currently disabled.") may stay as they
     are. If Dev Team thinks they read oddly next to "reveal", propose new wording
     in the handoff; don't build it.
2. **Same folded state whether or not a horoscope exists.** When a page loads, the
   panel shows the idle sentence and the **Reveal the horoscope** control in both
   cases, with the same copy and the same look:
   - when the date or reading has a saved horoscope;
   - when it has none and generation is enabled.

   The horoscope text is never visible before the visitor reveals it.
3. **Revealing a saved horoscope is in-page.**
   - The control unfolds the saved text without a request, a reload or a URL change.
   - It works with JavaScript disabled, using a native disclosure such as
     `<details>`/`<summary>` or an equivalent no-JS pattern.
   - It's keyboard-operable, and a screen reader announces the expanded or collapsed
     state.
   - Once unfolded, the horoscope renders exactly as it does now: paragraphs,
     styling, and the model and timestamp metadata, if shown today.
4. **Revealing with no saved horoscope generates one,** through the existing server
   action, unchanged.
   - After a successful generation the visitor lands back on the page with the new
     horoscope **already revealed**, not folded. The mechanism is Dev Team's call.
     If it's a query parameter or a fragment, loading that URL must never generate,
     write or call OpenAI, and on a date with no horoscope it simply shows the
     folded state.
   - Failure keeps today's behaviour: back on the page with the error and **Try
     again**.
5. **Disabled and outage states are unchanged.**
   - Generation disabled, with no saved horoscope: the existing disabled note, with
     no reveal control.
   - Generation disabled, with a saved horoscope: the reveal control works, because
     revealing saved text isn't generation.
   - Lookup unavailable (Sprint 28, R6): the existing notice, with no reveal
     control.
6. **Both routes.** It applies to the date page and to old `/reading/[id]` links,
   through the shared panel. Those links keep their own 404 and outage behaviour.
7. **The chart, "What happened" and navigation are untouched.** They render exactly
   as now, above or beside the panel, whatever the panel's state.
8. **Tests.** Unit or component tests for the panel's states:
   - saved horoscope, folded;
   - saved horoscope, revealed after generation (the landing-revealed case);
   - no horoscope with generation enabled (folded, generate on reveal);
   - no horoscope with generation disabled;
   - error with "Try again";
   - lookup unavailable.

   Assert the user-visible text for each: R1's wording, and that the horoscope text
   is inside the folded container rather than visible. Also assert that the
   landing-revealed URL's server render calls no write and no OpenAI client.

### Acceptance Criteria

**QA1 (static):**
- **R1:** `grep` the panel and page components for user-visible "write the
  horoscope", "Write the horoscope" and "Nothing has been written". None remain.
  Code comments are fine.
- **R2:** both states render the same idle copy and control markup. Read both
  branches side by side.
- **R3:**
  - The disclosure is native or no-JS.
  - The saved text is inside it.
  - No client component or `fetch` is introduced to reveal saved text.
- **R4:**
  - Trace the landing-revealed mechanism. A GET with it on any date performs no
    insert or update, makes no `set_reading_horoscope` call and no OpenAI call.
  - The server action is unchanged apart from where it redirects.
- **R5:** trace the disabled-with-saved-horoscope branch. The reveal control is
  present there, and no generation form is.
- **R6, R7:** the diff is limited to the shared reading panel and view, the two
  routes' page wiring, and tests. There's no change under `supabase/`,
  `lib/llm/` or `app/date/[date]/DateNavigation*`.
- **R8:** the tests exist and assert the text. `npm test`, typecheck, lint and
  build are green.

**LiveQA (against the deployed app, after Pipeman pushes):**
1. **A date with a saved horoscope** (any link from "Recently written"):
   - the page opens with the chart and "What happened" visible, and the horoscope
     **not** visible;
   - the panel reads "Nothing has been revealed…" and shows **Reveal the
     horoscope**;
   - clicking it unfolds the horoscope instantly, with no navigation in the network
     panel;
   - repeat with JavaScript disabled: it still unfolds.
2. **A date without one:** the same copy and control. Revealing generates a horoscope
   and lands with it already revealed. Reload the plain date URL: it opens folded
   again, and revealing is now instant. Record the date you cast.
3. Load the landing-revealed URL from step 2 on a fresh date with no horoscope. It
   shows the folded state and generates nothing; ask the user to confirm the row
   count, as in Sprint 28's step 2, or say what was tried.
4. Keyboard only: Tab to the control and press Enter or Space to unfold it.
5. An old `/reading/[id]` link with a horoscope behaves as in step 1.
6. Phone width (about 390px): the folded and revealed states both lay out without
   horizontal scroll.

### Out of Scope
- **Hiding the horoscope from the page source or from crawlers.** The user chose
  in-page reveal, so the saved text is in the HTML, folded. Revealing is a
  presentation step, not access control.
- **Remembering a visitor's reveal** between visits.
- **Rewording error or disabled messages** (R1 allows a proposal only).
- **Changing what gets generated,** the prompt, or the model.
- **Navigation order and chart tooltips.** Those are Sprints 32 and 34.

### Dependencies
- Blocks: none.
- Blocked by: Sprint 31, which edited the same reading panel, must be merged to
  `main` first.
- **Run before Sprint 34, not in parallel with it.** Both touch the shared reading
  view (`ReadingView.tsx`).
- External: OpenAI, for LiveQA step 2's one cast.

### Human Prerequisites
- None. Generation is already enabled in production. Supabase must be awake during
  LiveQA.

### Team Assignments
- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** not assigned.

### Risks & Mitigations
- **The landing-revealed parameter turns into a trigger** that generates on GET. R4
  forbids it, and QA1's trace and LiveQA step 3 check it.
- **The two folded states drift apart,** which tells the visitor whether a
  horoscope already exists. R2 requires identical markup, and QA1 reads both
  branches.
- **A disclosure without JavaScript that screen readers can't operate.** R3 names
  the native element, and LiveQA step 4 checks it.
