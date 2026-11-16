-- Hardening and faster access rules.
--
--  1. Sign-in is tied to a verified Google identity, whatever the Auth settings say.
--  2. "Teacher of this class" is worked out once per query instead of once per row
--     (every load used to run a lookup for every row in the database).
--  3. Rescheduling works again (it failed with "permission denied for function email_students").
--  4. Integrity: hand-in times are set by the server, marks cannot exceed the maximum,
--     class-change requests are rate limited.
--  5. Internal functions are no longer executable by PUBLIC.

-- ---------------------------------------------------------------------------
-- 1. Who is signed in: the email Google verified for this account.
--    A password sign-up with someone else's address can never match a member.
-- ---------------------------------------------------------------------------
create or replace function private.current_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(i.identity_data ->> 'email')
  from auth.identities i
  join auth.users u on u.id = i.user_id
  where i.user_id = (select auth.uid())
    and i.provider = 'google'
    and (i.identity_data ->> 'email_verified')::boolean
    and u.email_confirmed_at is not null
    and lower(u.email) = lower(i.identity_data ->> 'email')
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 2. Teacher scope as a set, evaluated once per statement.
-- ---------------------------------------------------------------------------
create or replace function private.taught_cohorts()
returns bigint[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(c.id), '{}'::bigint[])
  from public.members m
  join public.cohorts c on (m.is_admin or c.teacher_id = m.id)
  where m.email = private.current_email() and m.active and m.role = 'teacher';
$$;

revoke all on function private.taught_cohorts() from public;
grant execute on function private.taught_cohorts() to authenticated;

-- tables keyed by class
drop policy "teachers manage own sessions" on public.sessions;
create policy "teachers manage own sessions" on public.sessions
  for all to authenticated
  using (cohort_id = any ((select private.taught_cohorts())::bigint[]))
  with check (cohort_id = any ((select private.taught_cohorts())::bigint[]));

drop policy "teachers manage own resources" on public.resources;
create policy "teachers manage own resources" on public.resources
  for all to authenticated
  using (cohort_id = any ((select private.taught_cohorts())::bigint[]))
  with check (cohort_id = any ((select private.taught_cohorts())::bigint[]));

drop policy "teachers manage own folders" on public.folders;
create policy "teachers manage own folders" on public.folders
  for all to authenticated
  using (cohort_id = any ((select private.taught_cohorts())::bigint[]))
  with check (cohort_id = any ((select private.taught_cohorts())::bigint[]));

drop policy "teachers manage own assignments" on public.assignments;
create policy "teachers manage own assignments" on public.assignments
  for all to authenticated
  using (cohort_id = any ((select private.taught_cohorts())::bigint[]))
  with check (cohort_id = any ((select private.taught_cohorts())::bigint[]));

drop policy "teachers manage own timetable" on public.timetable;
create policy "teachers manage own timetable" on public.timetable
  for all to authenticated
  using (cohort_id = any ((select private.taught_cohorts())::bigint[]))
  with check (cohort_id = any ((select private.taught_cohorts())::bigint[]));

drop policy "teachers manage own students" on public.members;
create policy "teachers manage own students" on public.members
  for all to authenticated
  using (role = 'student' and cohort_id = any ((select private.taught_cohorts())::bigint[]))
  with check (role = 'student' and not is_admin and cohort_id = any ((select private.taught_cohorts())::bigint[]));

-- announcements: "everyone" posts are the admin's; teachers post to their own students
drop policy "teachers read announcements" on public.announcements;
create policy "teachers read announcements" on public.announcements
  for select to authenticated
  using (
    (cohort_id is null and (select private.is_teacher()))
    or cohort_id = any ((select private.taught_cohorts())::bigint[])
  );

drop policy "teachers manage own announcements" on public.announcements;
create policy "teachers manage own announcements" on public.announcements
  for all to authenticated
  using (case when cohort_id is null then (select private.is_admin())
              else cohort_id = any ((select private.taught_cohorts())::bigint[]) end)
  with check (case when cohort_id is null then (select private.is_admin())
                   else cohort_id = any ((select private.taught_cohorts())::bigint[]) end);

-- tables keyed through a class
drop policy "teachers manage own attendance" on public.attendance;
create policy "teachers manage own attendance" on public.attendance
  for all to authenticated
  using (session_id in (select s.id from public.sessions s where s.cohort_id = any ((select private.taught_cohorts())::bigint[])))
  with check (session_id in (select s.id from public.sessions s where s.cohort_id = any ((select private.taught_cohorts())::bigint[])));

