-- Concept Lab portal — schema, privileges and row-level security.
--
-- Access model (invite-only):
--   * public.members is the allow-list: one row per Google email, role 'teacher' or 'student'.
--   * A signed-in user is matched to a member by their *confirmed* auth email
--     (auth.users.email_confirmed_at) — never by user_metadata.
--   * Teachers can read and manage everything. Students can read only their own
--     cohort's content and only their own records.
--   * Marks live in public.feedback, which only teachers can write.
--   * Nothing is granted to anon: signed-out visitors cannot read any table.

-- ---------------------------------------------------------------------------
-- Keep future objects private until explicitly granted
-- ---------------------------------------------------------------------------
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.cohorts (
  id          bigint generated always as identity primary key,
  name        text not null,
  board       text,
  subject     text,
  term        text,
  meet_url    text check (meet_url is null or meet_url ~ '^https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}$'),
  created_at  timestamptz not null default now()
);

create table public.members (
  id          bigint generated always as identity primary key,
  email       text not null unique check (email = lower(btrim(email)) and email like '%_@_%'),
  role        text not null check (role in ('teacher', 'student')),
  full_name   text not null,
  title       text,                                       -- teachers: e.g. "Economics · Micro"
  plan        text check (plan in ('Lab', 'Core', 'Elite')),
  cohort_id   bigint references public.cohorts (id) on delete set null,
  predicted   text,
  target      text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint students_have_plan check (role = 'teacher' or plan is not null)
);
create index members_cohort_id_idx on public.members (cohort_id);

create table public.sessions (
  id             bigint generated always as identity primary key,
  cohort_id      bigint not null references public.cohorts (id) on delete cascade,
  title          text not null,
  strand         text not null check (strand in ('Micro', 'Macro', 'Business')),
  unit           text not null,
  starts_at      timestamptz not null,
  duration_min   integer not null default 60 check (duration_min between 15 and 240),
  meet_url       text check (meet_url is null or meet_url ~ '^https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}$'),
  recording_url  text check (recording_url is null or recording_url ~ '^https://(drive|docs)\.google\.com/'),
  created_at     timestamptz not null default now()
);
create index sessions_cohort_starts_idx on public.sessions (cohort_id, starts_at);

create table public.attendance (
  session_id  bigint not null references public.sessions (id) on delete cascade,
  member_id   bigint not null references public.members (id) on delete cascade,
  present     boolean not null default true,
  joined_at   timestamptz not null default now(),
  primary key (session_id, member_id)
);
create index attendance_member_id_idx on public.attendance (member_id);

