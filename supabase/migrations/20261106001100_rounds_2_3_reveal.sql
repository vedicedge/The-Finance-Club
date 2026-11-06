-- Doomsday — Milestone 5: Round 2 (Operation: Skyline), Round 3 (The Doomsday Vault),
-- the Zero Hour reveal, and a deliberate reset for the real event.
-- Rounds 2 and 3 are played on the floor; these functions record organisers' entries and
-- enforce the spec's rules ("Ledger rules the server enforces": Publish Round 2, Force Field,
-- Winner's choice, Transfer, Fine).

-- ================================================================ Round 2

create or replace function public.round2_state()
returns public.event_state
language plpgsql
as $$
declare
  v public.event_state%rowtype;
begin
  select * into v from public.event_state;
  if v.phase <> 'round2' then
    raise exception 'not_round2' using hint = 'Switch the event to Round 2 · Operation: Skyline first.';
  end if;
  if v.round2_published_at is not null then
    raise exception 'round2_published' using hint = 'Round 2 results are published and final.';
  end if;
  return v;
end;
$$;

-- "Pairings: drawn randomly after Round 1 (the website can run the draw). An odd number of
-- agencies gives one a bye." Can be redrawn until votes are entered.
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
  delete from public.poster_duels;
  with s as (
    select id, row_number() over (order by random()) as rn from public.agencies where status = 'active'
  )
  insert into public.poster_duels (agency_a, agency_b)
  select a.id, b.id from s a left join s b on b.rn = a.rn + 1 where a.rn % 2 = 1;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Story votes at the cutoff, typed by the social-media lead. A tie needs the
-- rock-paper-scissors winner (spec: "a tie is settled by rock-paper-scissors").
create or replace function public.r2_set_votes(p_duel integer, p_votes_a integer, p_votes_b integer, p_tiebreak text)
returns void
language plpgsql
as $$
declare
  d public.poster_duels%rowtype;
begin
  perform public.round2_state();
  select * into d from public.poster_duels where id = p_duel for update;
  if not found then raise exception 'no_duel'; end if;
  if p_votes_a is null or p_votes_a < 0 or (d.agency_b is not null and (p_votes_b is null or p_votes_b < 0)) then
    raise exception 'bad_votes' using hint = 'Enter both vote counts (0 or more).';
  end if;
  if d.agency_b is not null and p_votes_a = p_votes_b
     and (p_tiebreak is null or p_tiebreak not in (d.agency_a, d.agency_b)) then
    raise exception 'tie_needs_rps' using hint = 'Votes are tied: pick the rock-paper-scissors winner.';
  end if;
  update public.poster_duels
     set votes_a = p_votes_a,
         votes_b = case when d.agency_b is null then null else p_votes_b end,
         tiebreak_winner = case when d.agency_b is not null and p_votes_a = p_votes_b then p_tiebreak end
   where id = p_duel;
end;
$$;

-- A scorer's tower measurements (editable until Round 2 is published).
create or replace function public.r2_save_tower(
  p_agency text, p_correct integer, p_reference integer, p_build_time_s integer, p_frozen integer, p_fallen integer, p_actor uuid)
returns void
language plpgsql
as $$
begin
  perform public.round2_state();
  if not exists (select 1 from public.agencies where id = p_agency and status = 'active') then
    raise exception 'agency_not_active' using hint = format('%s is not in Round 2.', p_agency);
  end if;
  insert into public.tower_results (agency_id, correct_blocks, reference_blocks, build_time_s, frozen_blocks, blocks_fallen, updated_by, updated_at)
  values (p_agency, p_correct, p_reference, p_build_time_s, p_frozen, p_fallen, p_actor, clock_timestamp())
  on conflict (agency_id) do update
    set correct_blocks = excluded.correct_blocks, reference_blocks = excluded.reference_blocks,
        build_time_s = excluded.build_time_s, frozen_blocks = excluded.frozen_blocks,
        blocks_fallen = excluded.blocks_fallen, updated_by = excluded.updated_by, updated_at = excluded.updated_at;
