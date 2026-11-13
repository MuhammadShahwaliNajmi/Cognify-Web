-- Never send to reserved test addresses (@example.com); they would bounce and
-- hurt the sending domain's reputation.
create or replace function public.claim_emails(p_limit int default 40)
returns setof public.email_outbox
language sql security definer set search_path = '' as $$
  update public.email_outbox o
  set claimed_at = now(), attempts = o.attempts + 1
  where o.id in (
    select id from public.email_outbox
    where sent_at is null and attempts < 5
      and created_at > now() - interval '12 hours'
      and (claimed_at is null or claimed_at < now() - interval '5 minutes')
      and to_email not like '%@example.com'
    order by id
    limit p_limit
    for update skip locked
  )
  returning o.*
$$;
revoke all on function public.claim_emails(int) from public, anon, authenticated;
grant execute on function public.claim_emails(int) to service_role;

create or replace function private.dispatch_emails()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.email_outbox
    where sent_at is null and attempts < 5
      and created_at > now() - interval '12 hours'
      and (claimed_at is null or claimed_at < now() - interval '5 minutes')
      and to_email not like '%@example.com'
  ) then
    perform net.http_post(
      url := 'https://shrgjfevwjbqlzpqqfck.supabase.co/functions/v1/send-emails',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := '{}'::jsonb
    );
  end if;
end $$;
