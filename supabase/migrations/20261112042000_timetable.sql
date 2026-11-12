-- Weekly timetable → automatically generated class sessions.
--
-- Teachers keep a weekly timetable per cohort (Pakistan time by default).
-- private.sync_sessions() materialises the next 14 days of classes into
-- public.sessions. It runs daily via pg_cron and immediately after any
-- timetable change. Auto-generated classes that no longer match the timetable
-- are removed only if they are in the future and nobody has attended them.

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Generated classes don't have a topic yet: teachers add it later.
alter table public.sessions alter column strand drop not null;
alter table public.sessions alter column unit drop not null;

create table public.timetable (
  id            bigint generated always as identity primary key,
  cohort_id     bigint not null references public.cohorts (id) on delete cascade,
  weekday       smallint not null check (weekday between 1 and 7),   -- ISO: 1 = Monday … 7 = Sunday
  start_time    time not null,
  duration_min  integer not null default 60 check (duration_min between 15 and 240),
  tz            text not null default 'Asia/Karachi',
  created_at    timestamptz not null default now(),
  unique (cohort_id, weekday, start_time)
);

alter table public.sessions
  add column timetable_id bigint references public.timetable (id) on delete set null,
  add column auto boolean not null default false;
create index sessions_timetable_id_idx on public.sessions (timetable_id);
create unique index sessions_cohort_starts_uniq on public.sessions (cohort_id, starts_at);
drop index public.sessions_cohort_starts_idx;   -- superseded by the unique index above

-- Privileges + RLS: same model as the rest of the portal.
grant select, insert, update, delete on public.timetable to authenticated;
alter table public.timetable enable row level security;
create policy "teachers manage timetable" on public.timetable for all to authenticated
  using ((select private.is_teacher())) with check ((select private.is_teacher()));
create policy "students read own timetable" on public.timetable for select to authenticated
  using (cohort_id = (select private.cohort_id()));

-- Materialise the timetable into sessions for the next p_days days.
create or replace function private.sync_sessions(p_days integer default 14)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  -- 1. drop future auto classes that no longer match a timetable slot (never touch attended ones)
  delete from public.sessions s
  where s.auto
    and s.starts_at > now()
    and not exists (select 1 from public.attendance a where a.session_id = s.id)
    and not exists (
      select 1 from public.timetable t
      where t.id = s.timetable_id
        and extract(isodow from s.starts_at at time zone t.tz) = t.weekday
        and (s.starts_at at time zone t.tz)::time = t.start_time
        and s.duration_min = t.duration_min
    );

  -- 2. create any missing classes
  insert into public.sessions (cohort_id, title, starts_at, duration_min, timetable_id, auto)
  select t.cohort_id,
         coalesce(nullif(c.subject, ''), 'Live') || ' class',
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
  where extract(isodow from d.day) = t.weekday
    and ((d.day + t.start_time) at time zone t.tz) + make_interval(mins => t.duration_min) > now()
  on conflict (cohort_id, starts_at) do nothing;
end;
$$;
revoke all on function private.sync_sessions(integer) from public, anon, authenticated;

-- Re-sync straight after any timetable change.
create or replace function private.timetable_changed()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform private.sync_sessions(14);
  return null;
end;
$$;
revoke all on function private.timetable_changed() from public, anon, authenticated;

create trigger timetable_sync
  after insert or update or delete on public.timetable
  for each statement execute function private.timetable_changed();

-- Daily top-up at 00:05 UTC (05:05 in Pakistan).
select cron.schedule('sync-class-sessions', '5 0 * * *', $$select private.sync_sessions(14)$$);
