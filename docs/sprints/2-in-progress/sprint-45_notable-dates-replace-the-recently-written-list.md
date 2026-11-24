---
id: 45
title: "Notable dates replace the recently written list"
epic: "Date pages (PRD v3)"
status: in_progress
created: 2026-11-24T15:43:15+00:00
---

# Master Controller Sprint Definition — Sprint 45

**Epic:** Date pages (PRD v3)
**Sprint Objective:** The date page's "Recently written" list becomes a fixed list of 20 notable dates since 1900, each with a short description. The list also appears at the bottom of the page on phones, under "Other notable dates".

### Context

Sprint 29 added "Recently written": the 20 most recently written dates, from `get_recent_reading_dates`. On 24 Nov 2026 the user asked for it to be replaced by quick links to interesting dates in history, whether or not a reading exists for them. The list comes from a one-time web search, "What are the 20 most famous dates since the year 1900?" Master Controller ran that search during planning, so the content is fixed below and nobody searches again. "Previous reading" and "Next reading" stay exactly as they are, so a visitor can still move between written readings.

Master Controller checked every date against the Wikipedia feed the app uses (`onthisday/selected/MM/DD`) on 24 Nov 2026. Three of the first-draft dates had no event for their year, so Sprint 39 would have refused a horoscope there: Black Tuesday (29 Oct 1929), Pearl Harbor (7 Dec 1941) and Sputnik (4 Oct 1957). The user chose to replace them with Black Thursday (24 Oct 1929), Gagarin (12 Apr 1961) and Mandela's release (11 Feb 1990). All 20 dates below matched on 24 Nov 2026. The user also reports that the list doesn't show on phones. The current code renders it on phones as a folded `<details>` in the strip under the date picker. Either way, this sprint replaces that with a visible list at the bottom of the page.

### Requirements

1. **The list, verbatim.** These 20 dates and descriptions live in one committed source module. They're shown oldest first. Use the descriptions exactly as written here.

   | Date | Description |
   |---|---|
   | 1912-04-15 | The Titanic sinks in the North Atlantic |
   | 1914-06-28 | Archduke Franz Ferdinand is assassinated in Sarajevo |
   | 1918-11-11 | The armistice ends fighting in World War I |
   | 1929-10-24 | Black Thursday begins the Wall Street Crash |
   | 1939-09-01 | Germany invades Poland, starting World War II |
   | 1944-06-06 | D-Day: the Allies land in Normandy |
   | 1945-05-08 | VE Day: the war in Europe ends |
   | 1945-08-06 | An atomic bomb is dropped on Hiroshima |
   | 1945-10-24 | The United Nations is founded |
   | 1947-08-15 | India becomes independent |
   | 1955-12-01 | Rosa Parks is arrested in Montgomery |
   | 1961-04-12 | Yuri Gagarin becomes the first person in space |
   | 1963-08-28 | Martin Luther King Jr. gives his "I Have a Dream" speech |
   | 1963-11-22 | President John F. Kennedy is assassinated |
   | 1969-07-20 | Apollo 11 lands on the Moon |
   | 1986-01-28 | The Space Shuttle Challenger breaks apart |
   | 1989-11-09 | The Berlin Wall falls |
   | 1990-02-11 | Nelson Mandela is released from prison |
   | 2001-09-11 | The September 11 attacks |
   | 2020-03-11 | The WHO declares COVID-19 a pandemic |