end;
$$;

-- "Publish Round 2: all tower rows entered; cutoff ties resolved by organiser → top 8 → active,
-- rest out; +5 to qualified duel winners and byes." The server ranks and passes the top 8.
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
  update public.tower_results set published = true;
  update public.event_state set round2_published_at = clock_timestamp();
end;
$$;

-- ================================================================ Round 3

-- Envelope → Battle Outcome map, entered by one admin from the filled envelopes. It must match
-- the spec's distribution (1 × ×3, 1 × ×2, 2 × ×1.5, 1 × ×1, 2 × ×0.5, 1 × ×0.25).
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
  delete from public.envelope_contents;
  insert into public.envelope_contents (envelope_id, outcome_label, entered_by)
  select key, value, p_actor from jsonb_each_text(p_map);
end;
$$;

-- Records the deal ("envelopes shuffled and dealt face down"): which finalist holds which number.
-- Can be redone until the first Force Field, winner or choice.
create or replace function public.r3_deal(p_map jsonb, p_actor uuid)
returns void
language plpgsql
as $$
declare
  v_final integer;
begin
  if (select phase from public.event_state) <> 'round3' then
    raise exception 'not_round3' using hint = 'Switch the event to Round 3 · The Doomsday Vault first.';
  end if;
  if exists (select 1 from public.missions where winner_agency_id is not null or choice is not null)
     or exists (select 1 from public.force_fields where voided_at is null) then
    raise exception 'missions_started' using hint = 'Missions have started; the deal is fixed.';
  end if;
  select count(*) into v_final from public.agencies where status = 'active';
  if (select count(*) from jsonb_each_text(p_map) m
        join public.agencies a on a.id = m.key and a.status = 'active'
        join public.envelopes e on e.id = m.value) <> v_final
     or (select count(*) from jsonb_object_keys(p_map)) <> v_final
     or (select count(distinct value) from jsonb_each_text(p_map)) <> v_final then
    raise exception 'bad_deal' using hint = 'Give every finalist a different envelope.';
  end if;
  update public.envelope_moves set voided_at = clock_timestamp() where voided_at is null;
  insert into public.envelope_moves (envelope_id, to_agency, kind, created_by)
  select value, key, 'deal', p_actor from jsonb_each_text(p_map);
end;
$$;

-- Moves the vault to a mission and step: force_field → play → results → choice → chai.
-- Mission 4's choice moves to the start of Zero Hour, with no Chai Pe Charcha.
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
  update public.event_state set current_mission = p_mission, step = p_step;
end;
$$;

-- "Force Field: window open for this mission; fund ≥ 5 → force_fields row + ledger −5."
create or replace function public.r3_force_field(p_agency text, p_actor uuid)
returns void
language plpgsql
as $$
declare
  v   public.event_state%rowtype;
  led bigint;
begin
  select * into v from public.event_state;
  if v.phase <> 'round3' or v.step is distinct from 'force_field' or v.current_mission is null then
    raise exception 'window_closed' using hint = 'Force Fields are bought only in a mission''s Force Field window.';
  end if;
  perform public.lock_active_agency(p_agency);
  if not exists (select 1 from public.v_envelope_holders where holder_agency_id = p_agency) then
    raise exception 'no_envelope' using hint = format('%s holds no Mission File.', p_agency);
  end if;
  if exists (select 1 from public.force_fields where agency_id = p_agency and mission = v.current_mission and voided_at is null) then
    raise exception 'already_protected' using hint = format('%s already has a Force Field for mission %s.', p_agency, v.current_mission);
  end if;
  if public.fund_left(p_agency) < 5 then
    raise exception 'insufficient_fund' using hint = format('%s needs ₹5 Cr for a Force Field.', p_agency);
  end if;
  insert into public.ledger_entries (agency_id, amount, reason, ref, note, created_by)
  values (p_agency, -5, 'force_field', 'mission:' || v.current_mission, 'Force Field, mission ' || v.current_mission, p_actor)
  returning id into led;
  insert into public.force_fields (agency_id, mission, ledger_entry_id, created_by) values (p_agency, v.current_mission, led, p_actor);
