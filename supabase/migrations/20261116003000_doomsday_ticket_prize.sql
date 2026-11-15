-- Doomsday — 16 November: the poster's prize line. Prizes worth ₹13,000; the winning team also
-- gets a Doomsday ticket. Safe to run more than once; other settings are left as they are.

update public.event_state
   set settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{prizes}',
         coalesce(settings -> 'prizes', '{}'::jsonb)
         || '{"winner": "Doomsday ticket + prizes from the ₹13,000 pool", "runner_up": "Prizes from the ₹13,000 pool"}')
 where id;

-- ---------------------------------------------------------------- version

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261116003000'::text $$;

revoke all on function public.schema_version() from public, anon, authenticated;
grant execute on function public.schema_version() to service_role;