drop policy "teachers manage own requests" on public.class_requests;
create policy "teachers manage own requests" on public.class_requests
  for all to authenticated
  using (session_id in (select s.id from public.sessions s where s.cohort_id = any ((select private.taught_cohorts())::bigint[])))
  with check (session_id in (select s.id from public.sessions s where s.cohort_id = any ((select private.taught_cohorts())::bigint[])));

drop policy "teachers manage own submissions" on public.submissions;
create policy "teachers manage own submissions" on public.submissions
  for all to authenticated
  using (assignment_id in (select a.id from public.assignments a where a.cohort_id = any ((select private.taught_cohorts())::bigint[])))
  with check (assignment_id in (select a.id from public.assignments a where a.cohort_id = any ((select private.taught_cohorts())::bigint[])));

drop policy "teachers manage own attempts" on public.assessment_attempts;
create policy "teachers manage own attempts" on public.assessment_attempts
  for all to authenticated
  using (assignment_id in (select a.id from public.assignments a where a.cohort_id = any ((select private.taught_cohorts())::bigint[])))
  with check (assignment_id in (select a.id from public.assignments a where a.cohort_id = any ((select private.taught_cohorts())::bigint[])));

drop policy "teachers manage own questions" on public.assessment_questions;
create policy "teachers manage own questions" on public.assessment_questions
  for all to authenticated
  using (assignment_id in (select a.id from public.assignments a where a.cohort_id = any ((select private.taught_cohorts())::bigint[])))
  with check (assignment_id in (select a.id from public.assignments a where a.cohort_id = any ((select private.taught_cohorts())::bigint[])));

drop policy "teachers manage own feedback" on public.feedback;
create policy "teachers manage own feedback" on public.feedback
  for all to authenticated
  using (submission_id in (
    select s.id from public.submissions s join public.assignments a on a.id = s.assignment_id
    where a.cohort_id = any ((select private.taught_cohorts())::bigint[])))
  with check (submission_id in (
    select s.id from public.submissions s join public.assignments a on a.id = s.assignment_id
    where a.cohort_id = any ((select private.taught_cohorts())::bigint[])));

drop policy "teachers manage own mastery" on public.mastery;
create policy "teachers manage own mastery" on public.mastery
  for all to authenticated
  using (member_id in (select m.id from public.members m where m.cohort_id = any ((select private.taught_cohorts())::bigint[])))
  with check (member_id in (select m.id from public.members m where m.cohort_id = any ((select private.taught_cohorts())::bigint[])));

-- the snapshot: attendance gathered in one pass instead of one lookup per class
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
      from (select id, name, board, subject, meet_url, join_code, teacher_id from public.cohorts) x),

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

