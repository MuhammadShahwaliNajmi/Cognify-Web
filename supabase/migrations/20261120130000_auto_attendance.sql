-- Automatic registers: pressing "Join class" (website, app or email button) marks a
-- student present; 15 minutes after a class ends, every student in it who didn't
-- join is marked absent, so teachers never have to take the register by hand.
-- Teachers can still switch anyone to present afterwards.
create or replace function private.close_registers()
returns void language sql security definer set search_path = '' as $$
  insert into public.attendance (session_id, member_id, present, joined_at)
  select s.id, m.id, false, s.starts_at + make_interval(mins => s.duration_min)
  from public.sessions s
  join public.members m on m.cohort_id = s.cohort_id and m.role = 'student' and m.active
  where not s.cancelled
    and s.starts_at + make_interval(mins => s.duration_min) < now() - interval '15 minutes'
    and s.starts_at > now() - interval '2 days'
  on conflict (session_id, member_id) do nothing;
$$;
revoke all on function private.close_registers() from public;

select cron.schedule('close-registers', '*/10 * * * *', 'select private.close_registers()');
