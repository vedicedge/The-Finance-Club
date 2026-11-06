-- Doomsday — Milestone 3: the live prelim quiz engine (spec: "Prelim quiz engine").
--
-- Every timestamp that decides points is the database's clock_timestamp(); phones never send
-- a time. Answer keys never leave the database before a question is revealed: answers are
-- marked inside submit, and the phone state only carries the key once revealed_at is set.
--
-- Read-in: when the host opens a question, opened_at is set settings.prelim.lead_in_seconds
-- (default 3) in the future. The projector and phones show the question with a 3-2-1 countdown;
-- answers are accepted, and t is measured, only from opened_at. Every agency gets the same
-- reading time however slow its Wi-Fi is. The formula and the timers are unchanged.

alter table public.event_state add column prelim_frozen_at timestamptz;

update public.event_state
   set settings = jsonb_set(settings, '{prelim,lead_in_seconds}', '3', true)
 where settings #> '{prelim,lead_in_seconds}' is null;

-- ---------------------------------------------------------------- helpers

-- The agency signed in with this session token hash, or null.
create or replace function public.session_agency(p_token_hash text)
returns text
language sql
stable
as $$
  select agency_id
    from public.agency_sessions
   where token_hash = p_token_hash and revoked_at is null and expires_at > clock_timestamp()
$$;

-- ---------------------------------------------------------------- host actions

-- "Quiz host loads the 15 live questions (pre-shuffled once; same order for everyone)."
-- Assigns slots 1–15 to the live set in a random order. Allowed until the first question opens.
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
  -- Spares that replaced a voided question go back to being spares.
  update public.questions set order_no = null, replaces_id = null where segment <> 'sudden_death';
  update public.questions q
     set order_no = s.rn
    from (select id, row_number() over (order by random())::smallint as rn
            from public.questions
           where is_live and status = 'pending' and segment <> 'sudden_death') s
   where q.id = s.id;
end;
$$;

