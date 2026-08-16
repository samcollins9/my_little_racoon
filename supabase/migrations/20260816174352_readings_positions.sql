-- Sprint 10: readings gains storage for what Sprint 6 computes.
--
-- place_name/latitude/longitude/timezone predate Sprint 6's re-scope,
-- which dropped place and geocoding entirely (geocentric positions
-- depend only on the moment, not the observer). Nothing in this app
-- populates them anymore. Not dropped -- R1 forbids a destructive change
-- to an existing column this sprint, and production's readings table has
-- never had a row written to it, so there's nothing to migrate away from
-- either way -- but their NOT NULL constraint is relaxed, since a
-- constraint nothing can satisfy would make every insert fail outright.
alter table public.readings alter column place_name drop not null;
alter table public.readings alter column latitude drop not null;
alter table public.readings alter column longitude drop not null;
alter table public.readings alter column timezone drop not null;

-- Sprint 6's ten-body position array, stored exactly as computed. Read
-- back exactly as stored (R6), never recomputed on load, so a saved
-- reading doesn't silently change if the ephemeris adapter ever does.
-- NOT NULL with no default, deliberately: every insert this app makes
-- always supplies positions, and a bug that forgot to should fail loudly
-- (a rejected insert) rather than silently store an empty reading.
alter table public.readings add column positions jsonb not null;

insert into public.schema_migrations (version) values ('20260816174352_readings_positions');
