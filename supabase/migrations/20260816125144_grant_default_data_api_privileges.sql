-- Makes explicit what Supabase's platform already applies implicitly on
-- every new project: default Data API privileges for anon/authenticated/
-- service_role, plus the resulting table-level grants on the tables the
-- previous migration created. These grants already existed on production
-- (applied by the platform, not by any migration file), which is exactly
-- why `supabase db diff --linked` reported them as drift: nothing in
-- supabase/migrations/ described them. This migration is that
-- description, not a change in what's actually allowed.
--
-- None of this widens access. RLS is enabled with zero policies on both
-- readings and schema_migrations (previous migration), so anon and
-- authenticated still cannot select, insert, update, or delete a single
-- row through the Data API -- a GRANT without a permissive RLS policy is
-- necessary but not sufficient, and Sprint 4 is where the policies (and
-- the tests proving them) land. service_role bypasses RLS by design,
-- which is exactly why the health route uses it.
--
-- Statements below are copied verbatim from `supabase db diff --linked`
-- against the production project, not hand-reconstructed.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.readings TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.readings TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.readings TO service_role;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.schema_migrations TO anon;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.schema_migrations TO authenticated;

GRANT DELETE, INSERT, SELECT, UPDATE ON public.schema_migrations TO service_role;

insert into public.schema_migrations (version) values ('20260816125144_grant_default_data_api_privileges');
