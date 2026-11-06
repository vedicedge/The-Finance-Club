-- Supabase runs every API request under the `safeupdate` guard: an UPDATE or DELETE without a
-- WHERE clause fails with "UPDATE requires a WHERE clause". The functions below run inside those
-- requests (the consoles call them through the API), so each such statement now has one:
-- `where id` for the single event_state row, `where true` where a whole table is meant (resets,
-- redraws). Nothing else in these functions changes. The test database now loads the same guard
-- (scripts/db/safeupdate) so this cannot come back unnoticed.

-- admin_reset_event: 9 statement(s); previously in 20261106001200_dry_run.sql
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
  update public.missions set winner_agency_id = null, choice = null, swap_target = null, decided_at = null where true;
  update public.event_state
     set phase = 'registration', step = null, current_question_id = null, current_card_id = null,
         current_mission = null, prelim_published_at = null, prelim_frozen_at = null, round1_locked_at = null,
         round2_published_at = null, alert = null, updated_at = clock_timestamp(), updated_by = p_actor where id;
  update public.questions
     set status = 'pending', order_no = null, replaces_id = null, opened_at = null, closed_at = null, revealed_at = null where true;
  update public.breaking_news set draw_order = null, revealed_at = null where true;
  update public.team_ups set revealed_at = null where true;
  update public.gear_cards set lot_order = null where true;

  if p_keep_registrations then
    delete from public.agencies where is_test; -- founders, PINs and sessions go with them
    update public.agencies set status = 'registered', eliminated_in = null, checked_in_at = null where true;
    update public.agency_auth set failed_attempts = 0, locked_until = null, first_login_at = null where true;
  else
    truncate public.agency_sessions, public.agency_auth, public.founders;
    delete from public.agencies where true;
  end if;
  set constraints public.agencies_have_three_founders, public.founders_exactly_three deferred;
end;
$$;

-- quiz_freeze_top16: 1 statement(s); previously in 20261106001200_dry_run.sql
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
  update public.event_state set prelim_frozen_at = clock_timestamp() where id;
end;
$$;

-- quiz_open_question: 1 statement(s); previously in 20261106000900_prelim_quiz.sql
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
  update public.event_state set current_question_id = p_question, step = null, updated_at = clock_timestamp() where id;
  return v_at;
end;
$$;

-- quiz_publish_board: 1 statement(s); previously in 20261106000900_prelim_quiz.sql
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
  update public.event_state set prelim_published_at = coalesce(prelim_published_at, clock_timestamp()) where id;
end;
$$;

-- quiz_unpublish_board: 1 statement(s); previously in 20261106000900_prelim_quiz.sql
create or replace function public.quiz_unpublish_board()
returns void
language plpgsql
as $$
begin
  if (select prelim_frozen_at from public.event_state) is not null then
    raise exception 'already_frozen' using hint = 'The top 16 have been frozen.';
  end if;
  update public.event_state set prelim_published_at = null where id;
end;
$$;

-- r1_lock: 1 statement(s); previously in 20261106001000_auction_ledger.sql
create or replace function public.r1_lock()
returns void
language plpgsql
as $$
declare
  v_pending text;
begin
  perform 1 from public.event_state for update;
  perform public.round1_state();
  select string_agg(id, ', ' order by id) into v_pending
    from public.agencies
   where status = 'active' and cardinality(public.missing_categories(id)) > 0;
  if v_pending is not null then
    raise exception 'jugaad_pending' using hint = format('Still missing a category: %s. Apply Jugaad Kits first.', v_pending);
  end if;
  update public.breaking_news set revealed_at = clock_timestamp() where draw_order is not null and revealed_at is null;
  update public.team_ups set revealed_at = clock_timestamp() where revealed_at is null;
  update public.event_state set round1_locked_at = clock_timestamp(), step = 'locked' where id;
end;
$$;

-- r1_set_news_draw: 1 statement(s); previously in 20261106001000_auction_ledger.sql
create or replace function public.r1_set_news_draw(p_ids text[])
returns void
language plpgsql
as $$
begin
  if (select round1_locked_at from public.event_state) is not null then raise exception 'round1_locked'; end if;
  if exists (select 1 from public.insider_tips where voided_at is null) then
    raise exception 'tips_sold' using hint = 'Tips have been sold against this draw; it can no longer change.';
  end if;
  if exists (select 1 from public.breaking_news where revealed_at is not null) then
    raise exception 'news_revealed';
  end if;
  if coalesce(array_length(p_ids, 1), 0) <> 6
     or (select count(distinct x) from unnest(p_ids) x) <> 6
     or (select count(*) from public.breaking_news where id = any (p_ids)) <> 6 then
    raise exception 'bad_draw' using hint = 'Pick 6 different news cards.';
  end if;
  update public.breaking_news set draw_order = null where true;
  update public.breaking_news b
     set draw_order = d.ord
    from unnest(p_ids) with ordinality as d(id, ord)
   where b.id = d.id;
end;
$$;

-- r1_shuffle_lots: 1 statement(s); previously in 20261106001000_auction_ledger.sql
create or replace function public.r1_shuffle_lots()
returns void
language plpgsql
as $$
begin
  if exists (select 1 from public.sales where voided_at is null) then
    raise exception 'auction_started' using hint = 'The lot order is fixed once a card has been sold.';
  end if;
  update public.gear_cards set lot_order = null where true;
  update public.gear_cards g
     set lot_order = m.rn
    from (select id, row_number() over (order by id)::smallint as rn from public.gear_cards where phase = 'marquee') m
   where g.id = m.id;
  update public.gear_cards g
     set lot_order = s.rn
    from (select g2.id, (8 + row_number() over (order by c.r, random()))::smallint as rn
            from public.gear_cards g2
            join (select category, random() as r from (select distinct category from public.gear_cards where phase = 'secret') x) c
              on c.category = g2.category
           where g2.phase = 'secret') s
   where g.id = s.id;
