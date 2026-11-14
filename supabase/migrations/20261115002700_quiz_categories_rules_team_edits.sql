-- 15 November: organisers' requests after the seniors' review.
--   1. The prelim plays category by category (shuffled inside each category), and the first
--      question of each category opens with a 5-second category intro before the usual read-in.
--   2. A "Rules" projector screen (one page of rules before each round).
--   3. Last-minute team changes: an admin or floater can replace, add or remove members and change
--      the captain, until the prelim starts, with a reason for the audit log.
-- Safe to run more than once.

-- ---------------------------------------------------------------- 1. quiz categories

alter table public.questions add column if not exists intro_until timestamptz;
comment on column public.questions.intro_until is
  'For the first question of a category: until when screens show the category intro (before the read-in).';

create or replace function public.quiz_segment_order(p_segment text)
returns integer
language sql
immutable
as $$
  select case p_segment when 'marvel_ya_dc' then 1 when 'teen_clue' then 2 when 'box_office' then 3 when 'hero_business' then 4 else 5 end
$$;

-- The live 15 in category order (Marvel Ya DC?, Teen Clue, Share Bazaar, Hero Ka Business),
-- shuffled within each category; the same order for everyone.
create or replace function public.quiz_shuffle()
returns void
language plpgsql
as $$
declare
  v_live integer;
begin
  perform 1 from public.event_state for update;
  if public.quiz_has_started() then
    raise exception 'quiz_started' using hint = 'The order is fixed once the first question has opened.';
  end if;
  select count(*) into v_live from public.questions where is_live and status = 'pending' and segment <> 'sudden_death';
  if v_live <> 15 then
    raise exception 'live_set_size' using hint = format('Expected 15 live questions, found %s.', v_live);
  end if;
  update public.questions set order_no = null, replaces_id = null where segment <> 'sudden_death';
  update public.questions q
     set order_no = s.rn
    from (select id, row_number() over (order by public.quiz_segment_order(segment), random())::smallint as rn
            from public.questions
           where is_live and status = 'pending' and segment <> 'sudden_death') s
   where q.id = s.id;
end;
$$;

create or replace function public.quiz_open_question(p_question text)
returns timestamptz
language plpgsql
as $$
declare
  v_state public.event_state%rowtype;
  v_q     public.questions%rowtype;
  v_lead  integer;
  v_intro integer;
  v_at    timestamptz;
