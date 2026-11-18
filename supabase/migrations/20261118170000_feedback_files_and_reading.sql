-- Feedback that gets read and acted on.
--
--   * feedback_files: teachers return files with the feedback (a marked copy, a model answer…)
--   * feedback.seen_at: when the student opened and confirmed reading it (the score shows after)
--   * feedback.reflection: the student's own next step, which the teacher can see
--   * changing the mark or comments makes the feedback "new" again for the student

alter table public.feedback
  add column if not exists seen_at timestamptz,
  add column if not exists reflection text check (reflection is null or char_length(reflection) <= 1000);

create table if not exists public.feedback_files (
  id bigint generated always as identity primary key,
  submission_id bigint not null references public.submissions (id) on delete cascade,
  drive_file_id text not null,
  file_name text not null check (char_length(file_name) between 1 and 200),
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
create index if not exists feedback_files_submission_id_idx on public.feedback_files (submission_id);

alter table public.feedback_files enable row level security;

create policy "teachers manage own feedback files" on public.feedback_files
  for all to authenticated
  using (submission_id in (
    select s.id from public.submissions s join public.assignments a on a.id = s.assignment_id
    where a.cohort_id = any ((select private.taught_cohorts())::bigint[])
  ))
  with check (submission_id in (
    select s.id from public.submissions s join public.assignments a on a.id = s.assignment_id
    where a.cohort_id = any ((select private.taught_cohorts())::bigint[])
  ));

create policy "students read own feedback files" on public.feedback_files
  for select to authenticated
  -- only once the work has been returned
  using (submission_id in (
    select s.id from public.submissions s join public.feedback f on f.submission_id = s.id
    where s.member_id = (select private.member_id())
  ));

grant select, insert, update, delete on public.feedback_files to authenticated;

-- new mark or comments → unread again
create or replace function private.feedback_changed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.marks, new.feedback, new.strengths, new.improvements) is distinct from (old.marks, old.feedback, old.strengths, old.improvements) then
    new.seen_at := null;
  end if;
  return new;
end $$;

drop trigger if exists feedback_unread_on_change on public.feedback;
create trigger feedback_unread_on_change
  before update on public.feedback
  for each row execute function private.feedback_changed();

-- student: "I've read it" (+ optional next step)
create or replace function public.acknowledge_feedback(p_submission bigint, p_reflection text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.submissions s where s.id = p_submission and s.member_id = private.member_id()) then
    raise exception 'This isn''t your work' using errcode = '42501';
  end if;
  update public.feedback
  set seen_at = coalesce(seen_at, now()),
      reflection = case when p_reflection is null then reflection else nullif(btrim(left(p_reflection, 1000)), '') end
  where submission_id = p_submission;
end $$;

revoke all on function public.acknowledge_feedback(bigint, text) from public, anon;
grant execute on function public.acknowledge_feedback(bigint, text) to authenticated;

-- the snapshot carries read status, the student's next step and the returned files
do $$
declare d text;
begin
  d := pg_get_functiondef('public.portal_snapshot()'::regprocedure);
  d := replace(d,
    'f.marks, f.feedback, f.strengths, f.improvements, f.marked_at',
    'f.marks, f.feedback, f.strengths, f.improvements, f.marked_at, f.seen_at, f.reflection,
               (select coalesce(jsonb_agg(jsonb_build_object(''id'', ff.id, ''name'', ff.file_name, ''mime'', ff.mime_type, ''size'', ff.size_bytes) order by ff.id), ''[]''::jsonb)
                from public.feedback_files ff where ff.submission_id = s.id) as feedback_files');
  if position('as feedback_files' in d) = 0 then
    raise exception 'portal_snapshot: feedback columns not found';
  end if;
  execute d;
end $$;

-- the "work returned" email points to the feedback, not the score (comments first)
create or replace function private.notify_feedback()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub public.submissions;
  a public.assignments;
begin
  select * into sub from public.submissions where id = new.submission_id;
  select * into a from public.assignments where id = sub.assignment_id;
  perform private.email_member(sub.member_id,
    'Feedback returned: ' || a.title,
    'Your work has been returned',
    a.title || E'\nYour teacher has left feedback for you. Read it first, then see your score.',
    'Read feedback',
    'https://cognifypk.com/portal/student/' || case when a.time_limit_min is not null then 'assessments' else 'assignments' end || '/?open=' || a.id);
  return null;
end $$;

-- the storage function (server only) looks these up when returning / removing feedback files
grant select on public.submissions to service_role;
grant select, delete on public.feedback_files to service_role;
