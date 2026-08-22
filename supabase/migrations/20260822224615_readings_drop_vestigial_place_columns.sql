-- Sprint 15, R1: drop the vestigial place/time columns.
--
-- event_time predates Sprint 6's removal of place input; place_name,
-- latitude, longitude, timezone were relaxed to nullable in Sprint 10
-- rather than dropped, because R1's expand-then-contract rule (README.md)
-- forbade a destructive change to an existing column that sprint. This is
-- the contract half, now that it's safe: grepping app/ and lib/ shows no
-- reference to any of these five columns -- app/chart/actions.ts's insert
-- writes exactly id, event_date, positions. No deployed version reads or
-- writes them.
alter table public.readings
  drop column event_time,
  drop column place_name,
  drop column latitude,
  drop column longitude,
  drop column timezone;

insert into public.schema_migrations (version) values ('20260822224615_readings_drop_vestigial_place_columns');
