-- 15 November: the prelim's red alert. If the website quiz fails on the day, the quiz host
-- switches the prelim to a backup quiz on Kahoot. Phones and the projector then show where to
-- go; the host uploads Kahoot's results, which become the prelim board, and the top 16 are frozen
-- as usual. Safe to run more than once.

alter table public.event_state add column if not exists prelim_kahoot boolean not null default false;
alter table public.event_state add column if not exists prelim_kahoot_pin text;

create table if not exists public.prelim_kahoot_results (
  agency_id   text primary key references public.agencies (id) on delete cascade,
  kahoot_rank integer not null check (kahoot_rank > 0),
  score       integer not null check (score >= 0),
  correct     integer,
  player      text,
  uploaded_at timestamptz not null default clock_timestamp()
);
alter table public.prelim_kahoot_results enable row level security;
revoke all on table public.prelim_kahoot_results from public, anon, authenticated;
grant all on table public.prelim_kahoot_results to service_role;

-- Red alert on (with the Kahoot game PIN) or off again (only before the top 16 are frozen).
create or replace function public.prelim_set_kahoot(p_on boolean, p_pin text, p_actor uuid)
returns void
language plpgsql
as $$
declare
  v public.event_state%rowtype;
begin
  select * into v from public.event_state where id for update;
  if v.phase not in ('checkin', 'prelim') then
    raise exception 'not_prelim' using hint = 'The red alert is for the prelim.';
  end if;
  if v.prelim_frozen_at is not null then
    raise exception 'already_frozen' using hint = 'The top 16 are already frozen.';
  end if;
  if p_on then
    -- The website quiz stops: a question still running is closed.
    update public.questions set status = 'closed', closed_at = coalesce(closed_at, clock_timestamp()) where status = 'open';
    update public.event_state
       set prelim_kahoot = true, prelim_kahoot_pin = nullif(btrim(coalesce(p_pin, '')), ''),
           updated_at = clock_timestamp(), updated_by = p_actor
     where id;
  else
    update public.event_state
       set prelim_kahoot = false, prelim_published_at = null, updated_at = clock_timestamp(), updated_by = p_actor
     where id;
  end if;
end;
$$;

-- Kahoot's final ranking, matched to agencies by the site. Replaces any earlier upload.
create or replace function public.prelim_save_kahoot(p_rows jsonb, p_actor uuid)
returns integer
language plpgsql
as $$
declare
  v public.event_state%rowtype;
  n integer;
begin
  select * into v from public.event_state where id for update;
  if not v.prelim_kahoot then
    raise exception 'kahoot_off' using hint = 'Turn on the red alert first.';
  end if;
  if v.prelim_frozen_at is not null then
    raise exception 'already_frozen' using hint = 'The top 16 are already frozen.';
  end if;
  delete from public.prelim_kahoot_results where true;
  insert into public.prelim_kahoot_results (agency_id, kahoot_rank, score, correct, player)
  select r.agency_id, r.kahoot_rank, r.score, r.correct, r.player
    from jsonb_to_recordset(p_rows) as r(agency_id text, kahoot_rank integer, score integer, correct integer, player text)
    join public.agencies a on a.id = r.agency_id;
  get diagnostics n = row_count;
  -- A new upload must be published again.
  update public.event_state set prelim_published_at = null, step = null where id;
  return n;
end;
$$;

-- Publishes the Kahoot ranking as the prelim board (the projector shows it).
create or replace function public.prelim_kahoot_publish()
returns void
language plpgsql
as $$
begin
  perform 1 from public.event_state where id for update;
  if not (select prelim_kahoot from public.event_state where id) then
    raise exception 'kahoot_off' using hint = 'Turn on the red alert first.';
  end if;
  if not exists (select 1 from public.prelim_kahoot_results) then
    raise exception 'no_results' using hint = 'Upload the Kahoot results first.';
  end if;
  update public.event_state set prelim_published_at = coalesce(prelim_published_at, clock_timestamp()), step = 'board' where id;
end;
$$;

create or replace function public.admin_reset_event(p_keep_registrations boolean, p_actor uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('doomsday.allow_reset', 'on', true);
  set constraints public.agencies_have_three_founders, public.founders_exactly_three immediate;
  truncate public.answers, public.prelim_tiebreaks, public.ledger_voids, public.sales, public.insider_tips,
           public.force_fields, public.envelope_moves, public.xray_log, public.reveals, public.poster_duels,
           public.tower_results, public.envelope_contents, public.blind_bids, public.prelim_kahoot_results, public.ledger_entries;
  update public.missions set winner_agency_id = null, choice = null, swap_target = null, decided_at = null, ff_blocked = false where true;
  update public.event_state
     set phase = 'registration', step = null, current_question_id = null, current_card_id = null,
         current_mission = null, prelim_published_at = null, prelim_frozen_at = null, round1_locked_at = null,
         round2_published_at = null, alert = null, tips_closes_at = null, r1_screen = null,
         bid_card_id = null, bid_closes_at = null, bid_settled_at = null, ff_closes_at = null,
         prelim_kahoot = false, prelim_kahoot_pin = null,
         updated_at = clock_timestamp(), updated_by = p_actor where id;
  update public.questions
     set status = 'pending', order_no = null, replaces_id = null, opened_at = null, closed_at = null, revealed_at = null where true;
  update public.breaking_news set draw_order = null, revealed_at = null where true;
  update public.team_ups set revealed_at = null where true;
  update public.gear_cards set lot_order = null where true;

  if p_keep_registrations then
    delete from public.agencies where is_test; -- founders, PINs and sessions go with them
    update public.agencies set status = 'registered', eliminated_in = null, checked_in_at = null where true;
    update public.agency_auth set failed_attempts = 0, locked_until = null where true;
  else
    truncate public.agency_sessions, public.agency_auth, public.founders;
    delete from public.agencies where true;
  end if;
  set constraints public.agencies_have_three_founders, public.founders_exactly_three deferred;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['prelim_set_kahoot(boolean, text, uuid)', 'prelim_save_kahoot(jsonb, uuid)', 'prelim_kahoot_publish()', 'admin_reset_event(boolean, uuid)']
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
as $$ select '20261115002800'::text $$;
