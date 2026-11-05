-- Minimal stand-in for the parts of a Supabase database our migrations rely on, so the
-- migrations can be tested on a plain local Postgres (no Docker needed).
-- NOT used against a real Supabase project.

create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create schema auth;
create table auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- Supabase grants browser roles everything in public by default and relies on RLS.
-- Reproduce that so the security migration's revokes are actually tested.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