2. **Static, with no database or network.** The list is built into the app. Rendering it doesn't call Supabase or Wikipedia. Because it doesn't need the database, it still renders when the navigation lookups fail (Sprint 29's R4 "unavailable" case). Only Previous and Next disappear then.
3. **Desktop.** The list replaces "Recently written" in the same spot, under Previous/Next in the strip below the date picker. The links look the same as today's list links. The heading reads "Other notable dates". Each date's description shows as a tooltip on mouse hover **and** on keyboard focus, and screen readers announce it with the link.
4. **Phones (≤900px).** The list doesn't appear in the strip under the date picker. It appears at the bottom of the page, after the reading section, under a banner reading "Other notable dates", styled like the page's existing section titles. It's not folded behind a disclosure. Each date shows its description as a small visible line under it, since phones have no hover. Previous/Next stay in the strip on phones, unchanged.
5. **The current date.** If the page's own date is on the list, it's marked with `aria-current="page"` and not linked, as Sprint 29's R3 does today. Its description still shows.
6. **Links.** Each link goes to `datePagePath(isoDate)`, with `prefetch={false}` as today.
7. **Previous/Next don't change.** Their logic, queries, labels and placement stay as they are.
8. **Retire the recent-dates query in the app.** The app no longer calls `get_recent_reading_dates`. Remove the code, types and tests that only served the recent list (for example `RecentReadingDate`, `recent` in `DateNavigation`, and the sort in `shapeDateNavigation`). Don't write a migration, so the SQL function stays in the database. The navigation's `aria-label` ("Dates with readings") no longer describes the whole `<nav>`. Give it labels that match what each part now holds.
9. **Valid dates only.** A unit test checks that every entry passes `parseDatePageParam`, that there are exactly 20 entries, that they're oldest first with no duplicates, and that the descriptions are exactly the text in R1.
10. **README.** Any README text describing "Recently written" or `get_recent_reading_dates` as used by the page is updated.
11. **Handoff.** Follow CLAUDE.md's committed-handoff standard: `docs/handoffs/sprint-45.md`, with `npm run verify`'s final line including `exit=0`. Include two screenshots under `docs/handoffs/sprint-45/`: desktop at ≥1280px wide showing the list with one tooltip open, and a phone at ~390px showing the bottom "Other notable dates" section.

### Acceptance Criteria

- **R1 and R9:** the unit test passes. QA1 compares the module's text with R1's table.
- **R2:** QA1 confirms the list's module imports nothing from `lib/supabase` or `lib/events`. A test renders the date page's navigation in the "unavailable" case and finds all 20 links, with no Previous or Next.
- **R3:** a test finds the heading "Other notable dates" in the desktop copy, and each link's description is in its accessible name or description. QA1 confirms from the code that the tooltip shows on `:focus-visible`/focus as well as hover. A native `title` attribute alone doesn't meet R3, because it never shows on keyboard focus.
- **R4:** QA1 confirms from the code that the phone copy is outside the strip, after the reading section, and not inside `<details>`. The mobile screenshot shows it.
- **R5:** a test with the page's date set to 1969-07-20 finds that entry with `aria-current="page"` and no link.
- **R7:** the existing Previous/Next tests pass unchanged, except where they had to drop the `recent` field.
- **R8:** grep finds no `get_recent_reading_dates`, `RecentReadingDate` or "Recently written" in `app/` or `lib/`. `supabase/migrations/` is unchanged.
- **R10 and R11:** QA1 reads `docs/handoffs/sprint-45.md` at the audited commit, which shows `VERIFY PASS … exit=0`, and opens both screenshots.

**LiveQA (the deployed app):**
1. Desktop (≥1280px): open `/date/1969-07-20`. "Other notable dates" lists 20 dates, oldest first. 20 July 1969 is marked and not linked. Hovering a link shows its description, and so does tabbing to it with the keyboard. "Recently written" is gone.
2. Click three links (one early, one middle, one late, such as 1912-04-15, 1961-04-12 and 2020-03-11). Each opens that date page with Wikipedia events for that year, and the horoscope is offered or shown, not refused. If one is refused, record the date and the feed's response. That isn't necessarily a code defect, see Risks.
3. Phone (~390px): no list in the strip under the picker. Previous/Next are still there. After the reading section there's an "Other notable dates" banner with 20 dates, each with its visible description, not folded.
4. Previous and Next still go to the neighbouring written readings.

### Out of Scope

- **Dropping `get_recent_reading_dates` from the database.** A migration has to be applied by hand to the hosted database, and nothing gains from that this sprint. It's a later clean-up if wanted.
- **Re-running the web search, or making the list editable or random.** The user asked for a one-time lookup.
- **A list on `/reading/[id]`.** That page has no strip today (Sprint 31) and gets no list.
- **Checking the feed at runtime to hide dates.** The list is static by design.

### Dependencies

- **Blocks:** nothing.
- **Blocked by:** nothing. Sprints 37–44 are all closed.
- **External:** none. The descriptions come from the 24 Nov 2026 search, and the feed matches were checked by Master Controller the same day.

### Human Prerequisites

None.

### Team Assignments

- **Dev Team 1:** all of it.
- **Dev Team 2:** not assigned. The work is in `ReadingView`, the date page and its navigation, which can't be split cleanly.

### Risks & Mitigations

- **The Wikipedia feed changes.** The `selected` feed is curated and can drop a year, so a listed date might later show Sprint 39's refusal. — All 20 matched on 24 Nov 2026. The user accepted a static list, and the page still shows the chart and the year links in that case. LiveQA records any mismatch, not as a code defect.
- **The bottom section and the sticky reveal bar on phones.** Sprint 38's folded reveal is `position: sticky; bottom: 0` inside the reading section. — The new section goes after the reading section, outside its sticky container, so the bar can't sit on top of it. LiveQA step 3 checks this by scrolling to the bottom with a horoscope folded.
- **Tooltips that only work with a mouse.** — R3 and its acceptance criterion rule out `title` alone.