end;
$$;

-- Scorers' decision: the first fully correct sheet, or no winner (null).
create or replace function public.r3_set_winner(p_mission integer, p_agency text, p_actor uuid)
returns void
language plpgsql
as $$
declare
  m public.missions%rowtype;
begin
  if (select phase from public.event_state) not in ('round3', 'zero_hour') then raise exception 'not_round3'; end if;
  select * into m from public.missions where no = p_mission for update;
  if not found then raise exception 'no_mission'; end if;
  if m.choice in ('swap', 'xray', 'cash') then
    raise exception 'choice_made' using hint = 'Undo the winner''s choice first.';
  end if;
  if p_agency is null then
    update public.missions set winner_agency_id = null, choice = 'none', swap_target = null, decided_at = clock_timestamp()
     where no = p_mission;
    return;
  end if;
  if not exists (select 1 from public.v_envelope_holders where holder_agency_id = p_agency) then
    raise exception 'not_finalist' using hint = format('%s holds no Mission File.', p_agency);
  end if;
  update public.missions set winner_agency_id = p_agency, choice = null, swap_target = null, decided_at = null
   where no = p_mission;
end;
$$;

-- "Winner's choice: Swap (target has no Force Field this mission → swap holders + log),
-- X-Ray (secret log), or Cash (ledger +6)."
create or replace function public.r3_choose(p_mission integer, p_choice text, p_target text, p_actor uuid)
returns void
language plpgsql
as $$
declare
  v      public.event_state%rowtype;
  m      public.missions%rowtype;
  env_w  text;
  env_t  text;
  g      uuid := gen_random_uuid();
begin
  select * into v from public.event_state for update;
  select * into m from public.missions where no = p_mission for update;
  if not found then raise exception 'no_mission'; end if;
  if m.winner_agency_id is null then raise exception 'no_winner' using hint = 'Enter the mission winner first.'; end if;
  if m.choice is not null then raise exception 'choice_made' using hint = 'This mission''s choice is already made.'; end if;
  if exists (select 1 from public.reveals) then raise exception 'reveal_started'; end if;
  if p_mission < 4 and (v.phase <> 'round3' or v.current_mission is distinct from p_mission or v.step is distinct from 'choice') then
    raise exception 'not_choice_window' using hint = format('Move to mission %s, Winner''s choice first.', p_mission);
  end if;
  if p_mission = 4 and v.phase <> 'zero_hour' then
    raise exception 'mission4_at_zero_hour' using hint = 'Mission 4''s choice is made at the start of Zero Hour.';
  end if;

  if p_choice in ('swap', 'xray') then
    if p_target is null or p_target = m.winner_agency_id then
      raise exception 'bad_target' using hint = 'Pick another finalist.';
    end if;
    select envelope_id into env_t from public.v_envelope_holders where holder_agency_id = p_target;
    if env_t is null then raise exception 'bad_target' using hint = format('%s holds no Mission File.', p_target); end if;
  end if;

  if p_choice = 'swap' then
    if exists (select 1 from public.force_fields where agency_id = p_target and mission = p_mission and voided_at is null) then
      raise exception 'target_protected' using hint = format('%s has a Force Field this mission.', p_target);
    end if;
    select envelope_id into env_w from public.v_envelope_holders where holder_agency_id = m.winner_agency_id;
    insert into public.envelope_moves (envelope_id, mission, from_agency, to_agency, kind, move_group, created_by) values
      (env_w, p_mission, m.winner_agency_id, p_target, 'swap', g, p_actor),
      (env_t, p_mission, p_target, m.winner_agency_id, 'swap', g, p_actor);
    update public.missions set choice = 'swap', swap_target = p_target, decided_at = clock_timestamp() where no = p_mission;
  elsif p_choice = 'xray' then
    insert into public.xray_log (mission, agency_id, target_agency_id, created_by) values (p_mission, m.winner_agency_id, p_target, p_actor);
    update public.missions set choice = 'xray', decided_at = clock_timestamp() where no = p_mission;
  elsif p_choice = 'cash' then
    perform 1 from public.agencies where id = m.winner_agency_id for update;
    insert into public.ledger_entries (agency_id, amount, reason, ref, note, created_by)
    values (m.winner_agency_id, 6, 'mission_cash', 'mission:' || p_mission, 'Mission ' || p_mission || ' cash', p_actor);
    update public.missions set choice = 'cash', decided_at = clock_timestamp() where no = p_mission;
  else
    raise exception 'bad_choice';
  end if;
