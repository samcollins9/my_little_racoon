-- Sprint 28, R4: look up the saved horoscope for a date (decisions a and b,
-- docs/decisions.md, 2026-11-15).
--
-- Same shape as get_reading_by_id (Sprint 4), for the same reason: there is
-- still no select policy on readings and none is added here. A select policy
-- can't say "one row for one date" any more than it could say "by id only"
-- -- RLS would AND it onto an unfiltered select just as readily -- so the
-- narrow capability is a security definer function taking the date as an
-- explicit argument. search_path is pinned against the search_path-hijack
-- attack on security definer functions, exactly as get_reading_by_id's is.
--
-- At most one row per call, by construction (limit 1): the reading for that
-- event_date with a horoscope and the latest horoscope_generated_at
-- (decision b: the newest one with a horoscope). Readings without a
-- horoscope are never returned -- including a row a failed generation left
-- behind (R5). Sprint 4's enumeration test (anon can't list the table)
-- keeps meaning what it says: nothing here lists anything.
--
-- `nulls last`: Postgres sorts nulls first under `desc`. horoscope and
-- horoscope_generated_at are only ever set together, by
-- set_reading_horoscope, but a row with a horoscope and no timestamp must
-- not outrank every row that has one. created_at, then id, break any tie so
-- the same row comes back every time.
create function public.get_reading_by_date(reading_date date)
returns setof public.readings
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.readings
  where event_date = reading_date
    and horoscope is not null
  order by horoscope_generated_at desc nulls last, created_at desc, id desc
  limit 1;
$$;

grant execute on function public.get_reading_by_date(date) to anon, authenticated;

insert into public.schema_migrations (version) values ('20261115211107_get_reading_by_date');
