-- Sprint 29, R1: date-only lookups so a date page can link to other dates
-- that have a saved horoscope (decision (1), docs/decisions.md: readings
-- are findable by date).
--
-- Same shape as get_reading_by_date (Sprint 28) and get_reading_by_id
-- (Sprint 4): security definer, search_path pinned against the
-- search_path-hijack attack, and still no select policy on readings. These
-- two functions differ from those in one deliberate way: they return
-- DATES ONLY. No column of readings other than event_date ever leaves
-- them -- not id, not horoscope, not events -- so they can't become a
-- listing of horoscope text or a route to guess ids. Each return type is
-- declared column by column (`returns table (... date)`), never
-- `setof public.readings`, so a later edit can't widen it by accident
-- without changing the signature.
--
-- Both consider only rows with `horoscope is not null`: a date whose only
-- rows are failed or unfinished casts (Sprint 28, R5) has no reading to
-- link to, and get_reading_by_date would show nothing there.

-- R1a: the nearest dates strictly before and strictly after the given one.
-- Exactly one row, either column null when that side has no such date.
-- Strict < and > so the given date itself is never returned, whether or
-- not it has a horoscope. max/min collapse a date with several readings
-- to that one date.
create function public.get_adjacent_reading_dates(reading_date date)
returns table (previous_date date, next_date date)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select max(r.event_date)
       from public.readings r
      where r.horoscope is not null
        and r.event_date < reading_date) as previous_date,
    (select min(r.event_date)
       from public.readings r
      where r.horoscope is not null
        and r.event_date > reading_date) as next_date;
$$;

-- R1b: the most recently written dates. At most 20, fixed here with no
-- parameter at all, so no caller can raise it. One row per date (group
-- by), ordered by that date's newest horoscope_generated_at. `nulls last`
-- for the same reason as get_reading_by_date: under `desc` Postgres sorts
-- nulls first, and a horoscope with no timestamp mustn't outrank every
-- dated one. event_date desc breaks ties so the order is stable.
create function public.get_recent_reading_dates()
returns table (event_date date)
language sql
stable
security definer
set search_path = public
as $$
  select r.event_date
  from public.readings r
  where r.horoscope is not null
  group by r.event_date
  order by max(r.horoscope_generated_at) desc nulls last, r.event_date desc
  limit 20;
$$;

-- Execute for anon and authenticated only. Postgres grants EXECUTE on
-- every new function to PUBLIC, and 20260816125144's default privileges
-- add anon, authenticated and service_role. PUBLIC and service_role are
-- revoked so the only grantees are the two the date page reads as. The
-- server never calls these with the service role; it reads as anon, the
-- same as the RLS suite does.
revoke execute on function public.get_adjacent_reading_dates(date) from public, service_role;
revoke execute on function public.get_recent_reading_dates() from public, service_role;
grant execute on function public.get_adjacent_reading_dates(date) to anon, authenticated;
grant execute on function public.get_recent_reading_dates() to anon, authenticated;

-- No index: readings is small, and both queries are a scan with a filter.
-- Sprint 29's Risks allow a partial index on (event_date) where horoscope
-- is not null if that ever changes.

insert into public.schema_migrations (version) values ('20261122142918_reading_date_navigation');
