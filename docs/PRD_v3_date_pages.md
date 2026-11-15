# Retroactive Horoscope: PRD v3 (Date Pages)

**Status:** Approved for Sprint 28. Sprint 29 is outlined here and will be detailed when it's planned.
**Author:** Sam Collins (requirements), drafted with Master Controller
**Date:** 15 November 2026
**Builds on:** `PRD_v2_poc.md`

---

## 1. What changes

At the moment the app is a three-step funnel: pick a date on `/chart`, save it, then
open `/reading/[id]`, a page reachable only through its unguessable link. v3 makes the
**date** the address. The front door is today's sky.

| Today | After v3 |
|---|---|
| `/` redirects to `/chart`, an empty date form | `/` lands on **today's date page (UTC)** |
| The chart and events appear only after "Save" | The chart and events appear **on load**, for any date |
| The horoscope belongs to one link-only reading | The page shows the **newest saved horoscope for that date**, if any |
| Moving to another date means going back to `/chart` | A **date picker** on the page goes straight to any date |
| No way to find other readings | Sprint 29: **browse the dates** that already have horoscopes |

A horoscope is still never written automatically. The visitor asks for it.

## 2. Decisions (made 15 Nov 2026)

1. **Readings become findable by date.** This reverses Sprint 4's link-only access.
   It's acceptable because a reading holds no personal data. The table itself still
   has no select policy. Access is through narrow functions that return at most one
   row per call (Sprint 28), or a deliberately designed listing (Sprint 29).
2. **When a date has several readings, show the newest one that has a horoscope.**
   Existing rows and links are left untouched. Rows are neither merged nor deleted.
3. **Viewing writes nothing.** The chart is computed and the events fetched for each
   view. A row is written only when someone casts a horoscope.
4. **"Today" means the UTC date**, consistent with charts being calculated at
   12:00 UT.

## 3. Sprint 28: Date page (today by default, cast on demand)

See `docs/sprints/` sprint 28 for the requirements and acceptance criteria. In short:

- `/date/YYYY-MM-DD` uses the existing reading layout.
- `/` sends the visitor to today (UTC), worked out per request.
- If a saved horoscope exists for the date, the page shows it. If not, it shows
  **Write the horoscope**, and that button only appears while generation is enabled.
- A date picker, which works without client-side JavaScript.
- If Supabase is unavailable, the page still shows the chart and events.
- `/reading/[id]` and `/chart` keep working unchanged.

## 4. Sprint 29 (outline): Browse dates that have readings

Show the dates that already have a horoscope, and let the visitor go to any of them.
Questions to settle when it's planned:

- **What gets listed:** dates only, or dates with a short preview of the horoscope?
- **Where it appears:** next to the picker (for example, marked days, or "previous
  and next date with a reading"), or as a separate index page.
- **How much:** paginated or capped. The access function returns a bounded list of
  dates, never whole rows.
- **Whether the three-step `/chart` flow and the `FlowIndicator` are retired** once
  date pages have proven themselves.

## 5. Out of scope for v3

Visitor-local "today", one-row-per-date enforcement, regenerating an existing
horoscope, accounts or ownership, and keeping Supabase from pausing. That last one is
still open as a separate operational decision.