create table public.resources (
  id          bigint generated always as identity primary key,
  cohort_id   bigint not null references public.cohorts (id) on delete cascade,
  title       text not null,
  type        text not null check (type in ('Slides', 'Notes', 'Summary sheet', 'Past paper', 'Essay structure', 'Recording')),
  strand      text not null check (strand in ('Micro', 'Macro', 'Business')),
  unit        text not null,
  meta        text,
  drive_url   text check (drive_url is null or drive_url ~ '^https://(drive|docs)\.google\.com/'),
  session_id  bigint references public.sessions (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index resources_cohort_id_idx on public.resources (cohort_id);
create index resources_session_id_idx on public.resources (session_id);

create table public.assignments (
  id              bigint generated always as identity primary key,
  cohort_id       bigint not null references public.cohorts (id) on delete cascade,
  title           text not null,
  kind            text not null check (kind in ('Essay', 'Past paper', 'Problem set', 'Assessment')),
  strand          text not null check (strand in ('Micro', 'Macro', 'Business')),
  unit            text not null,
  brief           text not null,
  due_at          timestamptz not null,
  max_marks       integer not null check (max_marks > 0),
  attachment_url  text check (attachment_url is null or attachment_url ~ '^https://(drive|docs)\.google\.com/'),
  created_at      timestamptz not null default now()
);
create index assignments_cohort_due_idx on public.assignments (cohort_id, due_at);

create table public.submissions (
  id             bigint generated always as identity primary key,
  assignment_id  bigint not null references public.assignments (id) on delete cascade,
  member_id      bigint not null references public.members (id) on delete cascade,
  file_name      text not null,
  file_size      bigint check (file_size >= 0),
  file_url       text check (file_url is null or file_url ~ '^https://(drive|docs)\.google\.com/'),
  note           text,
  submitted_at   timestamptz not null default now(),
  unique (assignment_id, member_id)
);
create index submissions_member_id_idx on public.submissions (member_id);

-- Marks and feedback: teachers write, the student reads their own.
create table public.feedback (
  submission_id  bigint primary key references public.submissions (id) on delete cascade,
  marks          numeric(6, 1) not null check (marks >= 0),
  feedback       text not null,
  strengths      text[] not null default '{}',
  improvements   text[] not null default '{}',
  marked_by      bigint references public.members (id) on delete set null,
  marked_at      timestamptz not null default now()
);
create index feedback_marked_by_idx on public.feedback (marked_by);

create table public.announcements (
  id          bigint generated always as identity primary key,
  cohort_id   bigint references public.cohorts (id) on delete cascade,   -- null = everyone
  title       text not null,
  body        text not null,
  created_by  bigint references public.members (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index announcements_cohort_id_idx on public.announcements (cohort_id);
create index announcements_created_by_idx on public.announcements (created_by);

-- Topic mastery (Lab AI "what to fix"): teachers write, the student reads their own.
create table public.mastery (
  id          bigint generated always as identity primary key,
  member_id   bigint not null references public.members (id) on delete cascade,
  unit        text not null,
  strand      text not null check (strand in ('Micro', 'Macro', 'Business')),
  score       integer not null check (score between 0 and 100),
  fix         text not null default '',
  updated_at  timestamptz not null default now(),
  unique (member_id, unit)
);

-- ---------------------------------------------------------------------------
-- Identity helpers (private schema — not reachable through the Data API).
-- SECURITY DEFINER so policies can look up the caller without recursion; each
-- one keys strictly off auth.uid() and a confirmed email.
-- ---------------------------------------------------------------------------
create schema if not exists private;

create or replace function private.current_email()
returns text
language sql stable security definer
set search_path = ''
as $$
  select lower(u.email)
  from auth.users u
  where u.id = (select auth.uid())
    and u.email_confirmed_at is not null;
$$;

create or replace function private.member_id()
returns bigint
language sql stable security definer
set search_path = ''
as $$
  select m.id from public.members m
  where m.email = private.current_email() and m.active;
$$;

create or replace function private.is_teacher()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    where m.email = private.current_email() and m.active and m.role = 'teacher'
  );
$$;

create or replace function private.cohort_id()
returns bigint
language sql stable security definer
set search_path = ''
as $$
  select m.cohort_id from public.members m
  where m.email = private.current_email() and m.active and m.role = 'student';
$$;

-- A student may record attendance only for their own cohort's class, only on a
-- live plan, and only from 10 minutes before the start until the class ends.
create or replace function private.can_mark_present(p_session_id bigint)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sessions s
    join public.members m on m.cohort_id = s.cohort_id
    where s.id = p_session_id
      and m.email = private.current_email()
      and m.active
      and m.role = 'student'
      and m.plan in ('Core', 'Elite')
      and now() between s.starts_at - interval '10 minutes'
                    and s.starts_at + make_interval(mins => s.duration_min)
  );
$$;

revoke all on function private.current_email(), private.member_id(), private.is_teacher(),
  private.cohort_id(), private.can_mark_present(bigint) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.current_email(), private.member_id(), private.is_teacher(),
  private.cohort_id(), private.can_mark_present(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Privileges: signed-in users only. RLS below decides which rows.
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on
  public.cohorts, public.members, public.sessions, public.attendance, public.resources,
  public.assignments, public.submissions, public.feedback, public.announcements, public.mastery
  to authenticated;

alter table public.cohorts       enable row level security;
alter table public.members       enable row level security;
alter table public.sessions      enable row level security;
alter table public.attendance    enable row level security;
alter table public.resources     enable row level security;
alter table public.assignments   enable row level security;
alter table public.submissions   enable row level security;
alter table public.feedback      enable row level security;
alter table public.announcements enable row level security;
alter table public.mastery       enable row level security;

-- ---------------------------------------------------------------------------
-- Policies — teachers: full access to everything
-- ---------------------------------------------------------------------------
create policy "teachers manage cohorts" on public.cohorts for all to authenticated
  using ((select private.is_teacher())) with check ((select private.is_teacher()));
create policy "teachers manage members" on public.members for all to authenticated
  using ((select private.is_teacher())) with check ((select private.is_teacher()));
create policy "teachers manage sessions" on public.sessions for all to authenticated
  using ((select private.is_teacher())) with check ((select private.is_teacher()));
create policy "teachers manage attendance" on public.attendance for all to authenticated
  using ((select private.is_teacher())) with check ((select private.is_teacher()));
create policy "teachers manage resources" on public.resources for all to authenticated
  using ((select private.is_teacher())) with check ((select private.is_teacher()));
create policy "teachers manage assignments" on public.assignments for all to authenticated
  using ((select private.is_teacher())) with check ((select private.is_teacher()));
create policy "teachers manage submissions" on public.submissions for all to authenticated
  using ((select private.is_teacher())) with check ((select private.is_teacher()));
create policy "teachers manage feedback" on public.feedback for all to authenticated
  using ((select private.is_teacher())) with check ((select private.is_teacher()));
create policy "teachers manage announcements" on public.announcements for all to authenticated
  using ((select private.is_teacher())) with check ((select private.is_teacher()));
create policy "teachers manage mastery" on public.mastery for all to authenticated
  using ((select private.is_teacher())) with check ((select private.is_teacher()));

-- ---------------------------------------------------------------------------
-- Policies — students: read their own cohort, read/write only their own records
-- ---------------------------------------------------------------------------
create policy "students read own cohort" on public.cohorts for select to authenticated
  using (id = (select private.cohort_id()));

create policy "members read own row" on public.members for select to authenticated
  using (email = (select private.current_email()));

create policy "students read own cohort sessions" on public.sessions for select to authenticated
  using (cohort_id = (select private.cohort_id()));

create policy "students read own attendance" on public.attendance for select to authenticated
  using (member_id = (select private.member_id()));
create policy "students mark themselves present" on public.attendance for insert to authenticated
  with check (member_id = (select private.member_id()) and private.can_mark_present(session_id));
create policy "students re-mark themselves present" on public.attendance for update to authenticated
  using (member_id = (select private.member_id()))
  with check (member_id = (select private.member_id()) and present and private.can_mark_present(session_id));

create policy "students read own cohort resources" on public.resources for select to authenticated
  using (cohort_id = (select private.cohort_id()));

create policy "students read own cohort assignments" on public.assignments for select to authenticated
  using (cohort_id = (select private.cohort_id()));

create policy "students read own submissions" on public.submissions for select to authenticated
  using (member_id = (select private.member_id()));
create policy "students submit own work" on public.submissions for insert to authenticated
  with check (
    member_id = (select private.member_id())
    and assignment_id in (select a.id from public.assignments a where a.cohort_id = (select private.cohort_id()))
  );
-- re-submitting is allowed only until the work has been marked
create policy "students replace unmarked work" on public.submissions for update to authenticated
  using (
    member_id = (select private.member_id())
    and not exists (select 1 from public.feedback f where f.submission_id = submissions.id)
  )
  with check (
    member_id = (select private.member_id())
    and assignment_id in (select a.id from public.assignments a where a.cohort_id = (select private.cohort_id()))
  );

create policy "students read own feedback" on public.feedback for select to authenticated
  using (submission_id in (select s.id from public.submissions s where s.member_id = (select private.member_id())));

create policy "students read their announcements" on public.announcements for select to authenticated
  using ((cohort_id is null and (select private.member_id()) is not null)
         or cohort_id = (select private.cohort_id()));

create policy "students read own mastery" on public.mastery for select to authenticated
  using (member_id = (select private.member_id()));
