-- Private storage for submitted work.
-- Path convention: <member_id>/<assignment_id>/<timestamp>-<file name>
-- Students upload into and read only their own folder; teachers read everything.
-- No update/delete for students: every upload has a unique name, so earlier
-- versions are kept rather than overwritten.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions', 'submissions', false, 26214400,   -- 25 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'
  ]
);

create policy "students upload own work" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = (select private.member_id())::text
  );

create policy "students read own work" on storage.objects for select to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = (select private.member_id())::text
  );

create policy "teachers read all work" on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and (select private.is_teacher()));

-- submissions.file_url now holds the storage path, not only Drive links
alter table public.submissions drop constraint if exists submissions_file_url_check;
alter table public.submissions rename column file_url to file_path;