end;
$$;

-- r2_draw_pairings: 1 statement(s); previously in 20261106001100_rounds_2_3_reveal.sql
create or replace function public.r2_draw_pairings()
returns integer
language plpgsql
as $$
declare
  n integer;
begin
  perform public.round2_state();
  if exists (select 1 from public.poster_duels where votes_a is not null or votes_b is not null) then
    raise exception 'votes_entered' using hint = 'Votes are already entered; the pairings are fixed.';
  end if;
  delete from public.poster_duels where true;
  with s as (
    select id, row_number() over (order by random()) as rn from public.agencies where status = 'active'
  )
  insert into public.poster_duels (agency_a, agency_b)
  select a.id, b.id from s a left join s b on b.rn = a.rn + 1 where a.rn % 2 = 1;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- r2_publish: 2 statement(s); previously in 20261106001100_rounds_2_3_reveal.sql
create or replace function public.r2_publish(p_qualifiers text[], p_actor uuid)
returns void
language plpgsql
as $$
declare
  v_active   integer;
  v_missing  text;
  v_undec    text;
begin
  perform 1 from public.event_state for update;
  perform public.round2_state();
  select count(*) into v_active from public.agencies where status = 'active';
  select string_agg(a.id, ', ' order by a.id) into v_missing
    from public.agencies a
   where a.status = 'active' and not exists (select 1 from public.tower_results t where t.agency_id = a.id);
  if v_missing is not null then
    raise exception 'tower_missing' using hint = format('No tower result yet for %s.', v_missing);
  end if;
  if not exists (select 1 from public.poster_duels) then
    raise exception 'no_duels' using hint = 'Draw the poster duel pairings first.';
  end if;
  select string_agg(coalesce(agency_a || ' v ' || agency_b, agency_a), ', ') into v_undec
    from public.poster_duels where winner is null;
  if v_undec is not null then
    raise exception 'duel_undecided' using hint = format('Enter votes for: %s.', v_undec);
  end if;
  if coalesce(array_length(p_qualifiers, 1), 0) <> least(8, v_active)
     or (select count(*) from public.agencies where status = 'active' and id = any (p_qualifiers)) <> least(8, v_active) then
    raise exception 'bad_qualifiers';
  end if;

  insert into public.ledger_entries (agency_id, amount, reason, ref, note, created_by)
  select d.winner, 5, 'poster_bonus', 'duel:' || d.id,
         case when d.agency_b is null then 'Poster duel bye' else 'Poster duel won' end, p_actor
    from public.poster_duels d
   where d.winner = any (p_qualifiers);

  update public.agencies set status = 'eliminated', eliminated_in = 'round2'
   where status = 'active' and not (id = any (p_qualifiers));
  update public.tower_results set published = true where true;
  update public.event_state set round2_published_at = clock_timestamp() where id;
end;
$$;

-- r3_set_envelope_contents: 1 statement(s); previously in 20261106001100_rounds_2_3_reveal.sql
create or replace function public.r3_set_envelope_contents(p_map jsonb, p_actor uuid)
returns void
language plpgsql
as $$
begin
  if exists (select 1 from public.reveals) then
    raise exception 'reveal_started' using hint = 'Envelopes are being opened; the map is final.';
  end if;
  if (select count(*) from jsonb_each_text(p_map) m join public.envelopes e on e.id = m.key
        join public.battle_outcomes b on b.label = m.value) <> 8
     or (select count(*) from jsonb_object_keys(p_map)) <> 8 then
    raise exception 'bad_map' using hint = 'Give each of E1–E8 one Battle Outcome.';
  end if;
  if exists (
    select 1 from public.battle_outcomes b
     where b.envelopes <> (select count(*) from jsonb_each_text(p_map) m where m.value = b.label)) then
    raise exception 'bad_distribution' using hint = 'The map must use each outcome as often as the spec''s table says.';
  end if;
  delete from public.envelope_contents where true;
  insert into public.envelope_contents (envelope_id, outcome_label, entered_by)
  select key, value, p_actor from jsonb_each_text(p_map);
end;
$$;

-- r3_set_mission: 1 statement(s); previously in 20261106001100_rounds_2_3_reveal.sql
create or replace function public.r3_set_mission(p_mission integer, p_step text)
returns void
language plpgsql
as $$
begin
  if (select phase from public.event_state) <> 'round3' then raise exception 'not_round3'; end if;
  if p_mission not between 1 and 4 or p_step not in ('force_field', 'play', 'results', 'choice', 'chai') then
    raise exception 'bad_step';
  end if;
  if p_mission = 4 and p_step in ('choice', 'chai') then
    raise exception 'mission4_at_zero_hour' using hint = 'Mission 4''s choice happens at the start of Zero Hour; no trading.';
  end if;
  update public.event_state set current_mission = p_mission, step = p_step where id;
end;
$$;

-- ---------------------------------------------------------------- lockdown (unchanged)

do $$
declare
  f text;
begin
  foreach f in array array['admin_reset_event(boolean, uuid)',
                           'quiz_freeze_top16(text[])',
                           'quiz_open_question(text)',
                           'quiz_publish_board()',
                           'quiz_unpublish_board()',
                           'r1_lock()',
                           'r1_set_news_draw(text[])',
                           'r1_shuffle_lots()',
                           'r2_draw_pairings()',
                           'r2_publish(text[], uuid)',
                           'r3_set_envelope_contents(jsonb, uuid)',
                           'r3_set_mission(integer, text)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end;
$$;
