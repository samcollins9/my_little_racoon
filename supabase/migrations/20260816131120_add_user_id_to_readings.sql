-- Sprint 3, R6: readings gains an owner. Safe as NOT NULL with no backfill
-- only because the table is still empty -- see the sprint file's own Risks
-- section. Do not copy this move onto a populated table without a
-- backfill step.
--
-- on delete cascade: a deleted user's readings are user-owned data with no
-- purpose once the owner is gone, not orphaned records worth keeping.
alter table public.readings
  add column user_id uuid not null references auth.users (id) on delete cascade;

-- Sprint 4's RLS policies will filter on user_id; index it now rather than
-- after the policies exist and every query is already slow.
create index readings_user_id_idx on public.readings (user_id);

insert into public.schema_migrations (version) values ('20260816131120_add_user_id_to_readings');
