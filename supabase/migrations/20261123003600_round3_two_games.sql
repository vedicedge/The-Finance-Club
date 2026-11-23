-- Doomsday — 23 November: Round 3 has only two mini games. As soon as mini game 2 is recorded,
-- games 3 and 4 are recorded as "no winner" automatically (nothing changes for any team), so the
-- consoles move straight on to Zero Hour. Undoing game 2 clears them again. Safe to run more than once.

create or replace function public.r3_two_games_only()
returns trigger
language plpgsql
as $$
begin
  if new.no = 2 and new.choice is not null and old.choice is null then
    update public.missions
       set winner_agency_id = null, choice = 'none', swap_target = null, ff_blocked = false, decided_at = clock_timestamp()
     where no in (3, 4) and choice is null;
  end if;
  return null;
end;
$$;

drop trigger if exists r3_two_games_only on public.missions;
create trigger r3_two_games_only after update of choice on public.missions
  for each row execute function public.r3_two_games_only();

create or replace function public.r3_undo_minigame(p_mission integer, p_actor uuid)
returns void
language plpgsql
as $$
declare
  m   public.missions%rowtype;
  led bigint;
begin
  perform 1 from public.event_state where id for update;
  if exists (select 1 from public.reveals) then
    raise exception 'reveal_started' using hint = 'The results are calculated; Round 3 is final.';
  end if;
  select * into m from public.missions where no = p_mission for update;
  if m.choice is null then raise exception 'nothing_to_undo' using hint = 'That mini game is not recorded.'; end if;
  -- Games 3 and 4 were filled in automatically as "no winner" (two-game Round 3): they don't block an undo.
  if exists (select 1 from public.missions where no > p_mission and choice is not null and not (no > 2 and choice = 'none')) then
    raise exception 'later_mission' using hint = 'Undo the later mini games first.';
  end if;
  if m.choice = 'swap' and not m.ff_blocked then
    update public.envelope_moves set voided_at = clock_timestamp()
     where mission = p_mission and kind = 'swap' and voided_at is null;
  elsif m.choice = 'swap' and m.ff_blocked then
    update public.force_fields set used_at = null
     where agency_id = m.swap_target and mission is null and voided_at is null and used_at is not null;
  elsif m.choice = 'cash' then
    select id into led from public.v_ledger
     where reason = 'mission_cash' and ref = 'mission:' || p_mission and not voided order by id desc limit 1;
    if led is not null then perform public.ledger_void(led, 'Mini game result corrected', p_actor); end if;
  end if;
  update public.missions set winner_agency_id = null, choice = null, swap_target = null, ff_blocked = false, decided_at = null
   where no = p_mission;
  -- Undoing game 2 (or 1) also clears the automatic "no winner" for games 3 and 4.
  if p_mission <= 2 then
    update public.missions set winner_agency_id = null, choice = null, swap_target = null, ff_blocked = false, decided_at = null
     where no > 2 and choice = 'none';
  end if;
end;
$$;

revoke all on function public.r3_two_games_only() from public, anon, authenticated;
revoke all on function public.r3_undo_minigame(integer, uuid) from public, anon, authenticated;
grant execute on function public.r3_undo_minigame(integer, uuid) to service_role;

-- ---------------------------------------------------------------- version

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261123003600'::text $$;

revoke all on function public.schema_version() from public, anon, authenticated;
grant execute on function public.schema_version() to service_role;
