-- Sprint 15, R2: the expand half for the two new sources PRD v2 adds.
--
-- All four nullable, matching how `positions` was first added (Sprint 10)
-- -- a NOT NULL here would break inserts from the currently deployed
-- version, which doesn't write any of them. Nothing backfills these;
-- existing readings keep null. horoscope_generated_at/horoscope_model are
-- metadata for whichever row's horoscope column is populated, not
-- meaningful on their own.
alter table public.readings
  add column events                 jsonb,
  add column horoscope              text,
  add column horoscope_generated_at timestamptz,
  add column horoscope_model        text;

insert into public.schema_migrations (version) values ('20260822224620_readings_add_events_and_horoscope_columns');
