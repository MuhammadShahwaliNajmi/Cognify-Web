-- Each student's exam date (set by their teacher): the portal and app count down to it.
alter table public.cohorts add column exam_on date;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.portal_snapshot()'::regprocedure);
  d := replace(d, 'select id, name, board, subject, meet_url, join_code, teacher_id, archived_at from public.cohorts',
                  'select id, name, board, subject, meet_url, join_code, teacher_id, archived_at, exam_on from public.cohorts');
  if position('archived_at, exam_on' in d) = 0 then raise exception 'portal_snapshot: cohorts select not found'; end if;
  execute d;
end $$;
