-- Reminders a day before and an hour before, for classes and assignment deadlines.
--   class:      ~24h before (sent 12–24h ahead) and ~1h before (10–60 min ahead)
--   assignment: same windows, only to students who haven't handed it in yet

alter table public.sessions add column reminded_day_at timestamptz;
alter table public.assignments add column reminded_day_at timestamptz;
alter table public.assignments add column reminded_hour_at timestamptz;

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

  -- assignments: a day before, to students who haven't submitted
  for a in
    select * from public.assignments
    where reminded_day_at is null
      and due_at > now() + interval '12 hours'
      and due_at <= now() + interval '24 hours'
    for update skip locked
  loop
    insert into public.email_outbox (to_email, to_name, subject, heading, body, cta_label, cta_url)
    select m.email, m.full_name,
      'Due tomorrow: ' || a.title,
      'Assignment due tomorrow',
      a.title || E'\nDue ' || private.when_pkt(a.due_at) || E'\nYou haven''t handed this in yet. Upload your work from the portal before the deadline.',
      'Open assignment',
      'https://cognifypk.com/portal/student/assignments/?open=' || a.id
    from public.members m
    where m.role = 'student' and m.active and m.cohort_id = a.cohort_id
      and not exists (select 1 from public.submissions x where x.assignment_id = a.id and x.member_id = m.id);
    update public.assignments set reminded_day_at = now() where id = a.id;
  end loop;

  -- assignments: an hour before, to students who haven't submitted
  for a in
    select * from public.assignments
    where reminded_hour_at is null
      and due_at > now() + interval '5 minutes'
      and due_at <= now() + interval '60 minutes'
    for update skip locked
  loop
    insert into public.email_outbox (to_email, to_name, subject, heading, body, cta_label, cta_url)
    select m.email, m.full_name,
      'Due in an hour: ' || a.title,
      'Assignment due within the hour',
      a.title || E'\nDue ' || private.when_pkt(a.due_at) || E'\nYou haven''t handed this in yet. Upload your work from the portal now.',
      'Submit now',
      'https://cognifypk.com/portal/student/assignments/?open=' || a.id
    from public.members m
    where m.role = 'student' and m.active and m.cohort_id = a.cohort_id
      and not exists (select 1 from public.submissions x where x.assignment_id = a.id and x.member_id = m.id);
    update public.assignments set reminded_hour_at = now() where id = a.id;
  end loop;
end $$;

-- a moved class gets fresh reminders
create or replace function private.reset_session_reminders() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.starts_at <> old.starts_at then
    new.reminded_at := null;
    new.reminded_day_at := null;
  end if;
  return new;
end $$;
create trigger reset_reminders_on_move before update of starts_at on public.sessions
  for each row execute function private.reset_session_reminders();

-- a moved deadline gets fresh reminders
create or replace function private.reset_assignment_reminders() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.due_at <> old.due_at then
    new.reminded_day_at := null;
    new.reminded_hour_at := null;
  end if;
  return new;
end $$;
create trigger reset_reminders_on_due_change before update of due_at on public.assignments
  for each row execute function private.reset_assignment_reminders();
