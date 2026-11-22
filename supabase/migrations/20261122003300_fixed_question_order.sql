-- Doomsday — 22 November: no shuffling. The 15 live questions play in a fixed order: category by
-- category (Marvel Ya DC?, Teen Clue, Share Bazaar, Hero Ka Business), and within a category by
-- question number (M1, M2, M3 …). The button keeps its job: it fixes that order before question 1.
-- Safe to run more than once.

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
    from (select id, row_number() over (
                   order by public.quiz_segment_order(segment),
                            coalesce(nullif(regexp_replace(id, '\D', '', 'g'), '')::integer, 0), id)::smallint as rn
            from public.questions
           where is_live and status = 'pending' and segment <> 'sudden_death') s
   where q.id = s.id;
end;
$$;

revoke all on function public.quiz_shuffle() from public, anon, authenticated;
grant execute on function public.quiz_shuffle() to service_role;

-- ---------------------------------------------------------------- version

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261122003300'::text $$;

revoke all on function public.schema_version() from public, anon, authenticated;
grant execute on function public.schema_version() to service_role;
