-- Monday morning summary for each teacher (email, and a phone notification when they
-- have the app's notifications on): this week's classes, hand-ins waiting to be marked,
-- work that went missing last week, and class requests waiting for an answer.
create or replace function private.teacher_weekly_summary()
returns void language plpgsql security definer set search_path = '' as $$
declare
  t record;
  v_classes int;
  v_mark int;
  v_missing int;
  v_requests int;
  v_body text;
begin
  for t in select m.id, m.full_name from public.members m where m.role = 'teacher' and m.active loop
    select count(*) into v_classes from public.sessions s join public.cohorts c on c.id = s.cohort_id
      where c.teacher_id = t.id and c.archived_at is null and not s.cancelled and s.starts_at >= now() and s.starts_at < now() + interval '7 days';
    select count(*) into v_mark from public.submissions x join public.assignments a on a.id = x.assignment_id join public.cohorts c on c.id = a.cohort_id
      where c.teacher_id = t.id and not exists (select 1 from public.feedback f where f.submission_id = x.id);
    select count(*) into v_missing from public.assignments a join public.cohorts c on c.id = a.cohort_id
      join public.members st on st.cohort_id = c.id and st.role = 'student' and st.active
      where c.teacher_id = t.id and c.archived_at is null and a.due_at < now() and a.due_at >= now() - interval '7 days'
        and not exists (select 1 from public.submissions x where x.assignment_id = a.id and x.member_id = st.id);
    select count(*) into v_requests from public.class_requests r join public.sessions s on s.id = r.session_id join public.cohorts c on c.id = s.cohort_id
      where c.teacher_id = t.id and r.status = 'pending';
    continue when v_classes + v_mark + v_missing + v_requests = 0;
    v_body := concat_ws(' · ',
      v_classes || ' class' || case when v_classes = 1 then '' else 'es' end || ' this week',
      case when v_mark > 0 then v_mark || ' hand-in' || case when v_mark = 1 then '' else 's' end || ' waiting to be marked' end,
      case when v_missing > 0 then v_missing || ' piece' || case when v_missing = 1 then '' else 's' end || ' of work missing from last week' end,
      case when v_requests > 0 then v_requests || ' class request' || case when v_requests = 1 then '' else 's' end || ' to answer' end);
    perform private.email_member(t.id, 'Your week at Concept Lab', 'Your week', v_body, 'Open the app', 'https://cognifypk.com/app/?go=/t');
  end loop;
end $$;
revoke all on function private.teacher_weekly_summary() from public;

-- Mondays 08:00 Pakistan time (03:00 UTC)
select cron.schedule('teacher-weekly-summary', '0 3 * * 1', 'select private.teacher_weekly_summary()');
