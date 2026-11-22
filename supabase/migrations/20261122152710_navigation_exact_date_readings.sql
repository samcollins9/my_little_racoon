-- Sprint 30: the date navigation links only to dates whose *displayed*
-- reading was written over events from that exact year
-- (events.matchedYear = true), so every quick link lands on a page that
-- says "this exact date".
--
-- R1, the rule that decides everything here: a date can hold several
-- readings, and its page shows exactly one, the row get_reading_by_date
-- returns. The filter tests THAT row, never "any row on the date".
-- Otherwise a date with an older matching reading and a newer
-- non-matching one would be linked, and the visitor would land on "on
-- this day, other years".
--
-- How drift is prevented (R1): the displayed-reading rule is written once,
-- in displayed_readings() below, and get_reading_by_date is rewritten on
-- top of it. The page's lookup and both navigation functions therefore
-- share one definition of the ordering. There is no second copy to keep
-- in step.

-- R1, helper 1: one row per event_date, the row that date's page shows:
-- horoscope is not null, then horoscope_generated_at desc nulls last,
-- created_at desc, id desc, first row. This is get_reading_by_date's
-- ordering from 20261115211107, moved here unchanged; see that migration
-- for why each tiebreak exists. DISTINCT ON keeps the first row of each
-- event_date under exactly that order.
--
-- Returns whole rows, because get_reading_by_date returns whole rows. That
-- is safe only because nobody but the functions below can call it (the
-- revokes at the end). Not security definer: it runs with its caller's
-- rights, and its only callers are security definer functions owned by
-- the same owner.
create function public.displayed_readings()
returns setof public.readings
language sql
stable
set search_path = public
as $$
  select distinct on (r.event_date) r.*
  from public.readings r
  where r.horoscope is not null
  order by r.event_date, r.horoscope_generated_at desc nulls last, r.created_at desc, r.id desc;
$$;

-- R1, helper 2: the dates that qualify for navigation, with the generation
-- time of their displayed reading (R2's ordering key). The predicate, also
-- written once: events -> 'matchedYear' must be the JSON boolean true.
--   events null          -> null -> excluded
--   key missing          -> null -> excluded
--   JSON null or false   -> not equal to 'true'::jsonb -> excluded
--   the string "true"    -> '"true"'::jsonb, not 'true'::jsonb -> excluded
create function public.navigable_reading_dates()
returns table (event_date date, horoscope_generated_at timestamptz)
language sql
stable
set search_path = public
as $$
  select d.event_date, d.horoscope_generated_at
  from public.displayed_readings() d
  where d.events -> 'matchedYear' = 'true'::jsonb;
$$;

-- Sprint 28's lookup, now built on the shared helper. `create or replace`
-- with the same signature and return type keeps its existing grants (anon,
-- authenticated), security definer and pinned search_path. Its behaviour
-- is unchanged: the same row for every date, and Sprint 28's
-- reading-by-date suite still asserts it. `limit 1` stays for clarity,
-- though DISTINCT ON already yields at most one row per date.
create or replace function public.get_reading_by_date(reading_date date)
returns setof public.readings
language sql
stable
security definer
set search_path = public
as $$
  select d.*
  from public.displayed_readings() d
  where d.event_date = reading_date
  limit 1;
$$;

-- R2: Sprint 29's two functions, replaced in place (`create or replace`,
-- never drop + create, so their grants from 20261122142918 carry over
-- untouched: anon and authenticated only, revoked from PUBLIC and
-- service_role). Names, signatures, return types (dates only), security
-- definer and search_path are all unchanged. Only the source of dates
-- changes: qualifying dates, judged by their displayed reading.

-- Nearest qualifying date strictly before and strictly after. A date that
-- doesn't qualify is simply not in the set, so it's skipped over.
create or replace function public.get_adjacent_reading_dates(reading_date date)
returns table (previous_date date, next_date date)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select max(n.event_date)
       from public.navigable_reading_dates() n
      where n.event_date < reading_date) as previous_date,
    (select min(n.event_date)
       from public.navigable_reading_dates() n
      where n.event_date > reading_date) as next_date;
$$;

-- Up to 20 qualifying dates, newest displayed-reading generation first.
-- The cap is applied after the filter (the filter is inside
-- navigable_reading_dates), so a full list is 20 qualifying dates. Each
-- date appears once, because helper 1 returns one row per date. Ordering
-- matches Sprint 29's, nulls last, ties broken by date.
create or replace function public.get_recent_reading_dates()
returns table (event_date date)
language sql
stable
security definer
set search_path = public
as $$
  select n.event_date
  from public.navigable_reading_dates() n
  order by n.horoscope_generated_at desc nulls last, n.event_date desc
  limit 20;
$$;

-- R2: neither helper is callable by anyone but its owner. PUBLIC gets
-- EXECUTE on every new function by default, and 20260816125144's default
-- privileges grant routines to anon, authenticated and service_role. All
-- four are revoked. The security definer functions above still call the
-- helpers, because they run as the owner.
revoke execute on function public.displayed_readings() from public, anon, authenticated, service_role;
revoke execute on function public.navigable_reading_dates() from public, anon, authenticated, service_role;

insert into public.schema_migrations (version) values ('20261122152710_navigation_exact_date_readings');
