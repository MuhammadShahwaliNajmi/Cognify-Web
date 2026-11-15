-- Teacher accounts and per-teacher students.
--
--   * members.is_admin — the admin (Najmi) creates teacher accounts, assigns
--     students to teachers and sees everything.
--   * cohorts.teacher_id — each student's class belongs to one teacher.
--   * Every "teachers manage …" rule now means "the admin, or the teacher this
--     student belongs to". Other teachers can't see or change that student.

-- ---------- columns ----------
alter table public.members add column is_admin boolean not null default false;
alter table public.cohorts add column teacher_id bigint references public.members (id) on delete set null;
create index cohorts_teacher_id_idx on public.cohorts (teacher_id);

update public.members set is_admin = true where email = 'shahwali.najmi@gmail.com';
update public.cohorts set teacher_id = (select id from public.members where email = 'shahwali.najmi@gmail.com');

-- ---------- helpers (security definer: no RLS recursion) ----------
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members m
    where m.email = private.current_email() and m.active and m.role = 'teacher' and m.is_admin
  )
$$;

create or replace function private.teaches(p_cohort bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_admin() or exists (
    select 1
    from public.cohorts c
    join public.members m on m.id = c.teacher_id
    where c.id = p_cohort and m.email = private.current_email() and m.active and m.role = 'teacher'
  )
$$;

create or replace function private.teaches_session(p_session bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.teaches((select cohort_id from public.sessions where id = p_session))
$$;

create or replace function private.teaches_assignment(p_assignment bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.teaches((select cohort_id from public.assignments where id = p_assignment))
$$;

create or replace function private.teaches_submission(p_submission bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.teaches((
    select a.cohort_id from public.submissions s join public.assignments a on a.id = s.assignment_id where s.id = p_submission
  ))
$$;

create or replace function private.teaches_member(p_member bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.teaches((select cohort_id from public.members where id = p_member))
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.teaches(bigint) from public;
revoke all on function private.teaches_session(bigint) from public;
revoke all on function private.teaches_assignment(bigint) from public;
revoke all on function private.teaches_submission(bigint) from public;
revoke all on function private.teaches_member(bigint) from public;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.teaches(bigint) to authenticated;
grant execute on function private.teaches_session(bigint) to authenticated;
grant execute on function private.teaches_assignment(bigint) to authenticated;
grant execute on function private.teaches_submission(bigint) to authenticated;
grant execute on function private.teaches_member(bigint) to authenticated;

-- ---------- policies ----------
-- cohorts: the admin, or the class's own teacher
drop policy "teachers manage cohorts" on public.cohorts;
create policy "teachers manage own classes" on public.cohorts
  for all to authenticated
  using ((select private.is_admin()) or (teacher_id = (select private.member_id()) and (select private.is_teacher())))
  with check ((select private.is_admin()) or (teacher_id = (select private.member_id()) and (select private.is_teacher())));

-- members: the admin manages everyone; teachers see fellow teachers and manage their own students
drop policy "teachers manage members" on public.members;
create policy "admin manages members" on public.members
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy "teachers see teachers" on public.members
  for select to authenticated
  using (role = 'teacher' and (select private.is_teacher()));
create policy "teachers manage own students" on public.members
  for all to authenticated
  using (role = 'student' and private.teaches(cohort_id))
  with check (role = 'student' and not is_admin and private.teaches(cohort_id));

-- tables keyed by class
drop policy "teachers manage sessions" on public.sessions;
create policy "teachers manage own sessions" on public.sessions
  for all to authenticated using (private.teaches(cohort_id)) with check (private.teaches(cohort_id));

drop policy "teachers manage resources" on public.resources;
create policy "teachers manage own resources" on public.resources
  for all to authenticated using (private.teaches(cohort_id)) with check (private.teaches(cohort_id));

drop policy "teachers manage folders" on public.folders;
create policy "teachers manage own folders" on public.folders
  for all to authenticated using (private.teaches(cohort_id)) with check (private.teaches(cohort_id));

drop policy "teachers manage assignments" on public.assignments;
create policy "teachers manage own assignments" on public.assignments
  for all to authenticated using (private.teaches(cohort_id)) with check (private.teaches(cohort_id));

drop policy "teachers manage timetable" on public.timetable;
create policy "teachers manage own timetable" on public.timetable
  for all to authenticated using (private.teaches(cohort_id)) with check (private.teaches(cohort_id));

-- announcements: "everyone" posts are the admin's; teachers post to their own students
drop policy "teachers manage announcements" on public.announcements;
create policy "teachers read announcements" on public.announcements
  for select to authenticated
  using ((cohort_id is null and (select private.is_teacher())) or private.teaches(cohort_id));
create policy "teachers manage own announcements" on public.announcements
  for all to authenticated
  using (case when cohort_id is null then (select private.is_admin()) else private.teaches(cohort_id) end)
  with check (case when cohort_id is null then (select private.is_admin()) else private.teaches(cohort_id) end);

-- tables keyed through a class
drop policy "teachers manage attendance" on public.attendance;
create policy "teachers manage own attendance" on public.attendance
  for all to authenticated using (private.teaches_session(session_id)) with check (private.teaches_session(session_id));

drop policy "teachers manage requests" on public.class_requests;
create policy "teachers manage own requests" on public.class_requests
  for all to authenticated using (private.teaches_session(session_id)) with check (private.teaches_session(session_id));

drop policy "teachers manage submissions" on public.submissions;
create policy "teachers manage own submissions" on public.submissions
  for all to authenticated using (private.teaches_assignment(assignment_id)) with check (private.teaches_assignment(assignment_id));

drop policy "teachers manage feedback" on public.feedback;
create policy "teachers manage own feedback" on public.feedback
  for all to authenticated using (private.teaches_submission(submission_id)) with check (private.teaches_submission(submission_id));

drop policy "teachers manage attempts" on public.assessment_attempts;
create policy "teachers manage own attempts" on public.assessment_attempts
  for all to authenticated using (private.teaches_assignment(assignment_id)) with check (private.teaches_assignment(assignment_id));

drop policy "teachers manage questions" on public.assessment_questions;
create policy "teachers manage own questions" on public.assessment_questions
  for all to authenticated using (private.teaches_assignment(assignment_id)) with check (private.teaches_assignment(assignment_id));

drop policy "teachers manage mastery" on public.mastery;
create policy "teachers manage own mastery" on public.mastery
  for all to authenticated using (private.teaches_member(member_id)) with check (private.teaches_member(member_id));

-- older submissions in the built-in bucket: path starts with the student's member id
drop policy "teachers read all work" on storage.objects;
create policy "teachers read own students work" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'submissions'
    and private.teaches_member(
      case when (storage.foldername(name))[1] ~ '^\d+$' then ((storage.foldername(name))[1])::bigint end
    )
  );

-- ---------- functions ----------
create or replace function private.submission_is_marked(p_submission_id bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.feedback f
    join public.submissions s on s.id = f.submission_id
    where f.submission_id = p_submission_id
      and (s.member_id = private.member_id() or private.teaches_assignment(s.assignment_id))
  )
$$;

create or replace function public.regenerate_join_code(p_cohort_id bigint)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
  if not private.teaches(p_cohort_id) then
    raise exception 'Only this student''s teacher can do this.' using errcode = '42501';
  end if;
  update public.cohorts set join_code = private.new_join_code()
  where id = p_cohort_id returning join_code into v_code;
  return v_code;
end $$;

-- add_student: the class belongs to the caller, or (admin only) to the teacher chosen
drop function public.add_student(text, text, text, text, text, jsonb);
create or replace function public.add_student(
  p_name text,
  p_board text default null,
  p_subject text default null,
  p_email text default null,
  p_meet_url text default null,
  p_slots jsonb default '[]'::jsonb,
  p_teacher bigint default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c public.cohorts;
  s jsonb;
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_teacher bigint := case when p_teacher is not null and private.is_admin() then p_teacher else private.member_id() end;
begin
  if not (select private.is_teacher()) then
    raise exception 'Only teachers can add students';
  end if;
  if nullif(btrim(p_name), '') is null then
    raise exception 'Enter the student''s name';
  end if;
  if not exists (select 1 from public.members m where m.id = v_teacher and m.role = 'teacher' and m.active) then
    raise exception 'Choose a teacher';
  end if;
  if v_email is not null and exists (select 1 from public.members m where m.email = v_email) then
    raise exception 'That email is already in the portal';
  end if;

  insert into public.cohorts (name, board, subject, meet_url, teacher_id)
  values (btrim(p_name), nullif(btrim(p_board), ''), nullif(btrim(p_subject), ''), nullif(btrim(p_meet_url), ''), v_teacher)
  returning * into c;

  for s in select * from jsonb_array_elements(coalesce(p_slots, '[]'::jsonb)) loop
    insert into public.timetable (cohort_id, weekday, start_time, duration_min)
    values (c.id, (s->>'weekday')::int, (s->>'start')::time, coalesce((s->>'duration')::int, 60));
  end loop;

  if v_email is not null then
    insert into public.members (email, role, full_name, plan, cohort_id)
    values (v_email, 'student', btrim(p_name), 'Core', c.id);
  end if;

  return jsonb_build_object('cohort_id', c.id, 'join_code', c.join_code);
end $$;
revoke all on function public.add_student(text, text, text, text, text, jsonb, bigint) from public, anon;
grant execute on function public.add_student(text, text, text, text, text, jsonb, bigint) to authenticated;

-- emails about a student go to that student's teacher (or the admin if none)
create or replace function private.email_staff(p_cohort bigint, p_subject text, p_heading text, p_body text, p_cta text, p_url text)
returns void language sql security definer set search_path = '' as $$
  insert into public.email_outbox (to_email, to_name, subject, heading, body, cta_label, cta_url)
  select m.email, m.full_name, p_subject, p_heading, p_body, p_cta, p_url
  from public.members m
  where m.role = 'teacher' and m.active
    and (
      m.id = (select teacher_id from public.cohorts where id = p_cohort)
      or (m.is_admin and (select teacher_id from public.cohorts where id = p_cohort) is null)
    )
$$;
revoke all on function private.email_staff(bigint, text, text, text, text, text) from public;

do $$
declare d text;
begin
  d := pg_get_functiondef('private.notify_request()'::regprocedure);
  d := replace(d, 'perform private.email_teachers(', 'perform private.email_staff(s.cohort_id, ');
  execute d;
  d := pg_get_functiondef('private.notify_submission()'::regprocedure);
  d := replace(d, 'perform private.email_teachers(', 'perform private.email_staff(a.cohort_id, ');
  execute d;

  -- the snapshot carries who is admin and which teacher each class belongs to
  d := pg_get_functiondef('public.portal_snapshot()'::regprocedure);
  d := replace(d, 'select id, email, role, full_name, title, plan, cohort_id, predicted, target', 'select id, email, role, full_name, title, plan, cohort_id, predicted, target, is_admin');
  d := replace(d, 'select id, name, board, subject, meet_url, join_code from public.cohorts', 'select id, name, board, subject, meet_url, join_code, teacher_id from public.cohorts');
  execute d;
end $$;
