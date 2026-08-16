-- Sprint 10 follow-up: the "contract" half of expand-then-contract for
-- readings.positions, added nullable by the previous migration.
--
-- Rows predating this feature (Sprint 5's shared preview/production
-- database means these are real, not hypothetical) have no positions
-- ever computed for them -- an empty array records that honestly rather
-- than fabricating values nothing ever produced.
update public.readings set positions = '[]'::jsonb where positions is null;

alter table public.readings alter column positions set not null;

insert into public.schema_migrations (version) values ('20260816181929_readings_positions_not_null');
