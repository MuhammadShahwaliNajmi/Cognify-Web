-- Fix: "infinite recursion detected in policy for relation submissions".
-- The student UPDATE policy on submissions checked public.feedback, whose
-- student SELECT policy checks public.submissions → a policy cycle (hit by the
-- upsert the portal uses when handing in work). A SECURITY DEFINER helper reads
-- feedback without re-entering RLS, breaking the cycle. It only answers for the
-- caller's own submission (or for a teacher).

create or replace function private.submission_is_marked(p_submission_id bigint)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.feedback f
    join public.submissions s on s.id = f.submission_id
    where f.submission_id = p_submission_id
      and (s.member_id = private.member_id() or private.is_teacher())
  );
$$;
revoke all on function private.submission_is_marked(bigint) from public, anon;
grant execute on function private.submission_is_marked(bigint) to authenticated;

drop policy "students replace unmarked work" on public.submissions;
create policy "students replace unmarked work" on public.submissions for update to authenticated
  using (
    member_id = (select private.member_id())
    and not private.submission_is_marked(id)
  )
  with check (
    member_id = (select private.member_id())
    and assignment_id in (select a.id from public.assignments a where a.cohort_id = (select private.cohort_id()))
  );
