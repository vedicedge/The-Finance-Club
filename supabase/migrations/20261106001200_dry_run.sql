-- Doomsday — dry run mode (requested by the organisers, 6 Nov 2026).
--
-- For rehearsals with the crew: an admin switches settings.dry_run.enabled on, and anyone can
-- register a *test agency* by typing just their name. A test agency has one member, needs no IMI
-- email, and is checked in straight away. Real registrations keep every rule (exactly 3 founders,
-- @imi.edu emails), are never touched by the dry run, and survive the reset, which deletes the
-- test agencies.

alter table public.agencies add column is_test boolean not null default false;

update public.event_state
   set settings = jsonb_set(settings, '{dry_run}', '{"enabled": false}', true)
 where settings -> 'dry_run' is null;

create or replace function public.dry_run_enabled()
returns boolean
language sql
stable
as $$
  select coalesce((select (settings #>> '{dry_run,enabled}')::boolean from public.event_state), false)
$$;

-- ---------------------------------------------------------------- founders rules

-- Real agencies: exactly 3 founders, 1 captain. Test agencies: exactly 1 founder (the captain).
create or replace function public.check_agency_founders()
returns trigger
language plpgsql
as $$
declare
  v_agency text;
  v_count  integer;
  v_capt   integer;
  v_need   integer;
begin
  if tg_table_name = 'agencies' then
    v_agency := new.id;
  elsif tg_op = 'DELETE' then
    v_agency := old.agency_id;
  else
    v_agency := new.agency_id;
  end if;

  select case when is_test then 1 else 3 end into v_need from public.agencies where id = v_agency;
  -- The agency itself may have been deleted in the same transaction (cascade); nothing to check.
  if v_need is null then
    return null;
  end if;

  select count(*), count(*) filter (where is_captain)
    into v_count, v_capt
    from public.founders
   where agency_id = v_agency;

  if v_count <> v_need then
    raise exception 'Agency % must have exactly % founder% (has %)', v_agency, v_need,
      case when v_need = 1 then '' else 's' end, v_count
      using errcode = 'check_violation';
  end if;
  if v_capt <> 1 then
    raise exception 'Agency % must have exactly 1 captain (has %)', v_agency, v_capt
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

-- The @imi.edu rule applies to real agencies only.
create or replace function public.guard_founder_email_domain()
returns trigger
language plpgsql
as $$
declare
  v_domain text;
begin
  if exists (select 1 from public.agencies where id = new.agency_id and is_test) then
    return new;
  end if;
  select nullif(lower(btrim(settings #>> '{registration,email_domain}')), '')
    into v_domain
    from public.event_state;
  if v_domain is not null
     and right(lower(btrim(new.email)), length(v_domain) + 1) <> '@' || v_domain then
    raise exception 'Founder emails must be @% addresses (got %)', v_domain, new.email
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Founders lock after registration closes, except during the deliberate reset.
create or replace function public.guard_founders_lock()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('doomsday.allow_reset', true), '') = 'on' then
    return coalesce(new, old);
  end if;
  if not public.registration_is_open() then
    raise exception 'Founders are locked: registration has closed'
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------- quick test registration

-- Dry run only: name in, test agency out (one member, checked in, signed-up PIN). Allowed before
-- the prelim starts, whatever the real registration deadline, flag or cap.
create or replace function public.register_test_agency(p_name text, p_pin_hash text)
returns text
language plpgsql
as $$
declare
  v_phase text;
  v_name  text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_next  integer;
  v_id    text;
begin
  select phase into v_phase from public.event_state for update;
  if not public.dry_run_enabled() then
    raise exception 'dry_run_off' using hint = 'Dry run mode is off.';
  end if;
  if v_phase not in ('registration', 'checkin') then
    raise exception 'dry_run_started' using hint = 'The dry run has started; new test agencies cannot join.';
  end if;
  if length(v_name) not between 2 and 40 then
    raise exception 'bad_name' using hint = 'Use 2–40 characters.';
  end if;

  select coalesce(max(substring(id from 2)::integer), 0) + 1 into v_next from public.agencies;
  v_id := 'A' || lpad(v_next::text, 2, '0');

  insert into public.agencies (id, name, is_test, status, checked_in_at)
  values (v_id, v_name, true, 'checked_in', clock_timestamp());
  -- Placeholder contact details: unique per test agency, and never a real phone (real mobiles
  -- start with 6–9) or a deliverable address.
  insert into public.founders (agency_id, name, section, phone, email, is_captain)
  values (v_id, v_name, 'Dry run', '00' || lpad(v_next::text, 8, '0'), lower(v_id) || '@dry-run.invalid', true);
  insert into public.agency_auth (agency_id, pin_hash) values (v_id, p_pin_hash);

  set constraints public.agencies_have_three_founders, public.founders_exactly_three immediate;
  set constraints public.agencies_have_three_founders, public.founders_exactly_three deferred;
  return v_id;
end;
$$;

-- The real registration cap counts real agencies only (test agencies never take a real slot).
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
  select count(*) into v_count from public.agencies where not is_test;
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

  set constraints public.agencies_have_three_founders, public.founders_exactly_three immediate;
  set constraints public.agencies_have_three_founders, public.founders_exactly_three deferred;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------- keep real and test apart

-- Freezing the top 16 only eliminates agencies of the same kind (test or real) as the qualifiers,
-- so a dry run never touches real registrations.
create or replace function public.quiz_freeze_top16(p_qualifiers text[])
returns void
language plpgsql
as $$
declare
  v_state public.event_state%rowtype;
  v_test  boolean;
begin
  select * into v_state from public.event_state for update;
  if v_state.prelim_published_at is null then raise exception 'board_not_published'; end if;
  if v_state.prelim_frozen_at is not null then raise exception 'already_frozen'; end if;
  if coalesce(array_length(p_qualifiers, 1), 0) = 0 or array_length(p_qualifiers, 1) > 16 then
    raise exception 'bad_qualifiers';
  end if;
  if (select count(*) from public.agencies where id = any (p_qualifiers)) <> array_length(p_qualifiers, 1)
     or (select count(distinct is_test) from public.agencies where id = any (p_qualifiers)) <> 1 then
    raise exception 'bad_qualifiers';
  end if;
  select bool_or(is_test) into v_test from public.agencies where id = any (p_qualifiers);

  update public.agencies set status = 'active', eliminated_in = null where id = any (p_qualifiers);
  update public.agencies
     set status = 'eliminated', eliminated_in = 'prelim'
   where not (id = any (p_qualifiers)) and status in ('registered', 'checked_in') and is_test = v_test;
  update public.event_state set prelim_frozen_at = clock_timestamp();
end;
$$;

-- The phone's prelim rank counts only agencies of its own kind (test or real).
create or replace function public.quiz_phone_state(p_token_hash text)
returns jsonb
language plpgsql
stable
as $$
declare
  v_now      timestamptz := clock_timestamp();
  v_agency   public.agencies%rowtype;
  v_state    public.event_state%rowtype;
  v_q        public.questions%rowtype;
  v_ans      public.answers%rowtype;
  v_key      smallint;
  v_revealed boolean;
  v_question jsonb;
  v_points   integer;
  v_correct  integer;
  v_answered integer;
  v_done     integer;
  v_rank     bigint;
  v_requires boolean;
begin
  select a.* into v_agency
    from public.agency_sessions s
    join public.agencies a on a.id = s.agency_id
   where s.token_hash = p_token_hash and s.revoked_at is null and s.expires_at > v_now;
  if not found then
    return jsonb_build_object('signed_in', false);
  end if;

  select * into v_state from public.event_state;
  v_requires := coalesce((v_state.settings #>> '{prelim,requires_checkin}')::boolean, true);

  if v_state.current_question_id is not null then
    select * into v_q from public.questions where id = v_state.current_question_id;
    if v_q.segment = 'sudden_death' then
      v_question := jsonb_build_object('sudden_death', true);
    else
      v_revealed := v_q.revealed_at is not null and v_q.status <> 'void';
      if v_revealed then
        select correct_index into v_key from public.question_keys where question_id = v_q.id;
      end if;
      select * into v_ans from public.answers where agency_id = v_agency.id and question_id = v_q.id;
      v_question := jsonb_build_object(
        'id', v_q.id,
        'number', v_q.order_no,
        'segment', v_q.segment,
        'prompt', v_q.prompt,
        'options', to_jsonb(v_q.options),
        'timer_s', v_q.timer_s,
        'weight', v_q.weight,
        'status', v_q.status,
        'opened_at', v_q.opened_at,
        'revealed', v_revealed,
        'correct_index', case when v_revealed then v_key end,
        'my_answer', case when v_ans.agency_id is not null then jsonb_build_object(
            'option_index', v_ans.option_index,
            'late', v_ans.response_time_s > v_q.timer_s,
            'is_correct', case when v_revealed then v_ans.is_correct end,
            'points', case when v_revealed then v_ans.points end) end);
    end if;
  end if;

  select coalesce(sum(a.points), 0), count(*) filter (where a.is_correct), count(*)
    into v_points, v_correct, v_answered
    from public.answers a
    join public.questions q on q.id = a.question_id
   where a.agency_id = v_agency.id and q.revealed_at is not null and q.status <> 'void' and q.segment <> 'sudden_death';

  select count(*) into v_done
    from public.questions
   where order_no is not null and status <> 'void' and segment <> 'sudden_death' and revealed_at is not null;

  if v_state.prelim_published_at is not null then
    select r.rk into v_rank
      from (select s.agency_id, rank() over (order by s.total_points desc, s.correct_time_s asc) as rk
              from public.v_prelim_scores s
              join public.agencies ag on ag.id = s.agency_id
             where ag.is_test = v_agency.is_test) r
     where r.agency_id = v_agency.id;
  end if;

  return jsonb_build_object(
    'signed_in', true,
    'now', v_now,
    'phase', v_state.phase,
    'agency', jsonb_build_object('id', v_agency.id, 'name', v_agency.name, 'status', v_agency.status,
                                 'eliminated_in', v_agency.eliminated_in),
    'eligible', v_agency.status = 'checked_in' or (v_agency.status = 'registered' and not v_requires),
    'requires_checkin', v_requires,
    'question', v_question,
    'totals', jsonb_build_object('points', v_points, 'correct', v_correct, 'answered', v_answered),
    'revealed_count', v_done,
    'published', v_state.prelim_published_at is not null,
    'frozen', v_state.prelim_frozen_at is not null,
    'rank', v_rank,
    'dry_run', coalesce((v_state.settings #>> '{dry_run,enabled}')::boolean, false));
end;
$$;

-- ---------------------------------------------------------------- reset

-- Same as before, but "keep registrations" now deletes the dry run's test agencies and keeps
-- only real ones.
create or replace function public.admin_reset_event(p_keep_registrations boolean, p_actor uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('doomsday.allow_reset', 'on', true);
  set constraints public.agencies_have_three_founders, public.founders_exactly_three immediate;
  truncate public.answers, public.prelim_tiebreaks, public.ledger_voids, public.sales, public.insider_tips,
           public.force_fields, public.envelope_moves, public.xray_log, public.reveals, public.poster_duels,
           public.tower_results, public.envelope_contents, public.ledger_entries;
  update public.missions set winner_agency_id = null, choice = null, swap_target = null, decided_at = null;
  update public.event_state
     set phase = 'registration', step = null, current_question_id = null, current_card_id = null,
         current_mission = null, prelim_published_at = null, prelim_frozen_at = null, round1_locked_at = null,
         round2_published_at = null, alert = null, updated_at = clock_timestamp(), updated_by = p_actor;
  update public.questions
     set status = 'pending', order_no = null, replaces_id = null, opened_at = null, closed_at = null, revealed_at = null;
  update public.breaking_news set draw_order = null, revealed_at = null;
  update public.team_ups set revealed_at = null;
  update public.gear_cards set lot_order = null;

  if p_keep_registrations then
    delete from public.agencies where is_test; -- founders, PINs and sessions go with them
    update public.agencies set status = 'registered', eliminated_in = null, checked_in_at = null;
    update public.agency_auth set failed_attempts = 0, locked_until = null, first_login_at = null;
  else
    truncate public.agency_sessions, public.agency_auth, public.founders;
    delete from public.agencies;
  end if;
  set constraints public.agencies_have_three_founders, public.founders_exactly_three deferred;
end;
$$;

-- ---------------------------------------------------------------- lockdown

do $$
declare
  f text;
begin
  foreach f in array array['dry_run_enabled()', 'register_test_agency(text, text)', 'register_agency(text, jsonb, text)', 'quiz_freeze_top16(text[])',
                           'quiz_phone_state(text)', 'admin_reset_event(boolean, uuid)', 'check_agency_founders()',
                           'guard_founder_email_domain()', 'guard_founders_lock()']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end;
$$;