-- "Host opens each question for all agencies at once; the server stamps the open time."
create or replace function public.quiz_open_question(p_question text)
returns timestamptz
language plpgsql
as $$
declare
  v_state public.event_state%rowtype;
  v_q     public.questions%rowtype;
  v_lead  integer;
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

  -- Anything still marked open has run out of time: close it.
  update public.questions
     set status = 'closed', closed_at = coalesce(closed_at, clock_timestamp())
   where status = 'open';

  v_lead := greatest(0, least(10, coalesce((v_state.settings #>> '{prelim,lead_in_seconds}')::integer, 3)));
  v_at := clock_timestamp() + make_interval(secs => v_lead);
  update public.questions set status = 'open', opened_at = v_at where id = p_question;
  update public.event_state set current_question_id = p_question, step = null, updated_at = clock_timestamp();
  return v_at;
end;
$$;

-- "Phone taps an option → check the session, that the question is open and that the agency has
-- not answered; stamp received_at with database time." Returns 'locked', or 'late' when the
-- answer arrived after T (recorded with 0 points). Correctness is never returned here.
create or replace function public.quiz_submit_answer(p_token_hash text, p_question text, p_option integer)
returns text
language plpgsql
as $$
declare
  v_agency  text;
  v_status  text;
  v_state   public.event_state%rowtype;
  v_q       public.questions%rowtype;
  v_key     smallint;
  v_now     timestamptz;
  v_t       numeric;
  v_correct boolean;
begin
  v_agency := public.session_agency(p_token_hash);
  if v_agency is null then raise exception 'not_signed_in'; end if;

  select * into v_state from public.event_state;
  if v_state.phase <> 'prelim' then raise exception 'not_prelim'; end if;

  select status into v_status from public.agencies where id = v_agency;
  if v_status = 'registered' and coalesce((v_state.settings #>> '{prelim,requires_checkin}')::boolean, true) then
    raise exception 'not_checked_in';
  end if;
  if v_status not in ('registered', 'checked_in') then raise exception 'not_eligible'; end if;

  select * into v_q from public.questions where id = p_question;
  if not found or v_q.status <> 'open' or v_q.segment = 'sudden_death' then raise exception 'not_open'; end if;

  v_now := clock_timestamp();
  if v_now < v_q.opened_at then raise exception 'not_yet'; end if;
  if p_option < 0 or p_option >= array_length(v_q.options, 1) then raise exception 'bad_option'; end if;

  select correct_index into v_key from public.question_keys where question_id = p_question;
  if v_key is null then raise exception 'no_answer_key'; end if;

  v_t := public.response_time_s(v_q.opened_at, v_now);
  v_correct := p_option = v_key;

  insert into public.answers (agency_id, question_id, option_index, received_at, response_time_s, is_correct, points)
  values (v_agency, p_question, p_option, v_now, v_t, v_correct,
          public.quiz_points(v_t, v_q.timer_s, v_q.weight, v_correct))
  on conflict (agency_id, question_id) do nothing;
  if not found then raise exception 'already_answered'; end if;

  return case when v_t > v_q.timer_s then 'late' else 'locked' end;
end;
$$;

-- "The host clicks Reveal to show the right option on the projector and results on phones."
-- Only once the timer has run out, so nobody's answering time is cut short.
create or replace function public.quiz_reveal_question(p_question text)
returns void
language plpgsql
as $$
declare
  v_q public.questions%rowtype;
begin
  select * into v_q from public.questions where id = p_question for update;
  if not found or v_q.status not in ('open', 'closed') then raise exception 'not_revealable'; end if;
  if v_q.revealed_at is not null then raise exception 'already_revealed'; end if;
  if clock_timestamp() < v_q.opened_at + make_interval(secs => v_q.timer_s) then
    raise exception 'still_running' using hint = 'Reveal unlocks when the timer ends.';
  end if;
  update public.questions
     set status = 'closed', closed_at = coalesce(closed_at, clock_timestamp()), revealed_at = clock_timestamp()
   where id = p_question;
end;
$$;

-- "If a question breaks or is disputed, the host voids it" (excluded from every total).
create or replace function public.quiz_void_question(p_question text)
returns void
language plpgsql
as $$
declare
  v_q public.questions%rowtype;
begin
  select * into v_q from public.questions where id = p_question for update;
  if not found or v_q.segment = 'sudden_death' then raise exception 'no_question'; end if;
  if v_q.status = 'void' then raise exception 'already_void'; end if;
  if (select prelim_published_at from public.event_state) is not null then
    raise exception 'board_published' using hint = 'Unpublish the board before voiding a question.';
  end if;
  update public.questions
     set status = 'void', closed_at = coalesce(closed_at, clock_timestamp())
   where id = p_question;
end;
$$;

-- "…and opens a spare from the same segment." The spare takes over the voided question's slot.
create or replace function public.quiz_use_spare(p_voided text, p_spare text)
returns void
language plpgsql
as $$
declare
  v_old public.questions%rowtype;
  v_new public.questions%rowtype;
begin
  select * into v_old from public.questions where id = p_voided for update;
  select * into v_new from public.questions where id = p_spare for update;
  if v_old.status is distinct from 'void' or v_old.order_no is null then raise exception 'not_a_voided_slot'; end if;
  if v_new.status is distinct from 'pending' or v_new.order_no is not null then raise exception 'spare_not_available'; end if;
  if v_new.segment <> v_old.segment then
    raise exception 'wrong_segment' using hint = 'A spare must come from the same segment.';
  end if;
  update public.questions set order_no = v_old.order_no, replaces_id = v_old.id where id = p_spare;
end;
$$;

-- "Host publishes the final board." Every slotted, non-void question must be revealed.
create or replace function public.quiz_publish_board()
returns void
language plpgsql
as $$
declare
  v_open integer;
begin
  perform 1 from public.event_state for update;
  select count(*) into v_open
    from public.questions
   where order_no is not null and status <> 'void' and segment <> 'sudden_death' and revealed_at is null;
  if v_open > 0 then
    raise exception 'questions_unrevealed' using hint = format('%s question(s) not yet revealed.', v_open);
  end if;
  update public.event_state set prelim_published_at = coalesce(prelim_published_at, clock_timestamp());
end;
$$;

create or replace function public.quiz_unpublish_board()
returns void
language plpgsql
as $$
begin
  if (select prelim_frozen_at from public.event_state) is not null then
    raise exception 'already_frozen' using hint = 'The top 16 have been frozen.';
  end if;
  update public.event_state set prelim_published_at = null;
end;
$$;

-- "Freeze the top 16 for Round 1." The ranking (with tie-breaks) is worked out by the server
-- and passed in; everyone else who registered is eliminated in the prelim.
create or replace function public.quiz_freeze_top16(p_qualifiers text[])
returns void
language plpgsql
as $$
declare
  v_state public.event_state%rowtype;
begin
  select * into v_state from public.event_state for update;
  if v_state.prelim_published_at is null then raise exception 'board_not_published'; end if;
  if v_state.prelim_frozen_at is not null then raise exception 'already_frozen'; end if;
  if coalesce(array_length(p_qualifiers, 1), 0) = 0 or array_length(p_qualifiers, 1) > 16 then
    raise exception 'bad_qualifiers';
  end if;
  if (select count(*) from public.agencies where id = any (p_qualifiers)) <> array_length(p_qualifiers, 1) then
    raise exception 'bad_qualifiers';
  end if;

  update public.agencies set status = 'active', eliminated_in = null where id = any (p_qualifiers);
  update public.agencies
     set status = 'eliminated', eliminated_in = 'prelim'
   where not (id = any (p_qualifiers)) and status in ('registered', 'checked_in');
  update public.event_state set prelim_frozen_at = clock_timestamp();
end;
$$;

-- ---------------------------------------------------------------- what a phone sees

-- One round trip per poll. Never includes the answer key, another agency's data, or the
-- correctness of an unrevealed answer; running totals count revealed questions only.
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
      from (select agency_id, rank() over (order by total_points desc, correct_time_s asc) as rk
              from public.v_prelim_scores) r
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
    'rank', v_rank);
end;
$$;

-- ---------------------------------------------------------------- lockdown

do $$
declare
  f text;
begin
  foreach f in array array[
    'session_agency(text)', 'quiz_shuffle()', 'quiz_open_question(text)',
    'quiz_submit_answer(text, text, integer)', 'quiz_reveal_question(text)', 'quiz_void_question(text)',
    'quiz_use_spare(text, text)', 'quiz_publish_board()', 'quiz_unpublish_board()',
    'quiz_freeze_top16(text[])', 'quiz_phone_state(text)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end;
$$;
