-- How a piece of work is graded: marks out of a total, pass / fail, complete / incomplete, or no grade
-- (feedback only). Pass/fail and complete are stored as 1 / 0 out of 1.
alter table public.assignments
  add column grading text not null default 'marks'
  check (grading in ('marks', 'pass_fail', 'complete', 'none'));

-- the topic is now just the title: allow an empty topic and empty instructions
alter table public.assignments alter column unit set default '';
alter table public.assignments alter column brief set default '';

-- include it in the portal snapshot
do $$
declare d text;
begin
  d := pg_get_functiondef('public.portal_snapshot'::regproc);
  d := replace(d, 'select id, cohort_id, title, kind, strand, unit, brief, due_at, max_marks, time_limit_min,',
                  'select id, cohort_id, title, kind, strand, unit, brief, due_at, max_marks, time_limit_min, grading,');
  if position('time_limit_min, grading' in d) = 0 then raise exception 'portal_snapshot not patched'; end if;
  execute d;
end $$;

-- the new-assignment email says how it is graded
do $$
declare d text;
begin
  d := pg_get_functiondef('private.notify_assignment'::regproc);
  d := replace(d, $q$new.kind || ' · ' || new.max_marks || E' marks\nDue '$q$,
    $q$new.kind || ' · ' || case new.grading when 'pass_fail' then 'Pass / fail' when 'complete' then 'Complete / incomplete' when 'none' then 'Feedback only' else new.max_marks || ' marks' end || E'\nDue '$q$);
  if position('Feedback only' in d) = 0 then raise exception 'notify_assignment not patched'; end if;
  execute d;
end $$;

-- every student's resources: Notes, Books, Other (the old empty starter folders go)
create or replace function private.seed_folders(p_cohort bigint)
returns void language sql security definer set search_path = '' as $$
  insert into public.folders (cohort_id, name)
  select p_cohort, n from unnest(array['Notes', 'Books', 'Other']) as n
  where not exists (select 1 from public.folders f where f.cohort_id = p_cohort and f.parent_id is null and f.name = n)
$$;

-- anything filed in a folder that is going moves to Other first
select private.seed_folders(c.id) from public.cohorts c;
update public.resources r set folder_id = o.id
from public.folders f, public.folders o
where r.folder_id = f.id and f.parent_id is null and f.name not in ('Notes', 'Books', 'Other')
  and o.cohort_id = f.cohort_id and o.parent_id is null and o.name = 'Other';
update public.folders s set parent_id = o.id
from public.folders f, public.folders o
where s.parent_id = f.id and f.parent_id is null and f.name not in ('Notes', 'Books', 'Other')
  and o.cohort_id = f.cohort_id and o.parent_id is null and o.name = 'Other';
delete from public.folders f where f.parent_id is null and f.name not in ('Notes', 'Books', 'Other');
