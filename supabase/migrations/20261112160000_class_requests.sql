-- Students can ask to reschedule or cancel an upcoming class; teachers approve or decline.

create table public.class_requests (
  id              bigint generated always as identity primary key,
  session_id      bigint not null references public.sessions (id) on delete cascade,
  member_id       bigint not null references public.members (id) on delete cascade,
  kind            text not null check (kind in ('reschedule', 'cancel')),
  proposed_start  timestamptz,
  note            text check (note is null or char_length(note) <= 500),
  status          text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  constraint reschedule_has_time check (kind = 'cancel' or proposed_start is not null)
);
create index class_requests_session_id_idx on public.class_requests (session_id);
create index class_requests_member_id_idx on public.class_requests (member_id);
-- one open request per class per student
create unique index class_requests_one_pending on public.class_requests (session_id, member_id) where status = 'pending';

alter table public.class_requests enable row level security;
grant select, insert, update, delete on public.class_requests to authenticated;

create policy "students read own requests" on public.class_requests
  for select to authenticated
  using (member_id = (select private.member_id()));

create policy "students request changes to their upcoming classes" on public.class_requests
  for insert to authenticated
  with check (
    member_id = (select private.member_id())
    and status = 'pending'
    and resolved_at is null
    and (proposed_start is null or proposed_start > now())
    and exists (
      select 1 from public.sessions s
      where s.id = session_id
        and s.cohort_id = (select private.cohort_id())
        and not s.cancelled
        and s.starts_at + make_interval(mins => s.duration_min) > now()
    )
  );

create policy "students withdraw own pending requests" on public.class_requests
  for delete to authenticated
  using (member_id = (select private.member_id()) and status = 'pending');

create policy "teachers manage requests" on public.class_requests
  for all to authenticated
  using ((select private.is_teacher()))
  with check ((select private.is_teacher()));

-- Approve (apply the change) or decline, in one transaction.
create or replace function public.resolve_class_request(p_request bigint, p_approve boolean)
returns void
language plpgsql
security invoker            -- caller's RLS applies: only teachers can update requests / sessions
set search_path = ''
as $$
declare
  r public.class_requests;
  s public.sessions;
begin
  if not (select private.is_teacher()) then
    raise exception 'Only teachers can resolve requests';
  end if;
  select * into r from public.class_requests where id = p_request and status = 'pending' for update;
  if not found then
    raise exception 'Request not found or already handled';
  end if;

  if p_approve then
    select * into s from public.sessions where id = r.session_id;
    if r.kind = 'cancel' then
      update public.sessions set cancelled = true where id = r.session_id;
    else
      perform public.reschedule_session(r.session_id, r.proposed_start, s.duration_min);
    end if;
  end if;

  update public.class_requests
  set status = case when p_approve then 'approved' else 'declined' end, resolved_at = now()
  where id = r.id;
end;
$$;

revoke all on function public.resolve_class_request(bigint, boolean) from public, anon;
grant execute on function public.resolve_class_request(bigint, boolean) to authenticated;