begin
  select * into v_state from public.event_state for update;
  if v_state.phase <> 'prelim' then
    raise exception 'not_prelim' using hint = 'Switch the event to the prelim phase first.';
  end if;

  select * into v_q from public.questions where id = p_question for update;
  if not found then raise exception 'no_question'; end if;
  if v_q.status <> 'pending' then
    raise exception 'not_pending' using hint = format('%s has already been %s.', v_q.id, v_q.status);
  end if;
  if v_q.segment <> 'sudden_death' and v_q.order_no is null then
    raise exception 'not_in_live_set' using hint = 'Shuffle the live set, or use this spare for a voided slot.';
  end if;

  if exists (select 1 from public.questions
              where status = 'open' and id <> p_question
                and clock_timestamp() < opened_at + make_interval(secs => timer_s)) then
    raise exception 'question_running' using hint = 'Wait for the current question''s timer to finish.';
  end if;

  update public.questions
     set status = 'closed', closed_at = coalesce(closed_at, clock_timestamp())
   where status = 'open';

  v_lead := greatest(0, least(10, coalesce((v_state.settings #>> '{prelim,lead_in_seconds}')::integer, 3)));
  -- The first question of a category gets a 5-second category intro first.
  v_intro := case
    when v_q.segment <> 'sudden_death'
     and not exists (select 1 from public.questions where segment = v_q.segment and opened_at is not null and id <> p_question)
    then 5 else 0 end;
  v_at := clock_timestamp() + make_interval(secs => v_lead + v_intro);
  update public.questions
     set status = 'open', opened_at = v_at,
         intro_until = case when v_intro > 0 then clock_timestamp() + make_interval(secs => v_intro) end
   where id = p_question;
  update public.event_state set current_question_id = p_question, step = null, updated_at = clock_timestamp() where id;
  return v_at;
end;
$$;

-- ---------------------------------------------------------------- 2. the rules screen

alter table public.event_state drop constraint if exists event_state_projector_check;
alter table public.event_state add constraint event_state_projector_check
  check (projector in ('auto', 'welcome', 'rules', 'quiz', 'auction', 'board', 'cover', 'reveal', 'holding', 'blank'));

-- ---------------------------------------------------------------- 3. team changes at the desk

-- Founders stay locked after registration, except for the reset and an organiser's team edit.
create or replace function public.guard_founders_lock()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('doomsday.allow_reset', true), '') = 'on'
     or coalesce(current_setting('doomsday.allow_team_edit', true), '') = 'on' then
    return coalesce(new, old);
  end if;
  if not public.registration_is_open() then
    raise exception 'Founders are locked: registration has closed'
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

-- Replaces a team's members (1 to 3, one captain). Returns the members before the change, for
-- the audit log. Emails must still be IMI emails (checked by the email trigger).
create or replace function public.admin_edit_team(p_agency text, p_founders jsonb, p_reason text, p_actor uuid)
returns jsonb
language plpgsql
as $$
declare
  v_before jsonb;
  v_taken  text;
  n        integer;
begin
  perform 1 from public.event_state where id for update;
  if public.quiz_has_started() then
    raise exception 'team_locked' using hint = 'Team changes are allowed only until the prelim starts.';
  end if;
  if not exists (select 1 from public.agencies where id = p_agency and not is_test) then
    raise exception 'no_agency' using hint = 'Unknown agency.';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'reason_required' using hint = 'Write a short reason for the change.';
  end if;
  if jsonb_typeof(p_founders) is distinct from 'array' then
    raise exception 'founders_count' using hint = 'A team has 1 to 3 members.';
  end if;
  n := jsonb_array_length(p_founders);
  if n not between 1 and 3 then
    raise exception 'founders_count' using hint = 'A team has 1 to 3 members.';
  end if;
  if (select count(*) from jsonb_array_elements(p_founders) f where coalesce((f ->> 'is_captain')::boolean, false)) <> 1 then
    raise exception 'one_captain' using hint = 'Pick exactly one captain.';
  end if;
  if (select count(distinct lower(btrim(f ->> 'email'))) from jsonb_array_elements(p_founders) f) <> n
     or (select count(distinct f ->> 'phone') from jsonb_array_elements(p_founders) f) <> n then
    raise exception 'duplicate_member' using hint = 'Each member needs a different email and phone number.';
  end if;
  select string_agg(distinct format('%s (%s)', fo.name, fo.agency_id), ', ') into v_taken
    from public.founders fo
    join jsonb_array_elements(p_founders) f
      on lower(fo.email) = lower(btrim(f ->> 'email')) or fo.phone = f ->> 'phone'
   where fo.agency_id <> p_agency;
  if v_taken is not null then
    raise exception 'member_taken' using hint = format('Already a member of another team: %s.', v_taken);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('name', name, 'section', section, 'phone', phone, 'email', email, 'is_captain', is_captain) order by id), '[]'::jsonb)
    into v_before from public.founders where agency_id = p_agency;

  perform set_config('doomsday.allow_team_edit', 'on', true);
  delete from public.founders where agency_id = p_agency;
  insert into public.founders (agency_id, name, section, phone, email, is_captain)
  select p_agency,
         regexp_replace(btrim(f ->> 'name'), '\s+', ' ', 'g'),
         btrim(f ->> 'section'),
         f ->> 'phone',
         lower(btrim(f ->> 'email')),
         coalesce((f ->> 'is_captain')::boolean, false)
    from jsonb_array_elements(p_founders) as f;
  set constraints public.agencies_have_three_founders, public.founders_exactly_three immediate;
  set constraints public.agencies_have_three_founders, public.founders_exactly_three deferred;
  perform set_config('doomsday.allow_team_edit', 'off', true);
  return v_before;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['quiz_shuffle()', 'quiz_open_question(text)', 'admin_edit_team(text, jsonb, text, uuid)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end;
$$;

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261115002700'::text $$;
