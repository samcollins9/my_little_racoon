# Decisions log

Real project decisions that don't belong to a single sprint's requirements.
Newest first.

## 2026-11-15: Date pages (PRD v3, Sprint 28)

Decided by the user, in a Master Controller session:

1. **Readings become findable by date.** This reverses Sprint 4's link-only access
   model on purpose. The reason given: a reading holds no personal data (a date,
   computed positions, public Wikipedia events, generated text). The `readings`
   table still has **no select policy**. Date access goes only through narrow
   `security definer` functions.
2. **When a date has more than one reading, show the newest one with a horoscope.**
   Duplicates are neither merged nor deleted, and no unique constraint is added on
   `event_date`.
3. **Viewing a date writes nothing.** A row is written only when someone casts a
   horoscope.
4. **"Today" means the UTC date.**

### Follow-on, same day: anon loses all write access to `readings` (Sprint 28, R12)

Decision (1) turns any anon-writable reading into a front-page defacement path.
Dev Team 1 found this during the build. Master Controller's amendment closes it at
the database:
- anon and authenticated lose INSERT on `readings`;
- anon, authenticated and PUBLIC lose EXECUTE on `set_reading_horoscope`;
- every write goes through the server-only service-role client, using values the
  server computed.

This reverses Sprint 4's "anon can insert readings" policy and Sprint 17's anon
grant on `set_reading_horoscope`. Reads are unchanged: anon, through the `security
definer` lookup functions only.

## 23 Nov 2026: horoscopes only for dates with matched events (Sprint 39)

Decided by the user. A horoscope pairs one date's sky with that date's events, and
one written from another year's events isn't astrologically valid. So:

1. **No horoscope can be written for a date whose events are unmatched**
   (`events.matchedYear = false`) **or missing** (a failed Wikipedia lookup). The
   server refuses before any row is inserted, as well as the page hiding the button.
2. **Horoscopes saved earlier from unmatched or missing events aren't shown.** The
   rows stay in the database, unchanged (decision 2 above still holds). "Newest with
   a horoscope wins" now applies among matched rows only.
3. **When the lookup fails, the page says to try again later,** not to pick another
   date, because the date itself may be fine.
4. **On an unmatched date, each other-year event's year links to the same month and
   day in that year,** when the date page supports that date (1700 to 2100).

Known consequence, accepted for now: today's date, the landing page, will usually be
unmatched, so the front door will usually say a horoscope can't be written for it.
Where `/` lands may be revisited separately.

### Correction, 24 Nov 2026: what Sprint 39 actually built (decision 2 above)

Decision 2 says "newest with a horoscope wins" applies among matched rows only. That
would mean showing an older matched horoscope when the newest one for that date is
unmatched. Sprint 39's file said only that such a horoscope "may" still be shown, and
the build hides both. It treats the date as having nothing saved, and offers a fresh
write if the date's events match. That wording was Master Controller's, and the
ambiguity is Master Controller's too.

Why this is left as built for now: no new unmatched row can be written any more, so
the case only affects dates already in the database. It also goes away when someone
writes a fresh horoscope for the date, because that new row is matched and is the
newest. A follow-up sprint, which would need a database change, is worth doing only if
the measurement below finds dates that are actually affected:

    select event_date from readings where horoscope is not null
    group by event_date
    having bool_or((events->>'matchedYear')::boolean is true)
       and bool_or(events is null or (events->>'matchedYear')::boolean is not true);

## 24 Nov 2026: where the front page lands (Sprint 41)

Decided by the user. `/` lands on today's UTC month and day, in the most recent year
(up to this year, within the date page's 1700–2100 range) that has a Wikipedia "On
this day" event on it. That date is always writable. If the feed can't be used, `/`
falls back to today's date as before. This amends decision 4 for `/` only: "today" is
still the UTC date, and `/date/<today>` is unchanged.

## 24 Nov 2026: the front page lands on today's actual date (Sprint 44, reversing Sprint 41)

Decided by the user, after seeing Sprint 41 live: `/` resolved to 2023-11-24,
because 2023 is the newest year in the feed for 24 November. `/` goes back to
today's actual UTC date, restoring decision 4 as originally written. The user
accepts that today will usually show the "can't write an accurate horoscope"
message, with its links to other years. The 24 Nov 2026 entry "where the front
page lands (Sprint 41)" above is superseded.

## 25 Nov 2026: no future dates (Sprint 47)

The user decided that Reloy predicts only the past. Any date after today (UTC) is blocked.
- A future date's URL redirects (307) to today's date page.
- On today's page, "Next day" is shown disabled, with "Reloy predicts only the past."
- Today itself is allowed.
- Previous/Next move one calendar day. "Discover random reading" picks from the 20 most recently written readings.

## 25 Nov 2026: events placement (Sprint 48)

"What happened" moves below "The reading" only when it lists other years' events (unmatched, with at least one event). A matched list, an empty list and a failed lookup all stay above the reading. This applies to desktop and phones, and to both /date and /reading.

## 25 Nov 2026: one page order on desktop and phones (Sprint 52)

The date page's order on both layouts: banner → date band → Previous/Next day → chart, events and reading → "Another date" panel (with "or Discover random reading") → "Other notable dates". The user confirmed that phones follow the same order.

## 25 Nov 2026: page order amended, footer renamed (Sprint 52)

This supersedes the order recorded above. Previous/Next day sit directly under the banner, above the date band, so "The sky over <date>" sits directly above the chart. The full order on both layouts: banner → Previous/Next day → date band → chart, events and reading → "Another date" panel → "Notable dates", renamed from "Other notable dates".

## Potential enhancements (not planned)

Ideas the user has deliberately parked. Nothing here gets a sprint until the user asks for it.

- **Raw-data tab** (parked 25 Nov 2026). A chart-panel tab showing the reading's underlying data. Before it could be planned, three questions need answers: what it shows, its format, and whether it appears on phones.