end;
$$;

-- Corrects a wrongly entered choice before the reveal: a swap is voided, cash is voided.
-- (An X-Ray cannot be un-seen; its log row stays.)
create or replace function public.r3_undo_choice(p_mission integer, p_actor uuid)
returns void
language plpgsql
as $$
declare
  m   public.missions%rowtype;
  led bigint;
begin
  if exists (select 1 from public.reveals) then raise exception 'reveal_started'; end if;
  select * into m from public.missions where no = p_mission for update;
  if m.choice is null or m.choice = 'none' then raise exception 'nothing_to_undo'; end if;
  if m.choice = 'swap' then
    update public.envelope_moves set voided_at = clock_timestamp()
     where mission = p_mission and kind = 'swap' and voided_at is null;
  elsif m.choice = 'cash' then
    select id into led from public.v_ledger
     where reason = 'mission_cash' and ref = 'mission:' || p_mission and not voided order by id desc limit 1;
    if led is not null then perform public.ledger_void(led, 'Mission choice corrected', p_actor); end if;
  end if;
  update public.missions set choice = null, swap_target = null, decided_at = null where no = p_mission;
end;
$$;

-- "Transfer: Chai Pe Charcha window; payer fund ≥ amount; 0.5 steps → two ledger entries, one transaction."
create or replace function public.r3_transfer(p_from text, p_to text, p_amount numeric, p_note text, p_actor uuid)
returns uuid
language plpgsql
as $$
declare
  v   public.event_state%rowtype;
  txn uuid := gen_random_uuid();
begin
  select * into v from public.event_state;
  if v.phase <> 'round3' or v.step is distinct from 'chai' or v.current_mission not between 1 and 3 then
    raise exception 'window_closed' using hint = 'Transfers happen only in a Chai Pe Charcha window (missions 1–3).';
  end if;
  if p_from = p_to then raise exception 'same_agency'; end if;
  if p_amount is null or p_amount <= 0 or not public.is_half_step(p_amount) then
    raise exception 'bad_step' using hint = 'Transfers move in ₹0.5 Cr steps.';
  end if;
  -- Lock both agencies in a fixed order so two simultaneous deals cannot deadlock.
  perform public.lock_active_agency(least(p_from, p_to));
  perform public.lock_active_agency(greatest(p_from, p_to));
  if public.fund_left(p_from) < p_amount then
    raise exception 'insufficient_fund' using hint = format('%s has only ₹%s Cr.', p_from, public.fund_left(p_from));
  end if;
  insert into public.ledger_entries (agency_id, amount, reason, ref, note, txn_id, created_by) values
    (p_from, -p_amount, 'transfer', 'to:' || p_to, nullif(btrim(coalesce(p_note, '')), ''), txn, p_actor),
    (p_to, p_amount, 'transfer', 'from:' || p_from, nullif(btrim(coalesce(p_note, '')), ''), txn, p_actor);
  return txn;
end;
$$;

