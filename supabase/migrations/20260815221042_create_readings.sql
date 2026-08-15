-- Sprint 2: readings table, and this repo's own migration ledger.
--
-- schema_migrations is ours, not Supabase CLI's internal bookkeeping table
-- (that lives in a separate, unexposed schema). We track our own so
-- /api/health/db can report "the latest applied migration version" over
-- the same Data API it already uses, without exposing an internal schema.
-- Every migration after this one should end with an insert into this table
-- recording its own filename-derived version. See README.md.
create extension if not exists pgcrypto;

create table public.schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

alter table public.schema_migrations enable row level security;

-- readings: mundane-chart inputs for a single reconstructed event.
-- event_time is nullable -- an unknown birth/event time is a real case,
-- not an error, and later sprints must not default it to noon.
--
-- RLS is enabled here with ZERO policies, deliberately. No policy in this
-- migration is not an omission, it's the point: the table exists and is
-- reachable, but nothing can select, insert, update, or delete a row
-- through the Data API until Sprint 4 writes and tests the real policies.
-- A table that's public because nobody got to RLS yet is the exact outcome
-- this ordering exists to prevent.
create table public.readings (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  event_time time,
  place_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  timezone text not null,
  created_at timestamptz not null default now()
);

alter table public.readings enable row level security;

insert into public.schema_migrations (version) values ('20260815221042_create_readings');
