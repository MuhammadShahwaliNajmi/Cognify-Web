-- Lesson notes: after a class the teacher writes what was covered and what to do next.
-- The student sees them on that class, and is told (email + app notification) when they're first added.
alter table public.sessions add column notes text check (notes is null or length(notes) <= 4000);

do $$
declare d text;
begin
  d := pg_get_functiondef('public.portal_snapshot()'::regprocedure);
  d := replace(d, 's.meet_url, s.recording_url, s.timetable_id,', 's.meet_url, s.recording_url, s.timetable_id, s.notes,');
  if position('s.timetable_id, s.notes' in d) = 0 then raise exception 'portal_snapshot: sessions select not found'; end if;
  execute d;
end $$;

create or replace function private.notify_lesson_notes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(btrim(old.notes), '') = '' and coalesce(btrim(new.notes), '') <> '' then
    perform private.email_students(new.cohort_id, 'Notes from ' || new.title, 'Notes from ' || new.title,
      left(regexp_replace(new.notes, '\s+', ' ', 'g'), 240), 'Read the notes', 'https://cognifypk.com/app/?go=/class/' || new.id);
  end if;
  return null;
end $$;
revoke all on function private.notify_lesson_notes() from public;

create trigger lesson_notes_notify after update of notes on public.sessions
  for each row execute function private.notify_lesson_notes();
