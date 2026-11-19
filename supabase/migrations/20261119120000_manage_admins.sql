-- Admins can make other teachers admins (or take it away).
-- The portal must always keep at least one active admin.

create or replace function private.keep_an_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.members where role = 'teacher' and is_admin and active) then
    raise exception 'The portal needs at least one admin.';
  end if;
  return null;
end $$;

drop trigger if exists keep_an_admin on public.members;
create constraint trigger keep_an_admin
  after update or delete on public.members
  deferrable initially deferred
  for each row when (old.is_admin)
  execute function private.keep_an_admin();

-- set_admin: only an admin; only teachers can be admins
create or replace function public.set_admin(p_member bigint, p_admin boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then
    raise exception 'Only an admin can change who is an admin.';
  end if;
  update public.members set is_admin = p_admin
  where id = p_member and role = 'teacher';
  if not found then
    raise exception 'That teacher was not found.';
  end if;
end $$;

revoke all on function public.set_admin(bigint, boolean) from public, anon;
grant execute on function public.set_admin(bigint, boolean) to authenticated;
revoke all on function private.keep_an_admin() from public;
