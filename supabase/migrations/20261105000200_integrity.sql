-- Doomsday — integrity rules the database enforces on its own, whatever code path writes.
--
--   1. Every agency has exactly 3 founders and exactly 1 captain (checked at commit).
--   2. Founders are locked once registration closes.
--   3. The ledger, its voids, answers, X-Ray log, reveals, predictions and the audit log are
--      insert-only. Sales, tips, Force Fields and envelope moves can only be voided (once).
--   4. Voiding a ledger entry voids the rows linked to it and the other legs of its transaction.
--   5. TRUNCATE is refused unless the deliberate reset function turns it on.

-- ---------------------------------------------------------------- 1. exactly 3 founders

create or replace function public.check_agency_founders()
returns trigger
language plpgsql
as $$
declare
  v_agency text;
  v_count  integer;
  v_capt   integer;
begin
  if tg_table_name = 'agencies' then
    v_agency := new.id;
  elsif tg_op = 'DELETE' then
    v_agency := old.agency_id;
  else
    v_agency := new.agency_id;
  end if;

  -- The agency itself may have been deleted in the same transaction (cascade); nothing to check.
  if not exists (select 1 from public.agencies where id = v_agency) then
    return null;
  end if;

  select count(*), count(*) filter (where is_captain)
    into v_count, v_capt
    from public.founders
   where agency_id = v_agency;

  if v_count <> 3 then
    raise exception 'Agency % must have exactly 3 founders (has %)', v_agency, v_count
      using errcode = 'check_violation';
  end if;
  if v_capt <> 1 then
    raise exception 'Agency % must have exactly 1 captain (has %)', v_agency, v_capt
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create constraint trigger agencies_have_three_founders
  after insert on public.agencies
  deferrable initially deferred
  for each row execute function public.check_agency_founders();

create constraint trigger founders_exactly_three
  after insert or update or delete on public.founders
  deferrable initially deferred
  for each row execute function public.check_agency_founders();

-- ---------------------------------------------------------------- 2. founders lock

-- Registration is open while the event is in the registration phase and before the deadline.
create or replace function public.registration_is_open()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select s.phase = 'registration'
            and coalesce((s.settings #>> '{registration,open}')::boolean, true)
            and clock_timestamp() < coalesce((s.settings #>> '{registration,closes_at}')::timestamptz,
                                             'infinity'::timestamptz)
       from public.event_state s),
    true)
$$;

create or replace function public.guard_founders_lock()
returns trigger
language plpgsql
as $$
begin
  if not public.registration_is_open() then
    raise exception 'Founders are locked: registration has closed'
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger founders_locked_after_registration
  before update or delete on public.founders
  for each row execute function public.guard_founders_lock();

-- ---------------------------------------------------------------- 3. append-only

create or replace function public.forbid_change()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only: % is not allowed (write a new entry or a void instead)',
    tg_table_name, tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

-- Rows that can only change by being voided, once. Nothing else about them may change.
create or replace function public.allow_void_only()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception '% rows are never deleted; void them instead', tg_table_name
      using errcode = 'insufficient_privilege';
  end if;
  if old.voided_at is not null then
    raise exception '% row % is already void', tg_table_name, old.id
      using errcode = 'insufficient_privilege';
  end if;
  if new.voided_at is null
     or (to_jsonb(new) - 'voided_at') is distinct from (to_jsonb(old) - 'voided_at') then
    raise exception '% rows can only be voided, not edited', tg_table_name
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['ledger_entries', 'ledger_voids', 'answers', 'xray_log', 'reveals',
                           'predictions', 'audit_log']
  loop
    execute format(
      'create trigger %1$s_append_only before update or delete on public.%1$I
         for each row execute function public.forbid_change()', t);
  end loop;

  foreach t in array array['sales', 'insider_tips', 'force_fields', 'envelope_moves']
  loop
    execute format(
      'create trigger %1$s_void_only before update or delete on public.%1$I
         for each row execute function public.allow_void_only()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------- 4. void cascade

create or replace function public.cascade_ledger_void()
returns trigger
language plpgsql
as $$
declare
  v_txn uuid;
begin
  -- Rows linked to this entry become void with it.
  update public.sales        set voided_at = new.created_at where ledger_entry_id = new.entry_id and voided_at is null;
  update public.insider_tips set voided_at = new.created_at where ledger_entry_id = new.entry_id and voided_at is null;
  update public.force_fields set voided_at = new.created_at where ledger_entry_id = new.entry_id and voided_at is null;

  -- Other legs of the same transaction (e.g. both sides of a transfer) are voided too.
  select txn_id into v_txn from public.ledger_entries where id = new.entry_id;
  insert into public.ledger_voids (entry_id, reason, created_by)
  select e.id, new.reason, new.created_by
    from public.ledger_entries e
   where e.txn_id = v_txn
     and e.id <> new.entry_id
     and not exists (select 1 from public.ledger_voids v where v.entry_id = e.id);

  return null;
end;
$$;

create trigger ledger_voids_cascade
  after insert on public.ledger_voids
  for each row execute function public.cascade_ledger_void();

-- ---------------------------------------------------------------- 5. truncate guard

create or replace function public.guard_truncate()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('doomsday.allow_reset', true), '') <> 'on' then
    raise exception 'TRUNCATE on % is blocked; use the event reset function', tg_table_name
      using errcode = 'insufficient_privilege';
  end if;
  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['agencies', 'founders', 'agency_auth', 'agency_sessions', 'answers',
                           'prelim_tiebreaks', 'ledger_entries', 'ledger_voids', 'sales',
                           'insider_tips', 'poster_duels', 'tower_results', 'envelope_contents',
                           'envelope_moves', 'force_fields', 'xray_log', 'reveals', 'predictions',
                           'audit_log']
  loop
    execute format(
      'create trigger %1$s_no_truncate before truncate on public.%1$I
         for each statement execute function public.guard_truncate()', t);
  end loop;
end;
$$;