-- "Fine: — → ledger −5" (opening another agency's Mission File).
create or replace function public.r3_fine(p_agency text, p_note text, p_actor uuid)
returns void
language plpgsql
as $$
begin
  if (select phase from public.event_state) not in ('round3', 'zero_hour') then raise exception 'not_round3'; end if;
  perform public.lock_active_agency(p_agency);
  insert into public.ledger_entries (agency_id, amount, reason, ref, note, created_by)
  values (p_agency, -5, 'fine', 'fine', coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'Opened another agency''s Mission File'), p_actor);
end;
$$;

-- ================================================================ Zero Hour

-- "The anchor clicks Next; the server writes a reveals row." Envelopes open in ascending Power
-- Level (ties: agency ID). Mission 4's choice must be made first.
create or replace function public.zh_next_reveal(p_actor uuid)
returns text
language plpgsql
as $$
declare
  v_env text;
  m4    public.missions%rowtype;
begin
  perform 1 from public.event_state for update;
  if (select phase from public.event_state) <> 'zero_hour' then
    raise exception 'not_zero_hour' using hint = 'Switch the event to Zero Hour first.';
  end if;
  if (select count(*) from public.envelope_contents) <> 8 then
    raise exception 'multipliers_missing' using hint = 'An admin must enter the envelope multipliers first.';
  end if;
  select * into m4 from public.missions where no = 4;
  if m4.winner_agency_id is not null and m4.choice is null then
    raise exception 'mission4_choice_pending' using hint = 'Mission 4''s winner makes the last choice first.';
  end if;
  select h.envelope_id into v_env
    from public.v_envelope_holders h
    join public.v_power_level p on p.agency_id = h.holder_agency_id
   where h.holder_agency_id is not null
     and not exists (select 1 from public.reveals r where r.envelope_id = h.envelope_id)
   order by p.power_level asc, h.holder_agency_id asc
   limit 1;
  if v_env is null then raise exception 'all_revealed' using hint = 'Every envelope is open.'; end if;
  insert into public.reveals (envelope_id, reveal_order, created_by)
  values (v_env, (select count(*) + 1 from public.reveals), p_actor);
  return v_env;
end;
$$;

-- ================================================================ reset for the real event

-- Clears everything the event produced (answers, ledger, sales, tips, duels, towers, envelopes,
-- Force Fields, X-Rays, reveals) and puts the questions, news and missions back to unused.
-- Keeps settings, crew and the audit log. With p_keep_registrations the agencies, founders and
-- PINs stay (back to "registered"); without it they are deleted too.
create or replace function public.admin_reset_event(p_keep_registrations boolean, p_actor uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('doomsday.allow_reset', 'on', true);
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
    update public.agencies set status = 'registered', eliminated_in = null, checked_in_at = null;
    update public.agency_auth set failed_attempts = 0, locked_until = null, first_login_at = null;
  else
    -- TRUNCATE (allowed by the reset switch) skips the founders lock that refuses row deletes
    -- after registration closes.
    set constraints public.agencies_have_three_founders, public.founders_exactly_three immediate;
    truncate public.agency_sessions, public.agency_auth, public.founders;
    delete from public.agencies;
  end if;
end;
$$;

-- ================================================================ lockdown

do $$
declare
  f text;
begin
  foreach f in array array[
    'round2_state()', 'r2_draw_pairings()', 'r2_set_votes(integer, integer, integer, text)',
    'r2_save_tower(text, integer, integer, integer, integer, integer, uuid)', 'r2_publish(text[], uuid)',
    'r3_set_envelope_contents(jsonb, uuid)', 'r3_deal(jsonb, uuid)', 'r3_set_mission(integer, text)',
    'r3_force_field(text, uuid)', 'r3_set_winner(integer, text, uuid)', 'r3_choose(integer, text, text, uuid)',
    'r3_undo_choice(integer, uuid)', 'r3_transfer(text, text, numeric, text, uuid)', 'r3_fine(text, text, uuid)',
    'zh_next_reveal(uuid)', 'admin_reset_event(boolean, uuid)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end;
$$;