-- ---------------------------------------------------------------------------
-- 3. Rescheduling: the "class moved" email goes through a helper the teacher
--    is allowed to call (and which checks the class is theirs).
-- ---------------------------------------------------------------------------
create or replace function private.email_own_students(p_cohort bigint, p_subject text, p_heading text, p_body text, p_cta text, p_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.teaches(p_cohort) then
    raise exception 'This student isn''t yours' using errcode = '42501';
  end if;
  perform private.email_students(p_cohort, p_subject, p_heading, p_body, p_cta, p_url);
end $$;

revoke all on function private.email_own_students(bigint, text, text, text, text, text) from public;
grant execute on function private.email_own_students(bigint, text, text, text, text, text) to authenticated;

create or replace function public.reschedule_session(p_session bigint, p_start timestamptz, p_duration integer)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  s public.sessions;
  clash public.sessions;
  new_id bigint;
begin
  if not (select private.is_teacher()) then
    raise exception 'Only teachers can reschedule classes';
  end if;
  if p_duration not between 5 and 720 then
    raise exception 'Class length must be between 5 minutes and 12 hours';
  end if;

  select * into s from public.sessions where id = p_session and not cancelled for update;
  if not found then
    raise exception 'Class not found';
  end if;
  if s.starts_at + make_interval(mins => s.duration_min) <= now() then
    raise exception 'This class has already finished';
  end if;

  perform set_config('app.rescheduling', '1', true);

  select * into clash from public.sessions
  where cohort_id = s.cohort_id and starts_at = p_start and id <> s.id;

  if found and clash.cancelled then
    update public.sessions
    set cancelled = false, duration_min = p_duration, reminded_at = null, reminded_day_at = null
    where id = clash.id;
    if s.auto then
      update public.sessions set cancelled = true where id = s.id;
    else
      delete from public.sessions where id = s.id;
    end if;
    new_id := clash.id;
  elsif found then
    raise exception 'Another class already starts at that time';
  elsif s.auto then
    update public.sessions set cancelled = true where id = s.id;
    insert into public.sessions (cohort_id, title, strand, unit, starts_at, duration_min, meet_url, auto)
    values (s.cohort_id, s.title, s.strand, s.unit, p_start, p_duration, s.meet_url, false)
    returning id into new_id;
  else
    update public.sessions set starts_at = p_start, duration_min = p_duration where id = s.id;
    new_id := s.id;
  end if;

  perform set_config('app.rescheduling', '', true);

  if p_start <> s.starts_at then
    perform private.email_own_students(s.cohort_id,
      'Class rescheduled: ' || private.when_pkt(p_start),
      'Class rescheduled',
      'Your class on ' || private.when_pkt(s.starts_at) || E' has moved to\n' || private.when_pkt(p_start) || ' (' || p_duration || ' min).',
      'Open calendar',
      'https://cognifypk.com/portal/student/calendar/');
  end if;
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Integrity
-- ---------------------------------------------------------------------------
-- hand-in time is the server's clock, never the browser's
create or replace function private.stamp_submission()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.file_path is distinct from old.file_path
     or new.drive_file_id is distinct from old.drive_file_id
     or new.file_name is distinct from old.file_name
     or new.answer_text is distinct from old.answer_text then
    new.submitted_at := now();
  else
    new.submitted_at := old.submitted_at;
  end if;
  return new;
end $$;

drop trigger if exists stamp_submission on public.submissions;
create trigger stamp_submission
  before insert or update on public.submissions
  for each row execute function private.stamp_submission();

-- marks can never exceed the assignment's maximum
create or replace function private.check_marks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max integer;
begin
  select a.max_marks into v_max
  from public.submissions s join public.assignments a on a.id = s.assignment_id
  where s.id = new.submission_id;
  if new.marks > v_max then
    raise exception 'Marks cannot be more than %', v_max;
  end if;
  return new;
end $$;

drop trigger if exists check_marks on public.feedback;
create trigger check_marks
  before insert or update of marks on public.feedback
  for each row execute function private.check_marks();

-- a student can ask to move or cancel classes at most 10 times a day
-- (each request emails the teacher; withdrawing and re-asking could flood them)
create table if not exists private.request_log (
  member_id bigint not null,
  at        timestamptz not null default now()
);
create index if not exists request_log_member_at_idx on private.request_log (member_id, at);
alter table private.request_log enable row level security;

create or replace function private.limit_class_requests()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from private.request_log l
      where l.member_id = new.member_id and l.at > now() - interval '1 day') >= 10 then
    raise exception 'Too many requests today. Please message your teacher instead.';
  end if;
  insert into private.request_log (member_id) values (new.member_id);
  return new;
end $$;

drop trigger if exists limit_class_requests on public.class_requests;
create trigger limit_class_requests
  before insert on public.class_requests
  for each row execute function private.limit_class_requests();

create or replace function private.housekeeping()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from cron.job_run_details where end_time < now() - interval '7 days';
  delete from public.email_outbox where created_at < now() - interval '30 days';
  delete from private.join_attempts where at < now() - interval '1 day';
  delete from private.request_log where at < now() - interval '2 days';
  delete from public.drive_oauth_states where created_at < now() - interval '1 day';
$$;

-- ---------------------------------------------------------------------------
-- 5. Internal functions: nothing executable by PUBLIC.
--    (Triggers and cron jobs run them as the owner; no caller needs the grant.)
-- ---------------------------------------------------------------------------
revoke all on function
  private.dispatch_emails(),
  private.enqueue_class_reminders(),
  private.notify_announcement(),
  private.notify_assignment(),
  private.notify_feedback(),
  private.notify_request(),
  private.notify_session_cancelled(),
  private.notify_submission(),
  private.reset_assignment_reminders(),
  private.reset_session_reminders(),
  private.seed_folders(bigint),
  private.seed_folders_for_new_cohort(),
  private.stamp_submission(),
  private.check_marks(),
  private.limit_class_requests(),
  private.housekeeping()
from public, anon, authenticated;
