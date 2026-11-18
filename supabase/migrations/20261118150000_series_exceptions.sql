-- Repeating classes: a class that was moved, edited on its own, or cancelled
-- stays that way when the whole series is changed (like Google Calendar).
--
--   * the cancelled marker left behind by a move/cancel is kept while its series exists
--   * a series day with such a marker, or an individually edited class, isn't refilled

create or replace function private.sync_sessions(p_days integer default 120)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.sessions s
  where s.auto
    and s.starts_at > now()
    and not exists (select 1 from public.attendance a where a.session_id = s.id)
    and case
      -- markers for moved / cancelled classes: kept while their series exists
      when s.cancelled then not exists (select 1 from public.timetable t where t.id = s.timetable_id)
      -- generated classes that no longer fit their series
      else not exists (
        select 1 from public.timetable t
        where t.id = s.timetable_id
          and (s.starts_at at time zone t.tz)::time = t.start_time
          and s.duration_min = t.duration_min
          and private.series_day_ok(t, (s.starts_at at time zone t.tz)::date)
      )
    end;

  -- a series' new name or topic reaches its upcoming classes
  update public.sessions s
  set title = coalesce(nullif(t.title, ''), coalesce(nullif(c.subject, ''), 'Live') || ' class'),
      unit = nullif(t.unit, '')
  from public.timetable t
  join public.cohorts c on c.id = t.cohort_id
  where s.timetable_id = t.id
    and s.auto
    and s.starts_at > now()
    and (s.title is distinct from coalesce(nullif(t.title, ''), coalesce(nullif(c.subject, ''), 'Live') || ' class')
         or s.unit is distinct from nullif(t.unit, ''));

  insert into public.sessions (cohort_id, title, unit, starts_at, duration_min, timetable_id, auto)
  select t.cohort_id,
         coalesce(nullif(t.title, ''), coalesce(nullif(c.subject, ''), 'Live') || ' class'),
         nullif(t.unit, ''),
         (d.day + t.start_time) at time zone t.tz,
         t.duration_min,
         t.id,
         true
  from public.timetable t
  join public.cohorts c on c.id = t.cohort_id
  cross join lateral (
    select g::date as day
    from generate_series((now() at time zone t.tz)::date,
                         (now() at time zone t.tz)::date + p_days, interval '1 day') g
  ) d
  where c.archived_at is null
    and private.series_day_ok(t, d.day)
    and ((d.day + t.start_time) at time zone t.tz) + make_interval(mins => t.duration_min) > now()
    -- that day's class was moved, cancelled or edited on its own
    and not exists (
      select 1 from public.sessions x
      where x.timetable_id = t.id
        and (x.cancelled or not x.auto)
        and (x.starts_at at time zone t.tz)::date = d.day
    )
  on conflict (cohort_id, starts_at) do nothing;
end;
$$;

-- "this and following": the old series' moved/cancelled classes from that day on go too
do $$
declare d text;
begin
  d := pg_get_functiondef('public.update_series(uuid, text, date, text, text, time, integer, integer[], integer, date)'::regprocedure);
  d := replace(d,
    'and t.series_id = p_series
      and not s.auto',
    'and t.series_id = p_series
      and (not s.auto or s.cancelled)');
  if position('(not s.auto or s.cancelled)' in d) = 0 then
    raise exception 'update_series: clause not found';
  end if;
  execute d;
end $$;

select private.sync_sessions(120);
