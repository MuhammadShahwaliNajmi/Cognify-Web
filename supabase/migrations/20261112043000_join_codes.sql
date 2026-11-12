-- Self-enrolment with per-cohort join codes.
--
-- Every cohort is one-to-one tuition. A student signs in with Google and calls
-- public.join_cohort(code). If the code matches an unclaimed cohort, they are
-- added to public.members as a Core student of that cohort. A code can be used
-- once (the cohort then has its student); teachers can issue a new code.
-- Wrong guesses are rate-limited per account.

-- 8 characters from a 31-symbol alphabet (no 0/O/1/I/L): ~8.5 × 10^11 combinations.
create or replace function private.new_join_code()
returns text
language plpgsql volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  code text := '';
begin
  for i in 0..7 loop
    code := code || substr(alphabet, 1 + (get_byte(bytes, i) % 31), 1);
  end loop;
  return substr(code, 1, 4) || '-' || substr(code, 5, 4);
end;
$$;
revoke all on function private.new_join_code() from public, anon;
-- teachers creating a cohort evaluate the column default below with their own role
grant execute on function private.new_join_code() to authenticated;

alter table public.cohorts add column join_code text unique;
update public.cohorts set join_code = private.new_join_code() where join_code is null;
alter table public.cohorts alter column join_code set not null;
alter table public.cohorts alter column join_code set default private.new_join_code();

-- failed-attempt log for rate limiting (private: not reachable through the API)
create table private.join_attempts (
  user_id  uuid not null,
  at       timestamptz not null default now()
);
create index join_attempts_user_at_idx on private.join_attempts (user_id, at);
alter table private.join_attempts enable row level security;   -- no policies: only the definer function touches it

-- Called by a signed-in student. Failures are *returned* (ok = false), not
-- raised, so the failed-attempt row survives for rate limiting.
create or replace function public.join_cohort(p_code text)
returns table (ok boolean, message text, cohort_id bigint, cohort_name text)
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_email  text := private.current_email();
  v_name   text;
  v_cohort public.cohorts%rowtype;
begin
  if v_uid is null or v_email is null then
    raise exception 'Sign in with Google first.' using errcode = '42501';
  end if;
  if exists (select 1 from public.members m where m.email = v_email) then
    return query select false, 'This account is already set up.', null::bigint, null::text;
    return;
  end if;
  if (select count(*) from private.join_attempts a
      where a.user_id = v_uid and a.at > now() - interval '1 hour') >= 10 then
    return query select false, 'Too many attempts. Please try again in an hour.', null::bigint, null::text;
    return;
  end if;

  -- codes match ignoring case, spaces and the dash; the row lock stops two
  -- people claiming the same one-to-one cohort at the same moment
  select * into v_cohort from public.cohorts c
  where replace(c.join_code, '-', '') = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'))
  for update;

  if v_cohort.id is null then
    insert into private.join_attempts (user_id) values (v_uid);
    return query select false, $m$That code doesn't match a class. Check it and try again.$m$, null::bigint, null::text;
    return;
  end if;
  if exists (select 1 from public.members m
             where m.cohort_id = v_cohort.id and m.role = 'student' and m.active) then
    insert into private.join_attempts (user_id) values (v_uid);
    return query select false, 'This code has already been used. Ask your teacher for a new one.', null::bigint, null::text;
    return;
  end if;

  -- display name only (never used for authorisation)
  select coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''),
                  nullif(u.raw_user_meta_data ->> 'name', ''),
                  v_cohort.name)
    into v_name from auth.users u where u.id = v_uid;

  insert into public.members (email, role, full_name, plan, cohort_id)
  values (v_email, 'student', v_name, 'Core', v_cohort.id);

  return query select true, 'You have joined your class.', v_cohort.id, v_cohort.name;
end;
$$;
revoke all on function public.join_cohort(text) from public, anon;
grant execute on function public.join_cohort(text) to authenticated;

-- Teachers: issue a fresh code for a cohort (e.g. if it was shared by mistake).
create or replace function public.regenerate_join_code(p_cohort_id bigint)
returns text
language plpgsql volatile security definer
set search_path = ''
as $$
declare v_code text;
begin
  if not private.is_teacher() then
    raise exception 'Only teachers can do this.' using errcode = '42501';
  end if;
  update public.cohorts set join_code = private.new_join_code()
  where id = p_cohort_id returning join_code into v_code;
  return v_code;
end;
$$;
revoke all on function public.regenerate_join_code(bigint) from public, anon;
grant execute on function public.regenerate_join_code(bigint) to authenticated;
