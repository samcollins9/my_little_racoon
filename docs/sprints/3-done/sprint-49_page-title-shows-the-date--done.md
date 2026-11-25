---
id: 49
title: "Page title shows the date"
epic: "Date pages (PRD v3)"
status: done
created: 2026-11-25T15:38:57+00:00
---

# Master Controller Sprint Definition — Sprint 49

**Epic:** Date pages (PRD v3)
**Sprint Objective:** The browser title of a page showing a date reads "Retroactive Horoscope YYYY-MM-DD", for example "Retroactive Horoscope 2026-11-25".

### Context

Every page's `<title>` today is the root layout's static `metadata.title`, "Retroactive Horoscope". So a visitor with several dates open in tabs can't tell them apart, and the Google Analytics page titles from Sprint 46 are all the same. On 25 Nov 2026 the user asked for the page's date to be appended to the title, in ISO form, separated by one space. The site name in metadata stays "Retroactive Horoscope", as Sprint 43 decided. This sprint only appends the date.

### Requirements

1. **The format, exactly.** `Retroactive Horoscope ` followed by the page's date as `YYYY-MM-DD`: one ASCII space, no other separator, and no long-form date. One shared function builds it, and every page below uses it.
2. **`/date/[date]`.** The title uses the page's own validated date, from `parseDatePageParam`. Working it out doesn't call Supabase or Wikipedia.
3. **`/reading/[id]`.** The title uses the reading's stored `event_date`. If metadata needs the reading, it's read once per request, shared with the page's own load (for example through React's `cache()`), not queried twice. Dev Team says in the handoff how that's achieved.
4. **Everything else keeps the plain title.** `/`, `/date` and `/chart` redirect, so they keep the default. A 404 (a bad date, an unknown id) keeps "Retroactive Horoscope", with no date and no error text. So do the error page and any other page without a date.
5. **Nothing else changes.** `description`, the visible banner and the date band all stay as they are.
6. **Tests.** Unit tests cover R1's function, with 1969-07-20 → "Retroactive Horoscope 1969-07-20". Tests cover the date page's metadata for a valid date. They cover the reading page's metadata for a found reading and for an unknown id. They also show that the reading's metadata and page share one database read, or show whatever mechanism R3 uses.
7. **Handoff.** Follow CLAUDE.md's committed-handoff standard: `docs/handoffs/sprint-49.md`, with `npm run verify`'s final line including `exit=0`.

### Acceptance Criteria

- **R1:** the unit test passes. QA1 confirms there's one builder and no title string assembled anywhere else.
- **R2:** QA1 confirms the date page's metadata imports nothing from `lib/supabase` or `lib/events`.
- **R3:** QA1 confirms the reading page doesn't run a second database round trip for its metadata.
- **R4 and R5:** tests, or QA1 reading the code, show the default title is unchanged for 404s and for routes without a date. `description` is unchanged.
- **R7:** QA1 reads `docs/handoffs/sprint-49.md` at the audited commit and finds `VERIFY PASS … exit=0`.

**LiveQA (the deployed app):**
1. `/date/1969-07-20`: the tab title is "Retroactive Horoscope 1969-07-20". Check it in the browser and with `curl -s … | grep -o '<title>[^<]*</title>'`.
2. Go to another date with the date picker, and with "Previous day" (a client-side navigation). The title follows each time, without a full reload.
3. `/reading/<an existing id>` shows its event date in the title.
4. `/date/2024-02-30` and an unknown reading id both show the plain "Retroactive Horoscope".
5. `/`, after its redirect, shows today's date (UTC) in the title.
6. If Google Analytics Realtime can be watched, the page title it reports includes the date. Record whether it was checked.

### Out of Scope

- **Open Graph and Twitter card titles, or other social preview metadata.**
- **Renaming the site, or using the banner's name "Ask Reloy" in the title.** Sprint 43 kept metadata as "Retroactive Horoscope".
- **Long-form dates in the title** ("20 July 1969"). The user asked for YYYY-MM-DD.

### Dependencies

- **Blocks:** nothing.
- **Blocked by:** Sprint 47 has to close first. It's in `dev_build` and edits `app/date/[date]/page.tsx`, which this sprint also edits. Apart from that file, this sprint is independent of Sprint 48, so it can run before or after 48, but not at the same time.
- **External:** none.

### Human Prerequisites

None.

### Team Assignments

- **Dev Team 1:** all of it, after Sprint 47 closes.
- **Dev Team 2:** not assigned. It's a small change in files other sprints are editing.

### Risks & Mitigations

- **A second database read on `/reading/[id]`.** `generateMetadata` and the page both need the reading. — R3 requires one shared read.
- **Metadata on a 404 leaks a date or an error.** — R4 keeps the default title, and LiveQA's step 4 checks it.
- **The title doesn't update on client-side navigation.** — Next updates `<title>` from metadata on navigation. LiveQA's step 2 confirms it.
