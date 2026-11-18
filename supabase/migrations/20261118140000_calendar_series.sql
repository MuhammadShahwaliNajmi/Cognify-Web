-- Google-Calendar-style repeating classes.
--
--   * A series is every timetable row sharing a series_id (one row per weekday).
--   * Custom days, "every N weeks", and an optional last day (ends_on).
--   * Classes are generated four months ahead (topped up daily), so a
--     series runs on until the teacher stops it; the calendar draws anything
--     further out from the rule itself.
--   * create_series / update_series / end_series give "this class", "this and
--     following" and "all classes" edits, like Google Calendar.

-- ---------- columns ----------
alter table public.timetable
  add column if not exists series_id uuid,
  add column if not exists every_weeks smallint not null default 1 check (every_weeks between 1 and 12),
  add column if not exists ends_on date;

-- existing rows: one series per student + start time + length + first day + name
update public.timetable t
set series_id = g.sid
from (
  select cohort_id, start_time, duration_min, starts_on, coalesce(title, '') as title_k, gen_random_uuid() as sid
  from public.timetable
  group by 1, 2, 3, 4, 5
) g
where t.series_id is null
  and t.cohort_id = g.cohort_id
  and t.start_time = g.start_time
  and t.duration_min = g.duration_min
  and t.starts_on is not distinct from g.starts_on
  and coalesce(t.title, '') = g.title_k;

alter table public.timetable
  alter column series_id set default gen_random_uuid(),
  alter column series_id set not null;

-- two series may now share a weekday and time (e.g. after "this and following")
alter table public.timetable drop constraint if exists timetable_cohort_id_weekday_start_time_key;
alter table public.timetable add constraint timetable_series_weekday_key unique (series_id, weekday);
alter table public.timetable add constraint timetable_ends_after_start check (ends_on is null or starts_on is null or ends_on >= starts_on);
create index if not exists timetable_cohort_id_idx on public.timetable (cohort_id);

