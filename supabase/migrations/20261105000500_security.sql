-- Doomsday — who can read and write what.
--
-- Model: browsers never query the database. Phones, projectors and organiser consoles talk
-- to the Next.js server, which checks the agency session or organiser role and then uses the
-- service role. So:
--   * Row Level Security is on for every table, with no policies: anon and authenticated
--     (signed-in organisers' browser tokens) can read or write nothing.
--   * All grants to anon/authenticated are revoked from tables, views, sequences and
--     functions, now and for objects created later.
--   * Secret tables (question_keys, breaking_news, insider_tips, envelope_contents, xray_log,
--     agency_auth, agency_sessions) are therefore reachable only by server code holding the
--     service-role key, and that code only reads them inside server actions/route handlers.
-- The browser's anon key is used for one thing only: Realtime broadcast "something changed"
-- pings, which carry no data.

-- Organisers are Supabase Auth users.
alter table public.organisers
  add constraint organisers_user_fk foreign key (user_id) references auth.users (id) on delete cascade;

-- Views run with the caller's rights (no definer-rights views).
do $$
declare
  v record;
begin
  for v in select viewname from pg_views where schemaname = 'public' loop
    execute format('alter view public.%I set (security_invoker = true)', v.viewname);
  end loop;
end;
$$;

-- RLS on, no policies, on every table.
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

-- No access for browser roles.
revoke all on all tables    in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- Server code (service role) can use everything.
grant usage on schema public to service_role;
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Objects created by later migrations get the same treatment.
alter default privileges in schema public revoke all on tables    from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
-- EXECUTE for PUBLIC is a global default, so it has to be revoked globally (not per schema).
alter default privileges revoke execute on functions from public;
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
