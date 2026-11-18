-- Repeating classes from "Add class" (like Google Calendar: no end until stopped).
--
-- A repeating class is a timetable entry. It now carries its own class name and
-- topic, and a first date (the series starts on the date picked, not today).
-- Classes are generated four weeks ahead by private.sync_sessions(), every day.
-- "Stop repeating" deletes the entry: future classes of the series disappear,
-- past ones (and any with attendance) stay.

alter table public.timetable
  add column if not exists title text check (title is null or char_length(title) <= 120),
  add column if not exists unit text check (unit is null or char_length(unit) <= 120),
  add column if not exists starts_on date;

do $$
declare d text;
begin
  d := pg_get_functiondef('private.sync_sessions(int)'::regprocedure);
  d := replace(d,
    'insert into public.sessions (cohort_id, title, starts_at, duration_min, timetable_id, auto)',
    'insert into public.sessions (cohort_id, title, unit, starts_at, duration_min, timetable_id, auto)');
  d := replace(d,
    'coalesce(nullif(c.subject, ''''), ''Live'') || '' class'',',
    'coalesce(nullif(t.title, ''''), coalesce(nullif(c.subject, ''''), ''Live'') || '' class''), nullif(t.unit, ''''),');
  d := replace(d,
    'and extract(isodow from d.day) = t.weekday',
    'and extract(isodow from d.day) = t.weekday and d.day >= coalesce(t.starts_on, d.day)');
  if position('nullif(t.unit' in d) = 0 or position('t.starts_on' in d) = 0 then
    raise exception 'sync_sessions did not match the expected text';
  end if;
  execute d;

  -- the snapshot says which series a class belongs to
  d := pg_get_functiondef('public.portal_snapshot()'::regprocedure);
  d := replace(d, 's.meet_url, s.recording_url,', 's.meet_url, s.recording_url, s.timetable_id,');
  if position('s.timetable_id' in d) = 0 then
    raise exception 'portal_snapshot did not match the expected text';
  end if;
  execute d;
end $$;

-- Stop a repeating series. A series added from "Add class" may span several
-- weekdays (every weekday / every day): all of them stop together. Weekly slots
-- set on the Students page stop one at a time.
create or replace function public.stop_series(p_timetable bigint)
returns void
language plpgsql
security invoker            -- caller's RLS: only this student's teacher (or the admin)
set search_path = ''
as $$
declare t public.timetable;
begin
  select * into t from public.timetable where id = p_timetable;
  if not found then
    raise exception 'This class doesn''t repeat any more';
  end if;
  if t.starts_on is null then
    delete from public.timetable where id = t.id;
  else
    delete from public.timetable
    where cohort_id = t.cohort_id
      and start_time = t.start_time
      and duration_min = t.duration_min
      and starts_on = t.starts_on
      and coalesce(title, '') = coalesce(t.title, '');
  end if;
end $$;
revoke all on function public.stop_series(bigint) from public, anon;
grant execute on function public.stop_series(bigint) to authenticated;