-- ---------- does a series have a class on this day? ----------
create or replace function private.series_day_ok(t public.timetable, d date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select d >= coalesce(t.starts_on, d)
     and d <= coalesce(t.ends_on, d)
     and extract(isodow from d) = t.weekday
     and (
       t.every_weeks <= 1
       or (((d - (extract(isodow from d)::int - 1)) - (a.day - (extract(isodow from a.day)::int - 1))) / 7) % t.every_weeks = 0
     )
  from (select coalesce(t.starts_on, (t.created_at at time zone t.tz)::date) as day) a
$$;

-- ---------- generate classes from the timetable ----------
create or replace function private.sync_sessions(p_days integer default 120)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- upcoming generated classes that no longer fit their series
  delete from public.sessions s
  where s.auto
    and s.starts_at > now()
    and not exists (select 1 from public.attendance a where a.session_id = s.id)
    and not exists (
      select 1 from public.timetable t
      where t.id = s.timetable_id
        and (s.starts_at at time zone t.tz)::time = t.start_time
        and s.duration_min = t.duration_min
        and private.series_day_ok(t, (s.starts_at at time zone t.tz)::date)
    );

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
  on conflict (cohort_id, starts_at) do nothing;
end;
$$;

create or replace function private.timetable_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.sync_sessions(120);
  return null;
end;
$$;

select cron.schedule('sync-class-sessions', '5 0 * * *', 'select private.sync_sessions(120)');

-- ---------- a moved class stays part of its series ----------
do $$
declare d text;
begin
  d := pg_get_functiondef('public.reschedule_session(bigint, timestamptz, integer)'::regprocedure);
  d := replace(d,
    'insert into public.sessions (cohort_id, title, strand, unit, starts_at, duration_min, meet_url, auto)
    values (s.cohort_id, s.title, s.strand, s.unit, p_start, p_duration, s.meet_url, false)',
    'insert into public.sessions (cohort_id, title, strand, unit, starts_at, duration_min, meet_url, auto, timetable_id)
    values (s.cohort_id, s.title, s.strand, s.unit, p_start, p_duration, s.meet_url, false, s.timetable_id)');
  if position('false, s.timetable_id)' in d) = 0 then
    raise exception 'reschedule_session: insert not found';
  end if;
  execute d;

  -- the calendar needs each series' rule
  d := pg_get_functiondef('public.portal_snapshot()'::regprocedure);
  d := replace(d,
    'select cohort_id, weekday, start_time, duration_min from public.timetable',
    'select id, cohort_id, series_id, weekday, start_time, duration_min, title, unit, starts_on, ends_on, every_weeks from public.timetable');
  if position('every_weeks from public.timetable' in d) = 0 then
    raise exception 'portal_snapshot: timetable select not found';
  end if;
  execute d;
end $$;

-- ---------- helpers ----------
create or replace function private.series_rule_text(p_weekdays int[], p_every int, p_start time, p_duration int)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when coalesce(p_every, 1) > 1 then 'every ' || p_every || ' weeks on ' else 'every ' end
         || (select string_agg((array['Mon','Tue','Wed','Thu','Fri','Sat','Sun'])[w], ', ' order by w)
             from (select distinct unnest(p_weekdays) as w) x)
         || ' at ' || to_char(p_start, 'FMHH12:MI AM') || ' (' || p_duration || ' min)'
$$;

create or replace function private.check_series_input(p_weekdays int[], p_duration int, p_every int, p_from date, p_ends_on date)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_weekdays is null or cardinality(p_weekdays) = 0 then
    raise exception 'Choose at least one day';
  end if;
  if exists (select 1 from unnest(p_weekdays) w where w not between 1 and 7) then
    raise exception 'Choose days from Monday to Sunday';
  end if;
  if p_duration not between 5 and 720 then
    raise exception 'Class length must be between 5 minutes and 12 hours';
  end if;
  if coalesce(p_every, 1) not between 1 and 12 then
    raise exception 'Repeat every 1 to 12 weeks';
  end if;
  if p_ends_on is not null and p_from is not null and p_ends_on < p_from then
    raise exception 'The last day is before the first day';
  end if;
end $$;

-- ---------- create ----------
create or replace function public.create_series(
  p_cohort bigint,
  p_title text,
  p_unit text,
  p_starts_on date,
  p_start time,
  p_duration integer,
  p_weekdays integer[],
  p_every integer default 1,
  p_ends_on date default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare v_series uuid := gen_random_uuid();
begin
  if not private.teaches(p_cohort) then
    raise exception 'Only this student''s teacher can do this' using errcode = '42501';
  end if;
  if p_starts_on is null then
    raise exception 'Choose the first day';
  end if;
  perform private.check_series_input(p_weekdays, p_duration, p_every, p_starts_on, p_ends_on);

  insert into public.timetable (cohort_id, series_id, weekday, start_time, duration_min, title, unit, starts_on, every_weeks, ends_on)
  select p_cohort, v_series, x.w, p_start, p_duration,
         nullif(btrim(coalesce(p_title, '')), ''), nullif(btrim(coalesce(p_unit, '')), ''),
         p_starts_on, coalesce(p_every, 1), p_ends_on
  from (select distinct unnest(p_weekdays) as w) x;

  return v_series;
end $$;

-- ---------- edit: 'all' classes, or 'following' from a day on ----------
create or replace function public.update_series(
  p_series uuid,
  p_scope text,
  p_from date,
  p_title text,
  p_unit text,
  p_start time,
  p_duration integer,
  p_weekdays integer[],
  p_every integer default 1,
  p_ends_on date default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r public.timetable;
  v_first date;
  v_old_days int[];
  v_changed boolean;
  v_series uuid;
  v_today date;
begin
  select * into r from public.timetable where series_id = p_series order by id limit 1;
  if not found then
    raise exception 'This class doesn''t repeat any more';
  end if;
  if not private.teaches(r.cohort_id) then
    raise exception 'Only this student''s teacher can do this' using errcode = '42501';
  end if;
  v_first := coalesce(r.starts_on, (r.created_at at time zone r.tz)::date);
  v_today := (now() at time zone r.tz)::date;
  perform private.check_series_input(p_weekdays, p_duration, p_every, greatest(v_first, coalesce(p_from, v_first)), p_ends_on);

  select array_agg(weekday order by weekday) into v_old_days from public.timetable where series_id = p_series;
  v_changed := r.start_time <> p_start
            or r.duration_min <> p_duration
            or r.every_weeks <> coalesce(p_every, 1)
            or v_old_days <> (select array_agg(w order by w) from (select distinct unnest(p_weekdays) as w) x);

  if p_scope = 'all' or p_from is null or p_from <= v_first then
    delete from public.timetable where series_id = p_series and weekday <> all (p_weekdays);
    update public.timetable
    set start_time = p_start,
        duration_min = p_duration,
        title = nullif(btrim(coalesce(p_title, '')), ''),
        unit = nullif(btrim(coalesce(p_unit, '')), ''),
        every_weeks = coalesce(p_every, 1),
        ends_on = p_ends_on
    where series_id = p_series;
    insert into public.timetable (cohort_id, series_id, weekday, start_time, duration_min, title, unit, starts_on, every_weeks, ends_on, tz)
    select r.cohort_id, p_series, x.w, p_start, p_duration,
           nullif(btrim(coalesce(p_title, '')), ''), nullif(btrim(coalesce(p_unit, '')), ''),
           r.starts_on, coalesce(p_every, 1), p_ends_on, r.tz
    from (select distinct unnest(p_weekdays) as w) x
    where not exists (select 1 from public.timetable t where t.series_id = p_series and t.weekday = x.w);
    v_series := p_series;
  else
    -- moved or individually edited classes from that day on go with the old series
    delete from public.sessions s
    using public.timetable t
    where s.timetable_id = t.id
      and t.series_id = p_series
      and not s.auto
      and s.starts_at > now()
      and (s.starts_at at time zone t.tz)::date >= p_from
      and not exists (select 1 from public.attendance a where a.session_id = s.id);
    -- the old series ends the day before; a new one carries on
    update public.timetable set ends_on = p_from - 1
    where series_id = p_series and (ends_on is null or ends_on >= p_from);
    v_series := public.create_series(r.cohort_id, p_title, p_unit, p_from, p_start, p_duration, p_weekdays, p_every, p_ends_on);
  end if;

  if v_changed then
    perform private.email_own_students(r.cohort_id,
      'Class times changed',
      'Your class times have changed',
      'From ' || to_char(greatest(coalesce(p_from, v_first), v_today), 'FMDay DD Mon YYYY')
        || E', your classes are\n' || private.series_rule_text(p_weekdays, p_every, p_start, p_duration) || '.',
      'Open calendar',
      'https://cognifypk.com/portal/student/calendar/');
  end if;
  return v_series;
end $$;

-- ---------- stop: all upcoming classes, or from a day on ----------
create or replace function public.end_series(p_series uuid, p_from date default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r public.timetable;
  v_first date;
  v_today date;
begin
  select * into r from public.timetable where series_id = p_series order by id limit 1;
  if not found then
    raise exception 'This class doesn''t repeat any more';
  end if;
  if not private.teaches(r.cohort_id) then
    raise exception 'Only this student''s teacher can do this' using errcode = '42501';
  end if;
  v_first := coalesce(r.starts_on, (r.created_at at time zone r.tz)::date);
  v_today := (now() at time zone r.tz)::date;

  -- upcoming classes in the series (kept if a register was taken)
  delete from public.sessions s
  using public.timetable t
  where s.timetable_id = t.id
    and t.series_id = p_series
    and s.starts_at > now()
    and (p_from is null or (s.starts_at at time zone t.tz)::date >= p_from)
    and not exists (select 1 from public.attendance a where a.session_id = s.id);

  if p_from is null or p_from <= v_first then
    delete from public.timetable where series_id = p_series;
  else
    update public.timetable set ends_on = p_from - 1
    where series_id = p_series and (ends_on is null or ends_on >= p_from);
  end if;

  perform private.email_own_students(r.cohort_id,
    'Repeating class cancelled',
    'Repeating class cancelled',
    'Your repeating ' || coalesce(nullif(r.title, ''), 'class') || ' at ' || to_char(r.start_time, 'FMHH12:MI AM')
      || case when p_from is null or p_from <= v_today then ' has been cancelled.'
              else ' is cancelled from ' || to_char(p_from, 'FMDay DD Mon YYYY') || '.' end,
    'Open calendar',
    'https://cognifypk.com/portal/student/calendar/');
end $$;

-- older callers
create or replace function public.stop_series(p_timetable bigint)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare v_series uuid;
begin
  select series_id into v_series from public.timetable where id = p_timetable;
  if v_series is null then
    raise exception 'This class doesn''t repeat any more';
  end if;
  perform public.end_series(v_series, null);
end $$;

-- ---------- the Students page's simple weekly timetable ----------
-- slots at the same time and length make one series, like before
create or replace function private.group_series(p_cohort bigint)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.timetable t
  set series_id = g.sid
  from (
    select start_time, duration_min, (array_agg(series_id order by id))[1] as sid
    from public.timetable
    where cohort_id = p_cohort and starts_on is null and title is null and every_weeks = 1 and ends_on is null
    group by 1, 2
  ) g
  where t.cohort_id = p_cohort
    and t.starts_on is null and t.title is null and t.every_weeks = 1 and t.ends_on is null
    and t.start_time = g.start_time and t.duration_min = g.duration_min
    and t.series_id <> g.sid;
$$;

create or replace function public.set_timetable(p_cohort bigint, p_slots jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.teaches(p_cohort) then
    raise exception 'Only this student''s teacher can change the timetable' using errcode = '42501';
  end if;

  -- slots that are no longer wanted
  delete from public.timetable t
  where t.cohort_id = p_cohort
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_slots, '[]'::jsonb)) s
      where (s ->> 'weekday')::int = t.weekday and (s ->> 'start')::time = t.start_time
    );

  -- new lengths for the ones that stay
  update public.timetable t
  set duration_min = x.duration
  from (
    select distinct on ((s ->> 'weekday')::int, (s ->> 'start')::time)
           (s ->> 'weekday')::int as weekday, (s ->> 'start')::time as start_time, coalesce((s ->> 'duration')::int, 60) as duration
    from jsonb_array_elements(coalesce(p_slots, '[]'::jsonb)) s
  ) x
  where t.cohort_id = p_cohort and t.weekday = x.weekday and t.start_time = x.start_time and t.duration_min <> x.duration;

  -- new slots
  insert into public.timetable (cohort_id, weekday, start_time, duration_min)
  select p_cohort, x.weekday, x.start_time, x.duration
  from (
    select distinct on ((s ->> 'weekday')::int, (s ->> 'start')::time)
           (s ->> 'weekday')::int as weekday, (s ->> 'start')::time as start_time, coalesce((s ->> 'duration')::int, 60) as duration
    from jsonb_array_elements(coalesce(p_slots, '[]'::jsonb)) s
  ) x
  where not exists (
    select 1 from public.timetable t where t.cohort_id = p_cohort and t.weekday = x.weekday and t.start_time = x.start_time
  );

  perform private.group_series(p_cohort);
end $$;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.add_student(text, text, text, text, text, jsonb, bigint)'::regprocedure);
  d := replace(d, 'end loop;', E'end loop;\n  perform private.group_series(c.id);');
  if position('private.group_series(c.id)' in d) = 0 then
    raise exception 'add_student: loop not found';
  end if;
  execute d;
end $$;

revoke all on function public.create_series(bigint, text, text, date, time, integer, integer[], integer, date) from public, anon;
revoke all on function public.update_series(uuid, text, date, text, text, time, integer, integer[], integer, date) from public, anon;
revoke all on function public.end_series(uuid, date) from public, anon;
grant execute on function public.create_series(bigint, text, text, date, time, integer, integer[], integer, date) to authenticated;
grant execute on function public.update_series(uuid, text, date, text, text, time, integer, integer[], integer, date) to authenticated;
grant execute on function public.end_series(uuid, date) to authenticated;

-- fill the months ahead now
select private.sync_sessions(120);
