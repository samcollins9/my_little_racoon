-- Sprint 28, R12: every write to readings is server-authored; anon has no
-- write path at all.
--
-- Why now: decision (a) (docs/decisions.md, 2026-11-15) puts the newest
-- saved horoscope for a date -- today's included -- on a public page via
-- get_reading_by_date. Anything anon could write would be a defacement path
-- onto the front page. Three routes existed:
--   1. a direct anon insert carrying its own horoscope text and a future
--      horoscope_generated_at;
--   2. an anon insert with a client-chosen id, then a direct anon call to
--      set_reading_horoscope(id, '<any text>', ...) -- stamped now(), so it
--      wins its date;
--   3. an anon insert with fabricated events/positions, then the genuine
--      "Write the horoscope" action on /reading/[id] -- a real horoscope
--      over attacker content (and a prompt-injection channel via events).
-- All three need an anon INSERT or an anon EXECUTE on set_reading_horoscope.
-- This removes both, at the database, not only in the app. The app's three
-- writers (/chart's saveReading, the date page's cast action, and
-- generateAndPersistHoroscope's persist step) now use the service role
-- client server-side, which bypasses RLS and holds its own grants.
--
-- This deliberately reverses Sprint 4's "anon can insert readings" policy.
-- Reads are unchanged: get_reading_by_id and get_reading_by_date stay anon
-- callable, and there is still no select policy on the table.

-- Route 1 and the first step of routes 2 and 3. The policy is dropped as
-- well as the privilege, so nothing is left that reads as "anon may insert";
-- either one alone would deny the insert.
drop policy "anon can insert readings" on public.readings;
revoke insert on table public.readings from anon, authenticated;

-- Route 2. PUBLIC too: Postgres grants EXECUTE on every new function to
-- PUBLIC by default, and anon/authenticated would inherit it from there even
-- with their own grants revoked. service_role keeps its own grant (from the
-- default privileges in 20260816125144), which is what the server uses.
revoke execute on function public.set_reading_horoscope(uuid, text, text)
  from anon, authenticated, public;

-- On 20260816125144 (the default-privileges migration), checked for R12a:
-- nothing there re-grants either privilege. Its `GRANT ... ON
-- public.readings TO anon/authenticated` ran once, before this migration,
-- and is superseded by the revoke above on every database, fresh or
-- existing, because migrations apply in order. Its `ALTER DEFAULT
-- PRIVILEGES ... ON TABLES / ON ROUTINES` lines only affect objects
-- *created* after them; they never touch an existing table or function.
-- The one way they could come back: dropping and re-creating readings or
-- set_reading_horoscope in a later migration would hand anon fresh
-- defaults. `create or replace function` keeps existing privileges and is
-- safe. The RLS suite's denial tests (supabase/tests/rls.test.ts) would
-- catch a regression either way.
--
-- Update and delete are untouched here: anon still holds the table-level
-- privileges from 20260816125144, but there has never been an update or
-- delete policy, so RLS denies both (Sprint 4's tests, unchanged).

insert into public.schema_migrations (version) values ('20261115212732_readings_server_authored_writes');
