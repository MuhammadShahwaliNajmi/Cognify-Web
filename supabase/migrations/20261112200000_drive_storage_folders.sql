-- File storage in Google Drive (behind the portal) + folders.
--
-- Drive layout (created on demand by the `drive` Edge Function):
--   Concept Lab Portal/
--     <student>/            ← cohorts.drive_folder_id (each student's master folder)
--       <portal folders…>   ← folders.drive_folder_id
--       Assignments/        ← question papers
--       Submissions/        ← handed-in work
--
-- Files are never shared publicly: the portal streams them through the Edge
-- Function after checking the viewer may see the row (RLS).

-- one connected storage account; only the Edge Function (secret key) can read it
create table public.drive_auth (
  id              int primary key default 1 check (id = 1),
  refresh_token   text not null,
  account_email   text,
  root_folder_id  text,
  connected_at    timestamptz not null default now()
);
alter table public.drive_auth enable row level security;
grant select, insert, update, delete on public.drive_auth to service_role;

create table public.drive_oauth_states (
  state       text primary key,
  member_id   bigint not null references public.members (id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.drive_oauth_states enable row level security;
grant select, insert, delete on public.drive_oauth_states to service_role;

-- folders shown in the portal, per student
create table public.folders (
  id               bigint generated always as identity primary key,
  cohort_id        bigint not null references public.cohorts (id) on delete cascade,
  parent_id        bigint references public.folders (id),
  name             text not null check (char_length(btrim(name)) between 1 and 80),
  drive_folder_id  text,
  created_at       timestamptz not null default now()
);
create unique index folders_unique_name on public.folders (cohort_id, coalesce(parent_id, 0), lower(btrim(name)));
create index folders_cohort_id_idx on public.folders (cohort_id);
create index folders_parent_id_idx on public.folders (parent_id);
alter table public.folders enable row level security;
grant select, insert, update, delete on public.folders to authenticated;
grant select, update on public.folders to service_role;

create policy "students read own folders" on public.folders
  for select to authenticated
  using (cohort_id = (select private.cohort_id()));
create policy "teachers manage folders" on public.folders
  for all to authenticated
  using ((select private.is_teacher()))
  with check ((select private.is_teacher()));

-- Drive ids for each student's master folder and its system subfolders
alter table public.cohorts
  add column drive_folder_id text,
  add column drive_assignments_folder_id text,
  add column drive_submissions_folder_id text;
grant select, update on public.cohorts to service_role;
grant select on public.members to service_role;
grant select on public.assignments to service_role;
grant select, delete on public.resources to service_role;

-- files
alter table public.resources
  add column folder_id bigint references public.folders (id),
  add column drive_file_id text,
  add column mime_type text,
  add column size_bytes bigint check (size_bytes is null or size_bytes >= 0);
create index resources_folder_id_idx on public.resources (folder_id);
alter table public.resources alter column strand drop not null;
alter table public.resources alter column unit set default '';
alter table public.resources drop constraint resources_type_check;
alter table public.resources add constraint resources_type_check
  check (type = any (array['Slides', 'Notes', 'Summary sheet', 'Past paper', 'Essay structure', 'Recording', 'File']));

alter table public.assignments
  add column attachment_file_id text,
  add column attachment_name text,
  add column attachment_mime text;

alter table public.submissions
  add column drive_file_id text,
  add column mime_type text;

-- every student starts with a few folders
create or replace function private.seed_folders(p_cohort bigint)
returns void language sql security definer set search_path = '' as $$
  insert into public.folders (cohort_id, name)
  select p_cohort, n from unnest(array['Notes', 'Slides', 'Past papers', 'Recordings']) as n
  on conflict do nothing
$$;

create or replace function private.seed_folders_for_new_cohort() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.seed_folders(new.id);
  return null;
end $$;
create trigger seed_folders_on_cohort after insert on public.cohorts
  for each row execute function private.seed_folders_for_new_cohort();

select private.seed_folders(id) from public.cohorts;
