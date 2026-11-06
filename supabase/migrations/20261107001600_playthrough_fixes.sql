-- Fixes from a full playthrough with 30 agencies on the real site (7 Nov 2026).
--
-- 1. Signing a phone in at registration now counts as the agency's first login, so a captain whose
--    phone dies (or who switches phones) during the prelim can sign in again with the PIN. Before,
--    only a PIN login counted, so most agencies would have been refused mid-prelim, and the dry-run
--    reset cleared the mark for everyone. Existing agencies get it from their earliest session.
-- 2. The reset that keeps registrations no longer clears it.
-- 3. Crediting the starting funds shuffles the lot order if nobody has, so the secret cards never
--    run in printed card order by accident.

-- ---------------------------------------------------------------- 1. sessions mark the first login

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
  update public.agency_auth set first_login_at = coalesce(first_login_at, clock_timestamp()) where agency_id = p_agency;
end;
$$;

update public.agency_auth a
   set first_login_at = s.first_at
  from (select agency_id, min(created_at) as first_at from public.agency_sessions group by agency_id) s
 where s.agency_id = a.agency_id and a.first_login_at is null;

-- ---------------------------------------------------------------- 2. reset keeps the first-login mark

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
         round2_published_at = null, alert = null, tips_closes_at = null, r1_screen = null,
         updated_at = clock_timestamp(), updated_by = p_actor where id;
  update public.questions
     set status = 'pending', order_no = null, replaces_id = null, opened_at = null, closed_at = null, revealed_at = null where true;
  update public.breaking_news set draw_order = null, revealed_at = null where true;
  update public.team_ups set revealed_at = null where true;
  update public.gear_cards set lot_order = null where true;

  if p_keep_registrations then
    delete from public.agencies where is_test; -- founders, PINs and sessions go with them
    update public.agencies set status = 'registered', eliminated_in = null, checked_in_at = null where true;
    -- Keep first_login_at: a real team that registered (or signed in) has logged in; the rehearsal
    -- must not turn it into a "new" agency that is refused a phone change during the prelim.
    update public.agency_auth set failed_attempts = 0, locked_until = null where true;
  else
    truncate public.agency_sessions, public.agency_auth, public.founders;
    delete from public.agencies where true;
  end if;
  set constraints public.agencies_have_three_founders, public.founders_exactly_three deferred;
end;
$$;

-- ---------------------------------------------------------------- 3. starting funds also shuffle the lots

create or replace function public.r1_start_funds(p_actor uuid)
returns integer
language plpgsql
as $$
declare
  v public.event_state%rowtype;
  n integer;
begin
  select * into v from public.event_state where id for update;
  perform public.round1_state();
  if v.prelim_frozen_at is null then
    raise exception 'prelim_not_frozen' using hint = 'Freeze the top 16 in the quiz console first.';
  end if;
  if exists (select 1 from public.v_ledger where reason = 'start_fund' and not voided) then
    raise exception 'already_started' using hint = 'Starting funds have already been credited.';
  end if;
  insert into public.ledger_entries (agency_id, amount, reason, ref, created_by)
  select id, 50, 'start_fund', 'round1', p_actor from public.agencies where status = 'active';
  get diagnostics n = row_count;
  -- The secret cards run in a shuffled order; do it now unless someone already has.
  if not exists (select 1 from public.gear_cards where lot_order is not null)
     and not exists (select 1 from public.sales where voided_at is null) then
    perform public.r1_shuffle_lots();
  end if;
  return n;
end;
$$;

-- ---------------------------------------------------------------- lockdown

do $$
declare
  f text;
begin
  foreach f in array array['create_agency_session(text, text, integer, boolean, text)', 'admin_reset_event(boolean, uuid)', 'r1_start_funds(uuid)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end;
$$;
