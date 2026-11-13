-- Timed assessments.
--
-- An assessment is an assignment with a time limit:
--   * due_at          = the time by which the student must START
--   * time_limit_min  = how long they have once they start (counted by the server)
-- Questions (typed and/or a question paper) stay hidden until the student starts.
-- One attempt per student; a teacher can allow a retake by deleting the attempt.
-- Submissions are accepted until the attempt ends + 2 minutes' grace.

alter table public.assignments
  add column time_limit_min int check (time_limit_min is null or time_limit_min between 5 and 600);

alter table public.submissions
  add column answer_text text check (answer_text is null or char_length(answer_text) <= 50000);
alter table public.submissions alter column file_name drop not null;

-- ---------- attempts ----------
create table public.assessment_attempts (
  assignment_id  bigint not null references public.assignments (id) on delete cascade,
  member_id      bigint not null references public.members (id) on delete cascade,
  started_at     timestamptz not null default now(),
  ends_at        timestamptz not null,
  primary key (assignment_id, member_id)
);
create index assessment_attempts_member_id_idx on public.assessment_attempts (member_id);
alter table public.assessment_attempts enable row level security;
grant select, delete on public.assessment_attempts to authenticated;   -- inserts only through start_assessment()
grant select on public.assessment_attempts to service_role;

create policy "students read own attempts" on public.assessment_attempts
  for select to authenticated
  using (member_id = (select private.member_id()));
create policy "teachers manage attempts" on public.assessment_attempts
  for all to authenticated
  using ((select private.is_teacher()))
  with check ((select private.is_teacher()));

-- ---------- questions (hidden until the student starts) ----------
create table public.assessment_questions (
  assignment_id  bigint primary key references public.assignments (id) on delete cascade,
  body           text not null check (char_length(body) <= 50000)
);
alter table public.assessment_questions enable row level security;
grant select, insert, update, delete on public.assessment_questions to authenticated;

create policy "students read questions once started" on public.assessment_questions
  for select to authenticated
  using (exists (
    select 1 from public.assessment_attempts t
    where t.assignment_id = assessment_questions.assignment_id
      and t.member_id = (select private.member_id())
  ));
create policy "teachers manage questions" on public.assessment_questions
  for all to authenticated
  using ((select private.is_teacher()))
  with check ((select private.is_teacher()));

-- ---------- start (one attempt; must be before the start-by time) ----------
create or replace function public.start_assessment(p_assignment bigint)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  me bigint := private.member_id();
  a public.assignments;
  t public.assessment_attempts;
begin
  select * into a from public.assignments
  where id = p_assignment and cohort_id = private.cohort_id() and time_limit_min is not null;
  if not found or me is null then
    raise exception 'Assessment not found';
  end if;

  select * into t from public.assessment_attempts where assignment_id = a.id and member_id = me;
  if found then
    return t.ends_at;  -- already started: same clock, no restart
  end if;
  if now() > a.due_at then
    raise exception 'This assessment has closed';
  end if;

  insert into public.assessment_attempts (assignment_id, member_id, started_at, ends_at)
  values (a.id, me, now(), now() + make_interval(mins => a.time_limit_min))
  returning * into t;
  return t.ends_at;
end $$;
revoke all on function public.start_assessment(bigint) from public, anon;
grant execute on function public.start_assessment(bigint) to authenticated;

-- ---------- submissions: timed work only inside the attempt (+2 min grace) ----------
create or replace function private.can_submit(p_assignment bigint)
returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when a.time_limit_min is null then true
    else exists (
      select 1 from public.assessment_attempts t
      where t.assignment_id = a.id
        and t.member_id = private.member_id()
        and now() <= t.ends_at + interval '2 minutes'
    )
  end
  from public.assignments a
  where a.id = p_assignment
$$;
revoke all on function private.can_submit(bigint) from public;
grant execute on function private.can_submit(bigint) to authenticated;

drop policy "students submit own work" on public.submissions;
create policy "students submit own work" on public.submissions
  for insert to authenticated
  with check (
    member_id = (select private.member_id())
    and assignment_id in (select a.id from public.assignments a where a.cohort_id = (select private.cohort_id()))
    and private.can_submit(assignment_id)
  );

drop policy "students replace unmarked work" on public.submissions;
create policy "students replace unmarked work" on public.submissions
  for update to authenticated
  using (member_id = (select private.member_id()) and not private.submission_is_marked(id))
  with check (
    member_id = (select private.member_id())
    and assignment_id in (select a.id from public.assignments a where a.cohort_id = (select private.cohort_id()))
    and private.can_submit(assignment_id)
  );

-- ---------- emails: word assessments differently ----------
create or replace function private.notify_assignment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.time_limit_min is not null then
    perform private.email_students(new.cohort_id,
      'New assessment: ' || new.title,
      'New timed assessment',
      new.title || E'\nStart before ' || private.when_pkt(new.due_at)
        || E'\nYou will have ' || new.time_limit_min || ' minutes once you press Start. Make sure you have time before you begin.',
      'Open assessment',
      'https://cognifypk.com/portal/student/assessments/?open=' || new.id);
  else
    perform private.email_students(new.cohort_id,
      'New assignment: ' || new.title,
      'New assignment',
      new.title || E'\n' || new.kind || ' · ' || new.max_marks || E' marks\nDue ' || private.when_pkt(new.due_at),
      'Open assignment',
      'https://cognifypk.com/portal/student/assignments/?open=' || new.id);
  end if;
  return null;
