-- Email updates.
--
-- Database events put messages into public.email_outbox; a cron job pokes the
-- `send-emails` Edge Function, which renders and sends them through Resend
-- (RESEND_API_KEY is an Edge Function secret, set in the dashboard).
--
--   students: new assignment, announcement, class cancelled / rescheduled,
--             request declined, feedback returned, reminder 1 hour before class
--   teachers: class request, new submission

create extension if not exists pg_net with schema extensions;

alter table public.sessions add column reminded_at timestamptz;

create table public.email_outbox (
  id          bigint generated always as identity primary key,
  to_email    text not null,
  to_name     text,
  subject     text not null,
  heading     text not null,
  body        text not null,
  cta_label   text,
  cta_url     text,
  created_at  timestamptz not null default now(),
  claimed_at  timestamptz,
  sent_at     timestamptz,
  attempts    int not null default 0,
  last_error  text
);
create index email_outbox_pending_idx on public.email_outbox (id) where sent_at is null;
alter table public.email_outbox enable row level security;   -- no policies: only the Edge Function (secret key) touches it
grant select, update on public.email_outbox to service_role;

-- ---------- helpers ----------
create or replace function private.when_pkt(ts timestamptz)
returns text language sql immutable set search_path = '' as $$
  select to_char(ts at time zone 'Asia/Karachi', 'FMDay, FMDD FMMonth, FMHH12:MI AM')
$$;

-- every active student in a cohort (or all students when cohort is null)
create or replace function private.email_students(p_cohort bigint, p_subject text, p_heading text, p_body text, p_cta text, p_url text)
returns void language sql security definer set search_path = '' as $$
  insert into public.email_outbox (to_email, to_name, subject, heading, body, cta_label, cta_url)
  select m.email, m.full_name, p_subject, p_heading, p_body, p_cta, p_url
  from public.members m
  where m.role = 'student' and m.active and (p_cohort is null or m.cohort_id = p_cohort)
$$;

create or replace function private.email_teachers(p_subject text, p_heading text, p_body text, p_cta text, p_url text)
returns void language sql security definer set search_path = '' as $$
  insert into public.email_outbox (to_email, to_name, subject, heading, body, cta_label, cta_url)
  select m.email, m.full_name, p_subject, p_heading, p_body, p_cta, p_url
  from public.members m
  where m.role = 'teacher' and m.active
$$;

create or replace function private.email_member(p_member bigint, p_subject text, p_heading text, p_body text, p_cta text, p_url text)
returns void language sql security definer set search_path = '' as $$
  insert into public.email_outbox (to_email, to_name, subject, heading, body, cta_label, cta_url)
  select m.email, m.full_name, p_subject, p_heading, p_body, p_cta, p_url
  from public.members m
  where m.id = p_member and m.active
$$;

revoke all on function private.email_students(bigint, text, text, text, text, text) from public;
revoke all on function private.email_teachers(text, text, text, text, text) from public;
revoke all on function private.email_member(bigint, text, text, text, text, text) from public;

-- ---------- triggers ----------
create or replace function private.notify_assignment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.email_students(new.cohort_id,
    'New assignment: ' || new.title,
    'New assignment',
    new.title || E'\n' || new.kind || ' · ' || new.max_marks || E' marks\nDue ' || private.when_pkt(new.due_at),
    'Open assignment',
    'https://cognifypk.com/portal/student/assignments/?open=' || new.id);
  return null;
end $$;
create trigger email_on_assignment after insert on public.assignments
  for each row execute function private.notify_assignment();

create or replace function private.notify_announcement() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.email_students(new.cohort_id,
    new.title,
    new.title,
    new.body,
    'Open portal',
    'https://cognifypk.com/portal/student/announcements/');
  return null;
end $$;
create trigger email_on_announcement after insert on public.announcements
  for each row execute function private.notify_announcement();

-- a class cancelled by the teacher (a reschedule sends its own email instead)
create or replace function private.notify_session_cancelled() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.cancelled and not old.cancelled and new.starts_at > now()
     and coalesce(current_setting('app.rescheduling', true), '') <> '1' then
    perform private.email_students(new.cohort_id,
      'Class cancelled: ' || private.when_pkt(new.starts_at),
      'Class cancelled',
      'Your class on ' || private.when_pkt(new.starts_at) || ' has been cancelled.',
      'Open calendar',
      'https://cognifypk.com/portal/student/calendar/');
  end if;
  return null;
end $$;
create trigger email_on_session_cancelled after update of cancelled on public.sessions
  for each row execute function private.notify_session_cancelled();

create or replace function private.notify_request() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  who text;
  s public.sessions;
begin
  select full_name into who from public.members where id = new.member_id;
  select * into s from public.sessions where id = new.session_id;
  if tg_op = 'INSERT' then
    perform private.email_teachers(
      who || ' asks to ' || case when new.kind = 'cancel' then 'cancel a class' else 'reschedule a class' end,
      'Class request from ' || who,
      'Class: ' || private.when_pkt(s.starts_at)
        || case when new.kind = 'reschedule' then E'\nNew time requested: ' || private.when_pkt(new.proposed_start) else E'\nRequest: cancel' end
        || case when new.note is not null then E'\nReason: ' || new.note else '' end,
      'Review request',
      'https://cognifypk.com/portal/teacher/');
  elsif new.status = 'declined' and old.status = 'pending' then
    perform private.email_member(new.member_id,
      'Request declined',
      'Your request was declined',
      'Your request to ' || case when new.kind = 'cancel' then 'cancel' else 'reschedule' end
        || ' the class on ' || private.when_pkt(s.starts_at) || ' was declined. The class goes ahead as planned.',
      'Open calendar',
      'https://cognifypk.com/portal/student/calendar/');
  end if;
  return null;
