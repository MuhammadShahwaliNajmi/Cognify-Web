-- Calendar subscription: each member gets a private, unguessable link that their phone's
-- calendar (Apple Calendar, Google Calendar) subscribes to. The `calendar` edge function
-- serves their classes (and, for students, deadlines) from it.
create table private.calendar_tokens (
  member_id bigint primary key references public.members (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now()
);
revoke all on private.calendar_tokens from public, anon, authenticated;

-- the signed-in member's link token (made on first use); new = true makes a fresh one (the old link stops)
create or replace function public.my_calendar_token(p_new boolean default false)
returns text language plpgsql security definer set search_path = '' as $$
declare v_member bigint := private.member_id(); v_token text;
begin
  if v_member is null then raise exception 'Not a portal member.'; end if;
  if p_new then delete from private.calendar_tokens where member_id = v_member; end if;
  insert into private.calendar_tokens (member_id) values (v_member) on conflict (member_id) do nothing;
  select token into v_token from private.calendar_tokens where member_id = v_member;
  return v_token;
end $$;
revoke all on function public.my_calendar_token(boolean) from public, anon;
grant execute on function public.my_calendar_token(boolean) to authenticated;

-- edge function only: everything the feed for this token should contain
create or replace function public.calendar_feed(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare m record; v_cohorts bigint[];
begin
  select mb.* into m from private.calendar_tokens t join public.members mb on mb.id = t.member_id where t.token = p_token and mb.active;
  if m.id is null then return null; end if;
  if m.role = 'student' then
    v_cohorts := array[m.cohort_id];
  else
    select coalesce(array_agg(c.id), '{}') into v_cohorts from public.cohorts c where c.teacher_id = m.id and c.archived_at is null;
  end if;
  return jsonb_build_object(
    'name', m.full_name,
    'role', m.role,
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'unit', s.unit, 'start', s.starts_at, 'minutes', s.duration_min,
        'meet', coalesce(s.meet_url, c.meet_url), 'cohort', c.name) order by s.starts_at)
      from public.sessions s join public.cohorts c on c.id = s.cohort_id
      where s.cohort_id = any (v_cohorts) and not s.cancelled and s.starts_at > now() - interval '30 days' and s.starts_at < now() + interval '180 days'), '[]'::jsonb),
    'deadlines', case when m.role = 'student' then coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title, 'due', a.due_at, 'timed', a.time_limit_min is not null) order by a.due_at)
      from public.assignments a
      where a.cohort_id = any (v_cohorts) and a.due_at > now() - interval '30 days'
        and not exists (select 1 from public.submissions x where x.assignment_id = a.id and x.member_id = m.id)), '[]'::jsonb) else '[]'::jsonb end
  );
end $$;
revoke all on function public.calendar_feed(text) from public, anon, authenticated;
grant execute on function public.calendar_feed(text) to service_role;
