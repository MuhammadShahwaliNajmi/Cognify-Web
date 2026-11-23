-- Teachers can clear a "Needs attention" flag; it stays cleared (on every device) until the reason changes.
create table public.attention_dismissals (
  member_id bigint not null default private.member_id() references public.members (id) on delete cascade,
  key text not null check (length(key) <= 300),
  created_at timestamptz not null default now(),
  primary key (member_id, key)
);
alter table public.attention_dismissals enable row level security;
create policy "teachers keep their own dismissals" on public.attention_dismissals
  for all to authenticated
  using (member_id = (select private.member_id()) and (select private.is_teacher()))
  with check (member_id = (select private.member_id()) and (select private.is_teacher()));
grant select, insert, delete on public.attention_dismissals to authenticated;
