-- Doomsday — Milestone 2: registration and agency login (server-only database functions).
--
-- Every function here is called by server code with the service role; browser roles cannot
-- execute them (security migration + the explicit revokes at the bottom).

-- ---------------------------------------------------------------- registration

-- Creates an agency with exactly 3 founders and its hashed PIN in one transaction and returns
-- the new agency ID (A01, A02, …). The event_state row lock serialises registrations, so the
-- cap and the next ID are race-free and IDs have no gaps.
-- p_founders: [{name, section, phone, email, is_captain}, ×3]
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
begin
  select settings into v_settings from public.event_state for update;

  if not public.registration_is_open() then
    raise exception 'registration_closed' using errcode = 'P0001', hint = 'Registration is closed.';
  end if;

  v_max := coalesce((v_settings #>> '{registration,max_agencies}')::integer, 60);
  select count(*) into v_count from public.agencies;
  if v_count >= v_max then
    raise exception 'registration_full' using errcode = 'P0001', hint = 'All agency slots are taken.';
  end if;

  if jsonb_typeof(p_founders) is distinct from 'array' or jsonb_array_length(p_founders) <> 3 then
    raise exception 'founders_count' using errcode = 'P0001', hint = 'An agency has exactly 3 founders.';
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

  -- Run the exactly-3-founders / 1-captain checks now, so a bad submission fails inside this
  -- call, then defer them again for anything else in the same transaction.
  set constraints public.agencies_have_three_founders, public.founders_exactly_three immediate;
  set constraints public.agencies_have_three_founders, public.founders_exactly_three deferred;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------- login throttling

-- Records a PIN attempt. A success clears the counter and stamps the login; a failure counts
-- towards settings.security.pin_max_attempts, after which the agency ID is locked for
-- pin_lock_seconds. Returns the lock expiry (null or in the past = not locked).
create or replace function public.record_pin_attempt(p_agency text, p_ok boolean)
returns timestamptz
language plpgsql
as $$
declare
  v_max    integer;
  v_lock   integer;
  v_locked timestamptz;
begin
  select coalesce((settings #>> '{security,pin_max_attempts}')::integer, 5),
         coalesce((settings #>> '{security,pin_lock_seconds}')::integer, 60)
    into v_max, v_lock
    from public.event_state;

  if p_ok then
    update public.agency_auth
       set failed_attempts = 0,
           locked_until    = null,
           first_login_at  = coalesce(first_login_at, clock_timestamp()),
           last_login_at   = clock_timestamp()
     where agency_id = p_agency;
    return null;
  end if;

  update public.agency_auth
     set failed_attempts = case when failed_attempts + 1 >= v_max then 0 else failed_attempts + 1 end,
         locked_until    = case when failed_attempts + 1 >= v_max
                                then clock_timestamp() + make_interval(secs => v_lock)
                                else locked_until end
   where agency_id = p_agency
  returning locked_until into v_locked;
  return v_locked;
end;
$$;

-- ---------------------------------------------------------------- sessions

-- Starts an agency session. With p_single (used during the prelim), signing in on a new phone
-- signs out every other phone of that agency: one phone per agency for the quiz.
create or replace function public.create_agency_session(
  p_agency text, p_token_hash text, p_ttl_s integer, p_single boolean, p_user_agent text)
returns void
language plpgsql
as $$
begin
  if p_single then
    update public.agency_sessions
       set revoked_at = clock_timestamp()
     where agency_id = p_agency and revoked_at is null;
  end if;
  insert into public.agency_sessions (token_hash, agency_id, expires_at, user_agent)
  values (p_token_hash, p_agency, clock_timestamp() + make_interval(secs => p_ttl_s), left(p_user_agent, 200));
end;
$$;

-- The prelim has started once any scored question has been opened. From then on, an agency
-- that never signed in before cannot join (spec: Prelim quiz engine, step 7).
create or replace function public.quiz_has_started()
returns boolean
language sql
stable
as $$
  select exists (select 1 from public.questions where opened_at is not null and segment <> 'sudden_death')
$$;

-- ---------------------------------------------------------------- lockdown

revoke all on function public.register_agency(text, jsonb, text)                          from public, anon, authenticated;
revoke all on function public.record_pin_attempt(text, boolean)                           from public, anon, authenticated;
revoke all on function public.create_agency_session(text, text, integer, boolean, text)   from public, anon, authenticated;
revoke all on function public.quiz_has_started()                                          from public, anon, authenticated;
grant execute on function public.register_agency(text, jsonb, text)                        to service_role;
grant execute on function public.record_pin_attempt(text, boolean)                         to service_role;
grant execute on function public.create_agency_session(text, text, integer, boolean, text) to service_role;
grant execute on function public.quiz_has_started()                                        to service_role;
