-- Lets the site check that every database update has been run (organisers paste these files
-- into the Supabase SQL editor by hand, so one can be missed). The command centre and every
-- organiser page compare this with the version the deployed code expects.
-- Every new migration must replace this function with its own file-name prefix; a unit test
-- (tests/unit/migrations.test.ts) checks that.

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261107001700'::text $$;

revoke all on function public.schema_version() from public, anon, authenticated;
grant execute on function public.schema_version() to service_role;
