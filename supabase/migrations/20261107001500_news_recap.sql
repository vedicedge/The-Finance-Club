-- Breaking News recap on the projector (organisers' request, 7 Nov 2026).
--
-- At the end of Power Bazaar an organiser can put every revealed Breaking News headline and
-- every Team-Up on the auction projector at once, with who holds the cards involved, so all
-- agencies can check their Power Levels. It is only allowed once all 6 drawn headlines and the
-- Team-Ups are revealed (locking Round 1 reveals any left), so nothing secret reaches a screen.

alter table public.event_state add column if not exists r1_screen text check (r1_screen in ('news_recap'));

-- ---------------------------------------------------------------- show / hide the recap

create or replace function public.r1_show_news_recap(p_on boolean)
returns void
language plpgsql
as $$
begin
  if (select phase from public.event_state where id) <> 'round1' then
    raise exception 'not_round1' using hint = 'The recap is for the Power Bazaar projector, in Round 1.';
  end if;
  if p_on then
    if not exists (select 1 from public.breaking_news where draw_order is not null) then
      raise exception 'news_not_drawn' using hint = 'Enter the 6 drawn Breaking News cards first.';
    end if;
    if exists (select 1 from public.breaking_news where draw_order is not null and revealed_at is null)
       or exists (select 1 from public.team_ups where revealed_at is null) then
      raise exception 'news_not_all_revealed'
        using hint = 'Reveal every headline and the Team-Ups first (Breaking News step), or lock Round 1, which reveals the rest.';
    end if;
  end if;
  update public.event_state set r1_screen = case when p_on then 'news_recap' end where id;
end;
$$;

-- ---------------------------------------------------------------- reset also clears the new fields

-- Same as in 20261106001300_where_clauses.sql, plus tips_closes_at and r1_screen cleared.
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
    update public.agency_auth set failed_attempts = 0, locked_until = null, first_login_at = null where true;
  else
    truncate public.agency_sessions, public.agency_auth, public.founders;
    delete from public.agencies where true;
  end if;
  set constraints public.agencies_have_three_founders, public.founders_exactly_three deferred;
end;
$$;

-- ---------------------------------------------------------------- lockdown

do $$
declare
  f text;
begin
  foreach f in array array['r1_show_news_recap(boolean)', 'admin_reset_event(boolean, uuid)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end;
$$;
