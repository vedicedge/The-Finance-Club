-- Doomsday — 8 November: teams of 1 to 3 founders, when an admin allows it.
--
-- Settings → Registration → "Allow teams of 1 or 2" (registration.small_teams). Off: an agency
-- registers with exactly 3 founders, as before. On (e.g. for on-the-spot registrations on the
-- day): 1, 2 or 3 founders. The database itself now accepts 1 to 3 founders for a real agency,
-- so a team of 1 or 2 stays valid after the setting is turned off again. Test agencies (dry
-- run) still have exactly 1. Every agency still has exactly 1 captain.
--
-- Safe to run more than once.

create or replace function public.check_agency_founders()
returns trigger
language plpgsql
as $$
declare
  v_agency text;
  v_test   boolean;
  v_count  integer;
  v_capt   integer;
begin
  if tg_table_name = 'agencies' then
    v_agency := new.id;
  elsif tg_op = 'DELETE' then
    v_agency := old.agency_id;
  else
    v_agency := new.agency_id;
  end if;

  select is_test into v_test from public.agencies where id = v_agency;
  -- The agency itself may have been deleted in the same transaction (cascade); nothing to check.
  if not found then
    return null;
  end if;

  select count(*), count(*) filter (where is_captain)
    into v_count, v_capt
    from public.founders
   where agency_id = v_agency;

  if v_test and v_count <> 1 then
    raise exception 'Agency % must have exactly 1 founder (has %)', v_agency, v_count
      using errcode = 'check_violation';
  end if;
  if not v_test and (v_count < 1 or v_count > 3) then
    raise exception 'Agency % must have 1 to 3 founders (has %)', v_agency, v_count
      using errcode = 'check_violation';
  end if;
  if v_capt <> 1 then
    raise exception 'Agency % must have exactly 1 captain (has %)', v_agency, v_capt
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create or replace function public.register_agency(p_name text, p_founders jsonb, p_pin_hash text)
returns text
language plpgsql
as $$
declare
  v_settings jsonb;
  v_max      integer;
  v_count    integer;
  v_next     integer;
  v_id       text;
  v_min      integer;
begin
  select settings into v_settings from public.event_state for update;

  if not public.registration_is_open() then
    raise exception 'registration_closed' using errcode = 'P0001', hint = 'Registration is closed.';
  end if;

  v_max := coalesce((v_settings #>> '{registration,max_agencies}')::integer, 60);
  select count(*) into v_count from public.agencies where not is_test;
  if v_count >= v_max then
    raise exception 'registration_full' using errcode = 'P0001', hint = 'All agency slots are taken.';
  end if;

  v_min := case when coalesce((v_settings #>> '{registration,small_teams}')::boolean, false) then 1 else 3 end;
  if jsonb_typeof(p_founders) is distinct from 'array' or jsonb_array_length(p_founders) not between v_min and 3 then
    raise exception 'founders_count' using errcode = 'P0001',
      hint = case when v_min = 1 then 'An agency has 1 to 3 founders.' else 'An agency has exactly 3 founders.' end;
  end if;

  select coalesce(max(substring(id from 2)::integer), 0) + 1 into v_next from public.agencies;
  v_id := 'A' || lpad(v_next::text, 2, '0');

  insert into public.agencies (id, name) values (v_id, regexp_replace(btrim(p_name), '\s+', ' ', 'g'));

  insert into public.founders (agency_id, name, section, phone, email, is_captain)
  select v_id,
         regexp_replace(btrim(f ->> 'name'), '\s+', ' ', 'g'),
         btrim(f ->> 'section'),
         f ->> 'phone',
         lower(btrim(f ->> 'email')),
         coalesce((f ->> 'is_captain')::boolean, false)
    from jsonb_array_elements(p_founders) as f;

  insert into public.agency_auth (agency_id, pin_hash) values (v_id, p_pin_hash);

  set constraints public.agencies_have_three_founders, public.founders_exactly_three immediate;
  set constraints public.agencies_have_three_founders, public.founders_exactly_three deferred;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------- version

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261108002000'::text $$;

revoke all on function public.schema_version() from public, anon, authenticated;
grant execute on function public.schema_version() to service_role;
