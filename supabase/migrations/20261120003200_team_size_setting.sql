-- Doomsday — 20 November: Settings → Registration → smallest team size: exactly 3, 2–3 or 1–3
-- (registration.min_founders). The old on/off "small_teams" setting still works when
-- min_founders is not set. Safe to run more than once.

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

  -- Smallest team allowed: registration.min_founders (1, 2 or 3); older settings say small_teams.
  v_min := coalesce(
    case when (v_settings #>> '{registration,min_founders}') in ('1', '2', '3') then (v_settings #>> '{registration,min_founders}')::integer end,
    case when coalesce((v_settings #>> '{registration,small_teams}')::boolean, false) then 1 else 3 end);
  if jsonb_typeof(p_founders) is distinct from 'array' or jsonb_array_length(p_founders) not between v_min and 3 then
    raise exception 'founders_count' using errcode = 'P0001',
      hint = case when v_min = 3 then 'An agency has exactly 3 founders.' else format('An agency has %s to 3 founders.', v_min) end;
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

revoke all on function public.register_agency(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.register_agency(text, jsonb, text) to service_role;

-- ---------------------------------------------------------------- version

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261120003200'::text $$;

revoke all on function public.schema_version() from public, anon, authenticated;
grant execute on function public.schema_version() to service_role;
