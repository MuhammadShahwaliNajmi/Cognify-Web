-- Classes can be any length from 5 minutes to 12 hours (teachers now enter an end time).
alter table public.sessions drop constraint sessions_duration_min_check;
alter table public.sessions add constraint sessions_duration_min_check check (duration_min between 5 and 720);
alter table public.timetable drop constraint timetable_duration_min_check;
alter table public.timetable add constraint timetable_duration_min_check check (duration_min between 5 and 720);

do $$
declare d text;
begin
  d := pg_get_functiondef('public.reschedule_session(bigint, timestamptz, int)'::regprocedure);
  d := replace(d, 'p_duration not between 15 and 240', 'p_duration not between 5 and 720');
  d := replace(d, 'Class length must be between 15 and 240 minutes', 'Class length must be between 5 minutes and 12 hours');
  execute d;
end $$;
