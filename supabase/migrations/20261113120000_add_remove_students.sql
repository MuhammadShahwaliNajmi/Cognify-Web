-- Teachers add and remove students from the portal.
--
-- add_student: creates the student's class (one-to-one cohort) with a join code,
-- its starter folders (trigger), an optional weekly timetable (classes are then
-- scheduled by the timetable trigger) and, if an email is given, the student's
-- membership so they can sign in straight away without a code.
--
-- remove_student: deletes the student and their class with everything in it
-- (classes, assignments, submissions, marks, files list, folders, timetable).
-- Files already in Google Drive are left there.

create or replace function public.add_student(
  p_name text,
  p_board text default null,
  p_subject text default null,
  p_email text default null,
  p_meet_url text default null,
  p_slots jsonb default '[]'::jsonb   -- [{"weekday":1..7, "start":"18:00", "duration":60}]
)
returns jsonb
language plpgsql
security invoker               -- caller's RLS applies: only teachers can write these tables
set search_path = ''
as $$
declare
  c public.cohorts;
  s jsonb;
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
begin
  if not (select private.is_teacher()) then
    raise exception 'Only teachers can add students';
  end if;
  if nullif(btrim(p_name), '') is null then
    raise exception 'Enter the student''s name';
  end if;
  if v_email is not null and exists (select 1 from public.members m where m.email = v_email) then
    raise exception 'That email is already in the portal';
  end if;

  insert into public.cohorts (name, board, subject, meet_url)
  values (btrim(p_name), nullif(btrim(p_board), ''), nullif(btrim(p_subject), ''), nullif(btrim(p_meet_url), ''))
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
revoke all on function public.add_student(text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.add_student(text, text, text, text, text, jsonb) to authenticated;

create or replace function public.remove_student(p_cohort bigint)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_teacher()) then
    raise exception 'Only teachers can remove students';
  end if;
  delete from public.members where cohort_id = p_cohort and role = 'student';
  delete from public.cohorts where id = p_cohort;
  if not found then
    raise exception 'Student not found';
  end if;
end $$;
revoke all on function public.remove_student(bigint) from public, anon;
grant execute on function public.remove_student(bigint) to authenticated;
