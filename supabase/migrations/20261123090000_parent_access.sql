-- Parent access: a teacher adds a parent's Google email to a student. The parent signs in
-- with that Google account and sees the student's portal (classes, attendance, work, marks,
-- feedback, announcements, files) — read-only: the database refuses their changes.

create table public.parent_logins (
  email text primary key check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  student_id bigint not null references public.members (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index parent_logins_student_idx on public.parent_logins (student_id);
alter table public.parent_logins enable row level security;

-- teachers manage parents of their own students
create policy "teachers manage parents of their students" on public.parent_logins
  for all to authenticated
  using (exists (select 1 from public.members s where s.id = student_id and s.role = 'student' and s.cohort_id = any ((select private.taught_cohorts())::bigint[])))
  with check (exists (select 1 from public.members s where s.id = student_id and s.role = 'student' and s.cohort_id = any ((select private.taught_cohorts())::bigint[])));
grant select, insert, delete on public.parent_logins to authenticated;

-- the student a signed-in parent looks after (null for everyone else; members' own accounts come first)
create or replace function private.parent_child()
returns bigint language sql stable security definer set search_path = '' as $$
  select p.student_id
  from public.parent_logins p join public.members s on s.id = p.student_id and s.active and s.role = 'student'
  where p.email = private.current_email()
    and not exists (select 1 from public.members m where m.email = private.current_email() and m.active);
$$;

create or replace function private.is_parent()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.parent_child() is not null;
$$;

-- a parent acts as their child for reading
create or replace function private.member_id()
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select m.id from public.members m where m.email = private.current_email() and m.active),
    private.parent_child());
$$;

create or replace function private.cohort_id()
returns bigint language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select m.cohort_id from public.members m where m.email = private.current_email() and m.active and m.role = 'student'),
    (select m.cohort_id from public.members m where m.id = private.parent_child()));
$$;

revoke all on function private.parent_child() from public;
revoke all on function private.is_parent() from public;
grant execute on function private.parent_child() to authenticated;
grant execute on function private.is_parent() to authenticated;

-- the parent can read their child's member row
drop policy "members read own row" on public.members;
create policy "members read own row" on public.members
  for select to authenticated
  using (email = (select private.current_email()) or id = (select private.parent_child()));

-- parents look, they don't change: refuse their writes where students can write
create policy "parents are read-only" on public.work_comments as restrictive for insert to authenticated
  with check (not (select private.is_parent()));
do $$
declare t text;
begin
  foreach t in array array['submissions', 'class_requests', 'attendance'] loop
    execute format('create policy "parents cannot add" on public.%I as restrictive for insert to authenticated with check (not (select private.is_parent()))', t);
    execute format('create policy "parents cannot change" on public.%I as restrictive for update to authenticated using (not (select private.is_parent())) with check (not (select private.is_parent()))', t);
    execute format('create policy "parents cannot remove" on public.%I as restrictive for delete to authenticated using (not (select private.is_parent()))', t);
  end loop;
end $$;

-- …and the student actions that run as functions
do $$
declare f text; d text;
begin
  foreach f in array array['public.acknowledge_feedback(bigint,text)', 'public.start_assessment(bigint)'] loop
    d := pg_get_functiondef(f::regprocedure);
    d := regexp_replace(d, '\mbegin\M', 'begin
  if private.is_parent() then raise exception ''Parents can view this but not change it.''; end if;', 'i');
    if position('is_parent' in d) = 0 then raise exception 'guard not added to %', f; end if;
    execute d;
  end loop;
end $$;

-- a parent signing in: who they are looking after (for the "Parent view" label)
create or replace function public.my_parent_child()
returns bigint language sql stable security definer set search_path = '' as $$
  select private.parent_child();
$$;
revoke all on function public.my_parent_child() from public, anon;
grant execute on function public.my_parent_child() to authenticated;
