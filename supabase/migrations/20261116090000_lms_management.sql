-- LMS management: change a student's weekly classes, archive instead of delete.
--
--  * set_timetable()   replaces a student's weekly slots, keeping untouched slots
--                      (and any classes already moved or cancelled on them) as they are.
--  * archive_student() takes a student out of the portal without deleting anything:
--                      they lose access, upcoming classes are removed, and everything
--                      comes back with one click. Permanent removal stays available.
--  * The snapshot now carries the weekly timetable and the archived flag.

alter table public.cohorts add column if not exists archived_at timestamptz;

-- ---------------------------------------------------------------------------
-- weekly timetable
-- ---------------------------------------------------------------------------
create or replace function public.set_timetable(p_cohort bigint, p_slots jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not (select private.is_teacher()) then
    raise exception 'Only teachers can change the timetable';
  end if;
  if not exists (select 1 from public.cohorts where id = p_cohort) then
    raise exception 'Student not found';
  end if;

  -- slots that are no longer wanted
  delete from public.timetable t
  where t.cohort_id = p_cohort
    and not exists (
      select 1 from jsonb_array_elements(coalesce(p_slots, '[]'::jsonb)) s
      where (s ->> 'weekday')::int = t.weekday and (s ->> 'start')::time = t.start_time
    );

  -- new slots, and new lengths for the ones that stay
  insert into public.timetable (cohort_id, weekday, start_time, duration_min)
  select distinct on ((s ->> 'weekday')::int, (s ->> 'start')::time)
         p_cohort, (s ->> 'weekday')::int, (s ->> 'start')::time, coalesce((s ->> 'duration')::int, 60)
  from jsonb_array_elements(coalesce(p_slots, '[]'::jsonb)) s
  on conflict (cohort_id, weekday, start_time) do update set duration_min = excluded.duration_min;
end $$;

revoke all on function public.set_timetable(bigint, jsonb) from public, anon;
grant execute on function public.set_timetable(bigint, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- archive / restore
-- ---------------------------------------------------------------------------
create or replace function public.archive_student(p_cohort bigint, p_archive boolean)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not (select private.is_teacher()) then
    raise exception 'Only teachers can do this';
  end if;

  update public.cohorts set archived_at = case when p_archive then now() end where id = p_cohort;
  if not found then
    raise exception 'Student not found';
  end if;
  update public.members set active = not p_archive where cohort_id = p_cohort and role = 'student';

  if p_archive then
    -- upcoming classes go; classes already attended stay on record
    delete from public.sessions s
    where s.cohort_id = p_cohort and s.starts_at > now()
      and not exists (select 1 from public.attendance a where a.session_id = s.id);
  else
    -- touching the timetable rebuilds the upcoming classes
    update public.timetable set duration_min = duration_min where cohort_id = p_cohort;
  end if;
end $$;

revoke all on function public.archive_student(bigint, boolean) from public, anon;
grant execute on function public.archive_student(bigint, boolean) to authenticated;

-- no classes are generated for archived students
create or replace function private.sync_sessions(p_days integer default 14)
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
    and not exists (
      select 1 from public.timetable t
      where t.id = s.timetable_id
        and extract(isodow from s.starts_at at time zone t.tz) = t.weekday
        and (s.starts_at at time zone t.tz)::time = t.start_time
        and s.duration_min = t.duration_min
    );

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
  where c.archived_at is null
    and extract(isodow from d.day) = t.weekday
    and ((d.day + t.start_time) at time zone t.tz) + make_interval(mins => t.duration_min) > now()
  on conflict (cohort_id, starts_at) do nothing;
end;
$$;

revoke all on function private.sync_sessions(integer) from public, anon, authenticated;

-- a join code for an archived student no longer works
create or replace function public.join_cohort(p_code text)
returns table (ok boolean, message text, cohort_id bigint, cohort_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_email  text := private.current_email();
  v_name   text;
  v_cohort public.cohorts%rowtype;
begin
  if v_uid is null or v_email is null then
    raise exception 'Sign in with Google first.' using errcode = '42501';
  end if;
  if exists (select 1 from public.members m where m.email = v_email) then
    return query select false, 'This account is already set up.', null::bigint, null::text;
    return;
  end if;
  if (select count(*) from private.join_attempts a
      where a.user_id = v_uid and a.at > now() - interval '1 hour') >= 10 then
    return query select false, 'Too many attempts. Please try again in an hour.', null::bigint, null::text;
    return;
  end if;

  select * into v_cohort from public.cohorts c
  where replace(c.join_code, '-', '') = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
    and c.archived_at is null
  for update;

  if v_cohort.id is null then
    insert into private.join_attempts (user_id) values (v_uid);
    return query select false, $m$That code doesn't match a class. Check it and try again.$m$, null::bigint, null::text;
    return;
  end if;
  if exists (select 1 from public.members m
             where m.cohort_id = v_cohort.id and m.role = 'student' and m.active) then
    insert into private.join_attempts (user_id) values (v_uid);
    return query select false, 'This code has already been used. Ask your teacher for a new one.', null::bigint, null::text;
    return;
  end if;

  select coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''),
                  nullif(u.raw_user_meta_data ->> 'name', ''),
                  v_cohort.name)
    into v_name from auth.users u where u.id = v_uid;

  insert into public.members (email, role, full_name, plan, cohort_id)
  values (v_email, 'student', v_name, 'Core', v_cohort.id);

  return query select true, 'You have joined your class.', v_cohort.id, v_cohort.name;
end;
$$;

revoke all on function public.join_cohort(text) from public, anon;
grant execute on function public.join_cohort(text) to authenticated;

-- ---------------------------------------------------------------------------
-- snapshot: + weekly timetable, + archived flag
-- ---------------------------------------------------------------------------
create or replace function public.portal_snapshot()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'me', (select private.member_id()),

    'members', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.full_name), '[]'::jsonb)
      from (
        select id, email, role, full_name, title, plan, cohort_id, predicted, target, is_admin
        from public.members
        where active
      ) x),

    'cohorts', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.id), '[]'::jsonb)
      from (select id, name, board, subject, meet_url, join_code, teacher_id, archived_at from public.cohorts) x),

    'timetable', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.weekday, x.start_time), '[]'::jsonb)
      from (select cohort_id, weekday, start_time, duration_min from public.timetable) x),

    'sessions', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.starts_at), '[]'::jsonb)
      from (
        select s.id, s.cohort_id, s.title, s.strand, s.unit, s.starts_at, s.duration_min, s.meet_url, s.recording_url,
               coalesce(att.present, '{}'::jsonb) as attendance
        from public.sessions s
        left join (
          select a.session_id, jsonb_object_agg(a.member_id::text, a.present) as present
          from public.attendance a
          group by a.session_id
        ) att on att.session_id = s.id
        where not s.cancelled and s.starts_at >= now() - interval '180 days'
      ) x),

    'resources', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
      from (
        select id, cohort_id, folder_id, session_id, title, type, strand, unit, drive_url, drive_file_id, mime_type, size_bytes, created_at
        from public.resources
      ) x),

    'folders', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.name), '[]'::jsonb)
      from (select id, cohort_id, parent_id, name from public.folders) x),

    'assignments', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.due_at), '[]'::jsonb)
      from (
        select id, cohort_id, title, kind, strand, unit, brief, due_at, max_marks, time_limit_min,
               attachment_url, attachment_file_id, attachment_name, attachment_mime
        from public.assignments
      ) x),

    'submissions', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.submitted_at), '[]'::jsonb)
      from (
        select s.id, s.assignment_id, s.member_id, s.file_name, s.file_size, s.file_path, s.drive_file_id, s.mime_type,
               s.answer_text, s.note, s.submitted_at,
               f.marks, f.feedback, f.strengths, f.improvements, f.marked_at
        from public.submissions s
        left join public.feedback f on f.submission_id = s.id
      ) x),

    'announcements', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
      from (select id, cohort_id, title, body, created_at from public.announcements) x),

    'mastery', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.unit), '[]'::jsonb)
      from (select member_id, unit, strand, score, fix from public.mastery) x),

    'requests', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
      from (
        select id, session_id, member_id, kind, proposed_start, note, status, created_at
        from public.class_requests
      ) x),

    -- timed assessments: a student's own attempts, and questions only once started
    'attempts', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.started_at), '[]'::jsonb)
      from (select assignment_id, member_id, started_at, ends_at from public.assessment_attempts) x),

    'questions', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.assignment_id), '[]'::jsonb)
      from (select assignment_id, body from public.assessment_questions) x)
  );
$$;
