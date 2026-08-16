-- Sprint 10: readings gains storage for what Sprint 6 computes.
--
-- place_name/latitude/longitude/timezone predate Sprint 6's re-scope,
-- which dropped place and geocoding entirely (geocentric positions
-- depend only on the moment, not the observer). Nothing in this app
-- populates them anymore. Not dropped -- R1 forbids a destructive change
-- to an existing column this sprint -- but their NOT NULL constraint is
-- relaxed, since a constraint nothing can satisfy would make every insert
-- fail outright.
alter table public.readings alter column place_name drop not null;
alter table public.readings alter column latitude drop not null;
alter table public.readings alter column longitude drop not null;
alter table public.readings alter column timezone drop not null;

-- Sprint 6's ten-body position array, stored exactly as computed. Read
-- back exactly as stored (R6), never recomputed on load, so a saved
-- reading doesn't silently change if the ephemeris adapter ever does.
--
-- Nullable here, deliberately, not NOT NULL: Sprint 5 made previews share
-- production, so this table can already hold rows this migration didn't
-- create (RLS-suite runs, prior manual testing) with no positions value.
-- A first attempt at this migration went straight to NOT NULL and failed
-- against exactly that live data -- expand-then-contract (Sprint 5's own
-- standing rule) exists precisely so a column addition can't fail this
-- way. The follow-up migration backfills and tightens once every row is
-- populated.
alter table public.readings add column positions jsonb;

insert into public.schema_migrations (version) values ('20260816174352_readings_positions');
