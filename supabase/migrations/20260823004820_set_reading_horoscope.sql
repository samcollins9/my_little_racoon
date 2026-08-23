-- Sprint 17, R3/R4: the entire write surface for an existing reading.
--
-- No update policy exists for readings (Sprint 4) and none is added here
-- -- that deny-by-default posture must survive this migration exactly as
-- it did before it. Instead, a security definer function scoped to
-- exactly the three horoscope columns, the same shape as
-- get_reading_by_id's read-side function and for the same reason: this is
-- the narrow, explicit capability anon actually needs, not a general
-- write. search_path is pinned for the same search_path-hijack reason
-- get_reading_by_id's is.
--
-- Parameter names intentionally collide with column names (reading_id,
-- horoscope), so every reference inside the body is qualified by the
-- function's own name to stay unambiguous rather than silently picking
-- one or the other.
create function public.set_reading_horoscope(reading_id uuid, horoscope text, model text)
returns boolean
language sql
security definer
set search_path = public
as $$
  update public.readings
  set horoscope = set_reading_horoscope.horoscope,
      horoscope_generated_at = now(),
      horoscope_model = set_reading_horoscope.model
  where id = set_reading_horoscope.reading_id
  returning true;
$$;

-- horoscope_generated_at is set here, from now(), not accepted as a
-- parameter -- a server-authoritative timestamp is no less trustworthy
-- than created_at's own default, and it can't be backdated by a caller.
--
-- Callable by anon: there's no owner concept in this app (Sprint 4), so
-- "anyone holding the link" is the same authorization model Sprint 4
-- already established for reading a row, extended here to this one
-- narrow write.
grant execute on function public.set_reading_horoscope(uuid, text, text) to anon, authenticated;

insert into public.schema_migrations (version) values ('20260823004820_set_reading_horoscope');
