-- Sprint 4: RLS policies for anonymous, link-addressed readings.
--
-- No owner concept exists -- auth was cut from this exercise (Sprint 3,
-- aborted). The row's own id (uuid, gen_random_uuid(), unguessable) IS the
-- access control: reachable by link, by nothing else.
--
-- That constraint is why retrieval-by-id is a function, not a SELECT
-- policy. RLS filters rows; it has no way to see whether the caller's
-- query included a WHERE clause. A policy like `using (true)` -- the
-- obvious-looking way to write "readable by id" -- would return every row
-- on an *unfiltered* select just as readily as a filtered one, since
-- Postgres ANDs the policy onto whatever the client asked for rather than
-- requiring the client to ask a particular way. That's exactly the
-- enumeration this sprint exists to prevent. So: no select policy on the
-- table at all (same deny-by-default posture it's had since Sprint 2),
-- and a security definer function that takes the id as an explicit
-- argument instead.

-- Anonymous insert. No owner to check against; content validity is the
-- column constraints' job (event_date not null, etc.), not RLS's.
create policy "anon can insert readings" on public.readings
  for insert
  to anon
  with check (true);

-- Deliberately no select, update, or delete policy for anon on the table
-- itself. Zero policies for an action means that action is denied outright
-- for that role -- update and delete stay denied by omission, matching R1.

-- security definer: the only way for this to return a row anon otherwise
-- can't see directly. search_path is pinned to block the standard
-- search_path-hijack attack against security definer functions (an
-- attacker-controlled schema earlier in an unpinned path could shadow
-- public.readings).
create function public.get_reading_by_id(reading_id uuid)
returns setof public.readings
language sql
security definer
set search_path = public
as $$
  select * from public.readings where id = reading_id;
$$;

grant execute on function public.get_reading_by_id(uuid) to anon, authenticated;

-- Callable by anon so the test suite proving "every table has RLS" can run
-- entirely on the anon client (R7) rather than needing the service role
-- key. No elevated privilege required for this one: Postgres system
-- catalogs are world-readable by default, so plain (non-definer) is
-- honest about what access it actually needs. search_path is still pinned
-- as a general hygiene practice for any function callable over the Data
-- API.
create function public.tables_without_rls()
returns setof text
language sql
set search_path = pg_catalog, public
as $$
  select c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity;
$$;

grant execute on function public.tables_without_rls() to anon, authenticated;

insert into public.schema_migrations (version) values ('20260816134147_readings_rls_policies');