end $$;
create trigger email_on_request after insert or update of status on public.class_requests
  for each row execute function private.notify_request();

create or replace function private.notify_feedback() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  sub public.submissions;
  a public.assignments;
begin
  select * into sub from public.submissions where id = new.submission_id;
  select * into a from public.assignments where id = sub.assignment_id;
  perform private.email_member(sub.member_id,
    'Feedback returned: ' || a.title,
    'Your work has been marked',
    a.title || E'\nScore: ' || new.marks || ' / ' || a.max_marks,
    'See feedback',
    'https://cognifypk.com/portal/student/assignments/?open=' || a.id);
  return null;
end $$;
create trigger email_on_feedback after insert on public.feedback
  for each row execute function private.notify_feedback();

create or replace function private.notify_submission() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  who text;
  a public.assignments;
begin
  select full_name into who from public.members where id = new.member_id;
  select * into a from public.assignments where id = new.assignment_id;
  perform private.email_teachers(
    who || ' submitted ' || a.title,
    'New submission',
    who || E' handed in\n' || a.title,
    'Mark it',
    'https://cognifypk.com/portal/teacher/submissions/?open=' || new.id);
  return null;
end $$;
create trigger email_on_submission after insert on public.submissions
  for each row execute function private.notify_submission();

-- ---------- reschedule: email students with the old and new time ----------
create or replace function public.reschedule_session(p_session bigint, p_start timestamptz, p_duration int)
returns bigint
language plpgsql
security invoker
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
  if p_duration not between 15 and 240 then
    raise exception 'Class length must be between 15 and 240 minutes';
  end if;

  select * into s from public.sessions where id = p_session and not cancelled for update;
  if not found then
    raise exception 'Class not found';
  end if;
  if s.starts_at + make_interval(mins => s.duration_min) <= now() then
    raise exception 'This class has already finished';
  end if;

  -- the cancel half of a move is not a cancellation email
  perform set_config('app.rescheduling', '1', true);

  select * into clash from public.sessions
  where cohort_id = s.cohort_id and starts_at = p_start and id <> s.id;

  if found and clash.cancelled then
    update public.sessions set cancelled = false, duration_min = p_duration, reminded_at = null where id = clash.id;
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
    update public.sessions set starts_at = p_start, duration_min = p_duration, reminded_at = null where id = s.id;
    new_id := s.id;
  end if;

  perform set_config('app.rescheduling', '', true);

  if p_start <> s.starts_at then
    perform private.email_students(s.cohort_id,
      'Class rescheduled: ' || private.when_pkt(p_start),
      'Class rescheduled',
      'Your class on ' || private.when_pkt(s.starts_at) || E' has moved to\n' || private.when_pkt(p_start) || ' (' || p_duration || ' min).',
      'Open calendar',
      'https://cognifypk.com/portal/student/calendar/');
  end if;
  return new_id;
end;
$$;

-- ---------- reminders: about an hour before each class ----------
create or replace function private.enqueue_class_reminders()
returns void language plpgsql security definer set search_path = '' as $$
declare
  s public.sessions;
begin
  for s in
    select * from public.sessions
    where not cancelled and reminded_at is null
      and starts_at > now() + interval '10 minutes'
      and starts_at <= now() + interval '60 minutes'
    for update skip locked
  loop
    perform private.email_students(s.cohort_id,
      'Class at ' || to_char(s.starts_at at time zone 'Asia/Karachi', 'FMHH12:MI AM') || ' today',
      'Your class starts soon',
      s.title || E'\n' || private.when_pkt(s.starts_at) || ' (' || s.duration_min || ' min)',
      'Join class',
      'https://cognifypk.com/portal/student/calendar/');
    update public.sessions set reminded_at = now() where id = s.id;
  end loop;
end $$;

-- ---------- Edge Function support: claim a batch of pending emails ----------
create or replace function public.claim_emails(p_limit int default 40)
returns setof public.email_outbox
language sql security definer set search_path = '' as $$
  update public.email_outbox o
  set claimed_at = now(), attempts = o.attempts + 1
  where o.id in (
    select id from public.email_outbox
    where sent_at is null and attempts < 5
      and (claimed_at is null or claimed_at < now() - interval '5 minutes')
    order by id
    limit p_limit
    for update skip locked
  )
  returning o.*
$$;
revoke all on function public.claim_emails(int) from public, anon, authenticated;
grant execute on function public.claim_emails(int) to service_role;

create or replace function private.dispatch_emails()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.email_outbox where sent_at is null and attempts < 5) then
    perform net.http_post(
      url := 'https://shrgjfevwjbqlzpqqfck.supabase.co/functions/v1/send-emails',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := '{}'::jsonb
    );
  end if;
end $$;

select cron.schedule('class-reminders', '*/5 * * * *', 'select private.enqueue_class_reminders()');
select cron.schedule('send-emails', '* * * * *', 'select private.dispatch_emails()');
