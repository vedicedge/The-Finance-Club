-- Doomsday — 23 November: the poster duel is dropped. Round 2 is the cup tower only: publishing
-- needs every tower result and nothing else, and no poster bonus is paid. Safe to run more than once.

create or replace function public.r2_publish(p_qualifiers text[], p_actor uuid, p_top integer default 8)
returns void
language plpgsql
as $$
declare
  v_active   integer;
  v_missing  text;
  v_undec    text;
begin
  if p_top not in (8, 10) then raise exception 'bad_qualifiers' using hint = 'Send the top 8 or the top 10.'; end if;
  perform 1 from public.event_state for update;
  perform public.round2_state();
  select count(*) into v_active from public.agencies where status = 'active';
  select string_agg(a.id, ', ' order by a.id) into v_missing
    from public.agencies a
   where a.status = 'active' and not exists (select 1 from public.tower_results t where t.agency_id = a.id);
  if v_missing is not null then
    raise exception 'tower_missing' using hint = format('No tower result yet for %s.', v_missing);
  end if;
  -- No poster duels any more (organisers, 23 Nov): publishing needs only the tower results.
  if coalesce(array_length(p_qualifiers, 1), 0) <> least(p_top, v_active)
     or (select count(*) from public.agencies where status = 'active' and id = any (p_qualifiers)) <> least(p_top, v_active) then
    raise exception 'bad_qualifiers';
  end if;

  -- Any duels that were drawn before the change are ignored: no poster bonus is paid.

  update public.agencies set status = 'eliminated', eliminated_in = 'round2'
   where status = 'active' and not (id = any (p_qualifiers));
  update public.tower_results set published = true where true;
  update public.event_state set round2_published_at = clock_timestamp() where id;
end;
$$;

revoke all on function public.r2_publish(text[], uuid, integer) from public, anon, authenticated;
grant execute on function public.r2_publish(text[], uuid, integer) to service_role;

-- ---------------------------------------------------------------- version

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261123003500'::text $$;

revoke all on function public.schema_version() from public, anon, authenticated;
grant execute on function public.schema_version() to service_role;
