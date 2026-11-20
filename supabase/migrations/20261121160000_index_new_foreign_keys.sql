-- Indexes for foreign keys added today (Supabase performance advisor).
create index if not exists work_comments_student_idx on public.work_comments (student_id);
create index if not exists work_comments_author_idx on public.work_comments (author_id);
create index if not exists push_outbox_member_idx on public.push_outbox (member_id);
