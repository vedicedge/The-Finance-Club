-- PIN lookup at the desk: a team that forgets its PIN can be told it by an admin instead of
-- getting a new one. The PIN is kept next to its hash in agency_auth, which has Row Level
-- Security on, no policies and no browser grants: only server code (service role) reads it,
-- and the site shows it to admins only. Agencies registered before this update have no copy;
-- resetting their PIN stores one.

alter table public.agency_auth add column if not exists pin_copy text;

comment on column public.agency_auth.pin_copy is
  'SECRET: the PIN itself, shown only to admins on /admin/agencies so the desk can tell a team its PIN.';

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261116002900'::text $$;

revoke all on function public.schema_version() from public, anon, authenticated;
grant execute on function public.schema_version() to service_role;
