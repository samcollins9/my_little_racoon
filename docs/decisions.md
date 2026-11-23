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
