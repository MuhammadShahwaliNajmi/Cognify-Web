-- Group classes: one class (cohort) shared by several students. They share the timetable, Meet
-- room, set work, files and announcements; each keeps their own hand-ins, marks and attendance.
alter table public.cohorts add column is_group boolean not null default false;

-- the snapshot carries it
do $$
declare d text;
begin
  d := pg_get_functiondef('public.portal_snapshot'::regproc);
  d := replace(d, 'select id, name, board, subject, meet_url, join_code, teacher_id, archived_at, exam_on from public.cohorts',
                  'select id, name, board, subject, meet_url, join_code, teacher_id, archived_at, exam_on, is_group from public.cohorts');
  if position('exam_on, is_group' in d) = 0 then raise exception 'portal_snapshot not patched'; end if;
  execute d;
end $$;

-- a group's join code works for every student in it (a one-to-one code still works once)
do $$
declare d text;
begin
  d := pg_get_functiondef('public.join_cohort(text)'::regprocedure);
  d := replace(d, $q$  if exists (select 1 from public.members m
             where m.cohort_id = v_cohort.id and m.role = 'student' and m.active) then$q$,
                  $q$  if not v_cohort.is_group and exists (select 1 from public.members m
             where m.cohort_id = v_cohort.id and m.role = 'student' and m.active) then$q$);
  if position('not v_cohort.is_group' in d) = 0 then raise exception 'join_cohort not patched'; end if;
  execute d;
end $$;

-- add a student, or a group (p_group) with any students whose Google emails are known (p_students: [{name, email}])
drop function public.add_student(text, text, text, text, text, jsonb, bigint);
create function public.add_student(
  p_name text, p_board text default null, p_subject text default null, p_email text default null,
  p_meet_url text default null, p_slots jsonb default '[]'::jsonb, p_teacher bigint default null,
  p_group boolean default false, p_students jsonb default '[]'::jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  c public.cohorts;
  s jsonb;
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_teacher bigint := case when p_teacher is not null and private.is_admin() then p_teacher else private.member_id() end;
  v_e text;
begin
  if not (select private.is_teacher()) then
    raise exception 'Only teachers can add students';
  end if;
  if nullif(btrim(p_name), '') is null then
    raise exception '%', case when p_group then 'Enter the group''s name' else 'Enter the student''s name' end;
  end if;
  if not exists (select 1 from public.members m where m.id = v_teacher and m.role = 'teacher' and m.active) then
    raise exception 'Choose a teacher';
  end if;
  if not p_group and v_email is not null and exists (select 1 from public.members m where m.email = v_email) then
    raise exception 'That email is already in the portal';
  end if;

  insert into public.cohorts (name, board, subject, meet_url, teacher_id, is_group)
  values (btrim(p_name), nullif(btrim(p_board), ''), nullif(btrim(p_subject), ''), nullif(btrim(p_meet_url), ''), v_teacher, coalesce(p_group, false))
  returning * into c;

  for s in select * from jsonb_array_elements(coalesce(p_slots, '[]'::jsonb)) loop
    insert into public.timetable (cohort_id, weekday, start_time, duration_min)
    values (c.id, (s->>'weekday')::int, (s->>'start')::time, coalesce((s->>'duration')::int, 60));
  end loop;
  perform private.group_series(c.id);

  if p_group then
    for s in select * from jsonb_array_elements(coalesce(p_students, '[]'::jsonb)) loop
      v_e := nullif(lower(btrim(coalesce(s->>'email', ''))), '');
      continue when v_e is null;
      if exists (select 1 from public.members m where m.email = v_e) then
        raise exception '% is already in the portal', v_e;
      end if;
      insert into public.members (email, role, full_name, plan, cohort_id)
      values (v_e, 'student', coalesce(nullif(btrim(s->>'name'), ''), split_part(v_e, '@', 1)), 'Core', c.id);
    end loop;
  elsif v_email is not null then
    insert into public.members (email, role, full_name, plan, cohort_id)
    values (v_email, 'student', btrim(p_name), 'Core', c.id);
  end if;

  return jsonb_build_object('cohort_id', c.id, 'join_code', c.join_code);
end $$;
revoke all on function public.add_student(text, text, text, text, text, jsonb, bigint, boolean, jsonb) from public, anon;
grant execute on function public.add_student(text, text, text, text, text, jsonb, bigint, boolean, jsonb) to authenticated;

-- add one more student to a group the teacher teaches
create function public.add_to_group(p_cohort bigint, p_name text, p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_e text := nullif(lower(btrim(coalesce(p_email, ''))), '');
begin
  if not (p_cohort = any (private.taught_cohorts())) then raise exception 'You don''t teach this class'; end if;
  if not exists (select 1 from public.cohorts c where c.id = p_cohort and c.is_group) then raise exception 'This is not a group class'; end if;
  if v_e is null or v_e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter the student''s Google email'; end if;
  if exists (select 1 from public.members m where m.email = v_e) then raise exception 'That email is already in the portal'; end if;
  insert into public.members (email, role, full_name, plan, cohort_id)
  values (v_e, 'student', coalesce(nullif(btrim(p_name), ''), split_part(v_e, '@', 1)), 'Core', p_cohort);
end $$;
revoke all on function public.add_to_group(bigint, text, text) from public, anon;
grant execute on function public.add_to_group(bigint, text, text) to authenticated;

-- take one student out of a group (their account stops working; their past work stays)
create function public.remove_from_group(p_member bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_cohort bigint;
begin
  select m.cohort_id into v_cohort from public.members m where m.id = p_member and m.role = 'student';
  if v_cohort is null or not (v_cohort = any (private.taught_cohorts())) then raise exception 'You don''t teach this student'; end if;
  if not exists (select 1 from public.cohorts c where c.id = v_cohort and c.is_group) then raise exception 'This is not a group class'; end if;
  update public.members set active = false where id = p_member;
end $$;
revoke all on function public.remove_from_group(bigint) from public, anon;
grant execute on function public.remove_from_group(bigint) to authenticated;
