-- Portal snapshot (one round trip instead of thirteen) and daily housekeeping.

-- ---------------------------------------------------------------------------
-- Everything the signed-in member can see, in one request.
-- SECURITY INVOKER: each sub-select runs under the caller's row-level security,
-- so teachers get every student and a student gets only their own records.
-- ---------------------------------------------------------------------------
create or replace function public.portal_snapshot()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'me', (select private.member_id()),

    'members', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.full_name), '[]'::jsonb)
      from (
        select id, email, role, full_name, title, plan, cohort_id, predicted, target
        from public.members
        where active
      ) x),

    'cohorts', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.id), '[]'::jsonb)
      from (select id, name, board, subject, meet_url, join_code from public.cohorts) x),

    'sessions', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.starts_at), '[]'::jsonb)
      from (
        select s.id, s.cohort_id, s.title, s.strand, s.unit, s.starts_at, s.duration_min, s.meet_url, s.recording_url,
               coalesce(
                 (select jsonb_object_agg(a.member_id::text, a.present) from public.attendance a where a.session_id = s.id),
                 '{}'::jsonb
               ) as attendance
        from public.sessions s
        where not s.cancelled and s.starts_at >= now() - interval '180 days'
      ) x),

    'resources', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
      from (
        select id, cohort_id, folder_id, session_id, title, type, strand, unit, drive_url, drive_file_id, mime_type, size_bytes, created_at
        from public.resources
      ) x),

    'folders', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.name), '[]'::jsonb)
      from (select id, cohort_id, parent_id, name from public.folders) x),

    'assignments', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.due_at), '[]'::jsonb)
      from (
        select id, cohort_id, title, kind, strand, unit, brief, due_at, max_marks, time_limit_min,
               attachment_url, attachment_file_id, attachment_name, attachment_mime
        from public.assignments
      ) x),

    'submissions', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.submitted_at), '[]'::jsonb)
      from (
        select s.id, s.assignment_id, s.member_id, s.file_name, s.file_size, s.file_path, s.drive_file_id, s.mime_type,
               s.answer_text, s.note, s.submitted_at,
               f.marks, f.feedback, f.strengths, f.improvements, f.marked_at
        from public.submissions s
        left join public.feedback f on f.submission_id = s.id
      ) x),

    'announcements', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
      from (select id, cohort_id, title, body, created_at from public.announcements) x),

    'mastery', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.unit), '[]'::jsonb)
      from (select member_id, unit, strand, score, fix from public.mastery) x),

    'requests', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
      from (
        select id, session_id, member_id, kind, proposed_start, note, status, created_at
        from public.class_requests
      ) x),

    -- timed assessments: a student's own attempts, and questions only once started
    'attempts', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.started_at), '[]'::jsonb)
      from (select assignment_id, member_id, started_at, ends_at from public.assessment_attempts) x),

    'questions', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.assignment_id), '[]'::jsonb)
      from (select assignment_id, body from public.assessment_questions) x)
  );
$$;

revoke all on function public.portal_snapshot() from public, anon;
grant execute on function public.portal_snapshot() to authenticated;

-- ---------------------------------------------------------------------------
-- Advisor clean-ups
-- ---------------------------------------------------------------------------
create index if not exists drive_oauth_states_member_id_idx on public.drive_oauth_states (member_id);

alter table private.join_attempts
  add column if not exists id bigint generated always as identity primary key;

-- ---------------------------------------------------------------------------
-- Daily housekeeping: these tables only ever grew.
--   * cron.job_run_details gets ~1,700 rows a day from the email and reminder jobs
--   * delivered emails, used join attempts and abandoned storage sign-ins
-- ---------------------------------------------------------------------------
create or replace function private.housekeeping()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from cron.job_run_details where end_time < now() - interval '7 days';
  delete from public.email_outbox where created_at < now() - interval '30 days';
  delete from private.join_attempts where at < now() - interval '1 day';
  delete from public.drive_oauth_states where created_at < now() - interval '1 day';
$$;

revoke all on function private.housekeeping() from public, anon, authenticated;

select cron.schedule('housekeeping', '20 0 * * *', 'select private.housekeeping()');