end $$;

create or replace function private.enqueue_class_reminders()
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
  a public.assignments;
begin
  -- classes: a day before
  for s in
    select * from public.sessions
    where not cancelled and reminded_day_at is null
      and starts_at > now() + interval '12 hours'
      and starts_at <= now() + interval '24 hours'
    for update skip locked
  loop
    perform private.email_students(s.cohort_id,
      'Reminder: class on ' || private.when_pkt(s.starts_at),
      'Class tomorrow',
      'You have a class coming up.' || E'\n' || s.title || ' · ' || private.when_pkt(s.starts_at) || ' (' || s.duration_min || ' min)'
        || E'\nYou can join from your portal calendar. If you can''t make it, request a reschedule there.',
      'Open calendar',
      'https://cognifypk.com/portal/student/calendar/');
    update public.sessions set reminded_day_at = now() where id = s.id;
  end loop;

  -- classes: an hour before
  for s in
    select * from public.sessions
    where not cancelled and reminded_at is null
      and starts_at > now() + interval '10 minutes'
      and starts_at <= now() + interval '60 minutes'
    for update skip locked
  loop
    perform private.email_students(s.cohort_id,
      'Class at ' || to_char(s.starts_at at time zone 'Asia/Karachi', 'FMHH12:MI AM') || ' today',
      'Your class starts within the hour',
      s.title || ' · ' || private.when_pkt(s.starts_at) || ' (' || s.duration_min || ' min)'
        || E'\nJoin from your portal when you are ready. You are marked present when you join.',
      'Join class',
      'https://cognifypk.com/portal/student/calendar/');
    update public.sessions set reminded_at = now() where id = s.id;
  end loop;

  -- assignments & assessments: a day before (students who haven't handed in / started)
  for a in
    select * from public.assignments
    where reminded_day_at is null
      and due_at > now() + interval '12 hours'
      and due_at <= now() + interval '24 hours'
    for update skip locked
  loop
    insert into public.email_outbox (to_email, to_name, subject, heading, body, cta_label, cta_url)
    select m.email, m.full_name,
      case when a.time_limit_min is null then 'Due tomorrow: ' else 'Start by tomorrow: ' end || a.title,
      case when a.time_limit_min is null then 'Assignment due tomorrow' else 'Assessment closes tomorrow' end,
      case when a.time_limit_min is null
        then a.title || E'\nDue ' || private.when_pkt(a.due_at) || E'\nYou haven''t handed this in yet. Upload your work from the portal before the deadline.'
        else a.title || E'\nStart before ' || private.when_pkt(a.due_at) || E'\nYou will have ' || a.time_limit_min || ' minutes once you press Start.'
      end,
      case when a.time_limit_min is null then 'Open assignment' else 'Open assessment' end,
      'https://cognifypk.com/portal/student/' || case when a.time_limit_min is null then 'assignments' else 'assessments' end || '/?open=' || a.id
    from public.members m
    where m.role = 'student' and m.active and m.cohort_id = a.cohort_id
      and not exists (select 1 from public.submissions x where x.assignment_id = a.id and x.member_id = m.id)
      and not exists (select 1 from public.assessment_attempts t where t.assignment_id = a.id and t.member_id = m.id);
    update public.assignments set reminded_day_at = now() where id = a.id;
  end loop;

  -- assignments & assessments: an hour before
  for a in
    select * from public.assignments
    where reminded_hour_at is null
      and due_at > now() + interval '5 minutes'
      and due_at <= now() + interval '60 minutes'
    for update skip locked
  loop
    insert into public.email_outbox (to_email, to_name, subject, heading, body, cta_label, cta_url)
    select m.email, m.full_name,
      case when a.time_limit_min is null then 'Due in an hour: ' else 'Last hour to start: ' end || a.title,
      case when a.time_limit_min is null then 'Assignment due within the hour' else 'Assessment closes within the hour' end,
      case when a.time_limit_min is null
        then a.title || E'\nDue ' || private.when_pkt(a.due_at) || E'\nYou haven''t handed this in yet. Upload your work from the portal now.'
        else a.title || E'\nStart before ' || private.when_pkt(a.due_at) || E'\nYou will have ' || a.time_limit_min || ' minutes once you press Start.'
      end,
      case when a.time_limit_min is null then 'Submit now' else 'Start assessment' end,
      'https://cognifypk.com/portal/student/' || case when a.time_limit_min is null then 'assignments' else 'assessments' end || '/?open=' || a.id
    from public.members m
    where m.role = 'student' and m.active and m.cohort_id = a.cohort_id
      and not exists (select 1 from public.submissions x where x.assignment_id = a.id and x.member_id = m.id)
      and not exists (select 1 from public.assessment_attempts t where t.assignment_id = a.id and t.member_id = m.id);
    update public.assignments set reminded_hour_at = now() where id = a.id;
  end loop;
end $$;
