-- Doomsday — 15 November: the event moves to 23 November 2026, 5:30 pm, and the prize is set.
--
-- Event start: 23 Nov 2026, 17:30 India time (the countdown and every date on the site follow it).
-- Registration: stays open until 18:00 India time on the event day, so walk-in teams can register.
--   (It also closes as soon as the event moves past the registration phase, i.e. to check-in.)
-- Prizes: a ₹13,000 cash prize pool. The exact split can be typed in Settings → Prizes.
--
-- Safe to run more than once. Any other setting is left as it is.

update public.event_state
   set settings = jsonb_set(jsonb_set(jsonb_set(jsonb_set(coalesce(settings, '{}'::jsonb),
         '{event}', coalesce(settings -> 'event', '{}'::jsonb) || '{"starts_at": "2026-11-23T17:30:00+05:30"}'),
         '{registration}', coalesce(settings -> 'registration', '{}'::jsonb) || '{"closes_at": "2026-11-23T18:00:00+05:30"}'),
         '{prizes}', coalesce(settings -> 'prizes', '{}'::jsonb)
                     || '{"winner": "Cash prize from the ₹13,000 pool", "runner_up": "Cash prize from the ₹13,000 pool"}'),
         '{registration,open}', 'true')
 where id;

-- ---------------------------------------------------------------- version

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261115002900'::text $$;

revoke all on function public.schema_version() from public, anon, authenticated;
grant execute on function public.schema_version() to service_role;
