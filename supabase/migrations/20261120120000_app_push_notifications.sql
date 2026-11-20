-- Phone notifications for the Concept Lab app (standard web push, no paid service).
--
-- * push_subscriptions: each phone/browser a member turned notifications on for.
-- * Every portal email queued in email_outbox (class reminders, new work, feedback,
--   announcements, requests…) is also queued in push_outbox for that member, if
--   they have a device; the send-push edge function delivers it each minute.
-- * The signing keys (VAPID) are created by the edge function on first use and
--   stored in private.push_keys, which no client can read.

-- ---------- devices ----------
create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.members (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_member_idx on public.push_subscriptions (member_id);
alter table public.push_subscriptions enable row level security;
create policy "members see their own devices" on public.push_subscriptions
  for select to authenticated using (member_id = (select private.member_id()));
grant select on public.push_subscriptions to authenticated;
grant select, delete on public.push_subscriptions to service_role;

-- turn notifications on for this device (a device moves to whoever signs in on it)
create or replace function public.register_push(p_endpoint text, p_p256dh text, p_auth text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_member bigint := private.member_id();
begin
  if v_member is null then raise exception 'Not a portal member.'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or length(p_p256dh) > 200 or length(p_auth) > 100 then
    raise exception 'Not a valid device.';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (member_id, endpoint, p256dh, auth) values (v_member, p_endpoint, p_p256dh, p_auth);
end $$;

create or replace function public.unregister_push(p_endpoint text)
returns void language sql security definer set search_path = '' as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and member_id = private.member_id();
$$;

revoke all on function public.register_push(text, text, text) from public, anon;
revoke all on function public.unregister_push(text) from public, anon;
grant execute on function public.register_push(text, text, text) to authenticated;
grant execute on function public.unregister_push(text) to authenticated;

-- ---------- signing keys ----------
create table private.push_keys (
  id int primary key default 1 check (id = 1),
  public_key text not null,
  private_key text not null,
  created_at timestamptz not null default now()
);
revoke all on private.push_keys from public, anon, authenticated;

-- the app needs the public key to subscribe
create or replace function public.push_public_key()
returns text language sql stable security definer set search_path = '' as $$
  select public_key from private.push_keys where id = 1;
$$;
revoke all on function public.push_public_key() from public, anon;
grant execute on function public.push_public_key() to authenticated;

-- edge function only
create or replace function public.push_vapid()
returns table (public_key text, private_key text) language sql stable security definer set search_path = '' as $$
  select k.public_key, k.private_key from private.push_keys k where k.id = 1;
$$;
create or replace function public.save_push_vapid(p_public text, p_private text)
returns void language sql security definer set search_path = '' as $$
  insert into private.push_keys (id, public_key, private_key) values (1, p_public, p_private) on conflict (id) do nothing;
$$;
revoke all on function public.push_vapid() from public, anon, authenticated;
revoke all on function public.save_push_vapid(text, text) from public, anon, authenticated;
grant execute on function public.push_vapid() to service_role;
grant execute on function public.save_push_vapid(text, text) to service_role;

-- ---------- queue ----------
create table public.push_outbox (
  id bigint generated always as identity primary key,
  member_id bigint not null references public.members (id) on delete cascade,
  title text not null,
  body text not null,
  url text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  attempts int not null default 0,
  last_error text
);
create index push_outbox_pending_idx on public.push_outbox (id) where sent_at is null;
alter table public.push_outbox enable row level security; -- no client access
grant select, update on public.push_outbox to service_role;

create or replace function private.queue_push_from_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_member bigint;
begin
  select m.id into v_member from public.members m where lower(m.email) = lower(new.to_email) and m.active limit 1;
  if v_member is null or not exists (select 1 from public.push_subscriptions s where s.member_id = v_member) then
    return null;
  end if;
  insert into public.push_outbox (member_id, title, body, url)
  values (v_member, left(new.heading, 120), left(split_part(new.body, E'\n', 1), 240), new.cta_url);
  return null;
end $$;
revoke all on function private.queue_push_from_email() from public;

create trigger email_also_push after insert on public.email_outbox
  for each row execute function private.queue_push_from_email();

-- edge function: take up to p_limit waiting notifications with each member's devices
create or replace function public.claim_pushes(p_limit int default 50)
returns table (id bigint, title text, body text, url text, devices jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with c as (
    update public.push_outbox o
    set claimed_at = now(), attempts = o.attempts + 1
    where o.id in (
      select x.id from public.push_outbox x
      where x.sent_at is null and x.attempts < 3
        and x.created_at > now() - interval '2 hours'
        and (x.claimed_at is null or x.claimed_at < now() - interval '5 minutes')
      order by x.id
      limit p_limit
      for update skip locked
    )
    returning o.id, o.member_id, o.title, o.body, o.url
  )
  select c.id, c.title, c.body, c.url,
    coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
              from public.push_subscriptions s where s.member_id = c.member_id), '[]'::jsonb)
  from c;
end $$;
revoke all on function public.claim_pushes(int) from public, anon, authenticated;
grant execute on function public.claim_pushes(int) to service_role;

-- ---------- every minute: deliver what's waiting ----------
create or replace function private.dispatch_pushes()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.push_outbox
    where sent_at is null and attempts < 3 and created_at > now() - interval '2 hours'
      and (claimed_at is null or claimed_at < now() - interval '5 minutes')
  ) then
    perform net.http_post(
      url := 'https://shrgjfevwjbqlzpqqfck.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := '{}'::jsonb
    );
  end if;
end $$;
revoke all on function private.dispatch_pushes() from public;

select cron.schedule('send-pushes', '* * * * *', 'select private.dispatch_pushes()');

-- keep the queue small
select cron.schedule('push-cleanup', '40 0 * * *', $$delete from public.push_outbox where created_at < now() - interval '14 days'$$);
