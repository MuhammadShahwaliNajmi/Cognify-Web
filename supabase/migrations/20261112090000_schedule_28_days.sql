-- The portal now has a Calendar tab: keep four weeks of classes scheduled
-- ahead instead of two.

create or replace function private.timetable_changed()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform private.sync_sessions(28);
  return null;
end;
$$;
revoke all on function private.timetable_changed() from public, anon, authenticated;

select cron.unschedule('sync-class-sessions');
select cron.schedule('sync-class-sessions', '5 0 * * *', $$select private.sync_sessions(28)$$);

select private.sync_sessions(28);
