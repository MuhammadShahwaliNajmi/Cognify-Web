-- Private comments on a piece of work (one thread per student per assignment, only
-- that student and their teacher can see it), like Google Classroom's private comments.
-- And a comment bank: each teacher's saved feedback phrases, on every device.

-- ---------- private comments ----------
create table public.work_comments (
  id bigint generated always as identity primary key,
  assignment_id bigint not null references public.assignments (id) on delete cascade,
  student_id bigint not null references public.members (id) on delete cascade,
  author_id bigint not null references public.members (id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index work_comments_thread_idx on public.work_comments (assignment_id, student_id, created_at);
alter table public.work_comments enable row level security;

-- the student whose thread it is, or a teacher of that class
create policy "student or their teacher reads the thread" on public.work_comments
  for select to authenticated
  using (
    student_id = (select private.member_id())
    or exists (select 1 from public.assignments a where a.id = assignment_id and a.cohort_id = any ((select private.taught_cohorts())::bigint[]))
  );

-- you write as yourself: a student in their own thread on their own class's work, or a teacher of that class
create policy "student or their teacher writes" on public.work_comments
  for insert to authenticated
  with check (
    author_id = (select private.member_id())
    and exists (
      select 1 from public.assignments a join public.members s on s.id = student_id
      where a.id = assignment_id and s.role = 'student' and s.cohort_id = a.cohort_id
        and (student_id = (select private.member_id()) or a.cohort_id = any ((select private.taught_cohorts())::bigint[]))
    )
  );
grant select, insert on public.work_comments to authenticated;

-- tell the other side (email, and a phone notification when they have one)
create or replace function private.notify_work_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_title text;
  v_cohort bigint;
  v_author text;
  v_teacher bigint;
  v_snip text := left(regexp_replace(new.body, '\s+', ' ', 'g'), 200);
begin
  select a.title, a.cohort_id into v_title, v_cohort from public.assignments a where a.id = new.assignment_id;
  select m.full_name into v_author from public.members m where m.id = new.author_id;
  if new.author_id = new.student_id then
    -- student → their teacher (or the admins when the class has none)
    select c.teacher_id into v_teacher from public.cohorts c where c.id = v_cohort;
    if v_teacher is not null then
      perform private.email_member(v_teacher, 'Comment from ' || v_author || ': ' || v_title, 'New comment on ' || v_title,
        v_author || ': ' || v_snip, 'Reply', 'https://cognifypk.com/app/?go=/comments/' || new.assignment_id || '/' || new.student_id);
    else
      perform private.email_member(m.id, 'Comment from ' || v_author || ': ' || v_title, 'New comment on ' || v_title,
        v_author || ': ' || v_snip, 'Reply', 'https://cognifypk.com/app/?go=/comments/' || new.assignment_id || '/' || new.student_id)
      from public.members m where m.role = 'teacher' and m.is_admin and m.active;
    end if;
  else
    -- teacher → the student
    perform private.email_member(new.student_id, 'Your teacher commented on ' || v_title, 'New comment on ' || v_title,
      v_author || ': ' || v_snip, 'Reply', 'https://cognifypk.com/app/?go=/comments/' || new.assignment_id || '/' || new.student_id);
  end if;
  return null;
end $$;
revoke all on function private.notify_work_comment() from public;

create trigger work_comment_notify after insert on public.work_comments
  for each row execute function private.notify_work_comment();

-- ---------- comment bank ----------
create table public.comment_bank (
  id bigint generated always as identity primary key,
  member_id bigint not null default private.member_id() references public.members (id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index comment_bank_member_idx on public.comment_bank (member_id);
alter table public.comment_bank enable row level security;
create policy "teachers keep their own comment bank" on public.comment_bank
  for all to authenticated
  using (member_id = (select private.member_id()) and (select private.is_teacher()))
  with check (member_id = (select private.member_id()) and (select private.is_teacher()));
grant select, insert, delete on public.comment_bank to authenticated;
