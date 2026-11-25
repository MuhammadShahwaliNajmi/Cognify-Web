-- Two clear choices per student: turn their portal access off / on (nothing is lost), or delete
-- them and everything about them. Teachers still see students whose access is off.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.portal_snapshot'::regproc);
  d := replace(d, $q$        select id, email, role, full_name, title, plan, cohort_id, predicted, target, is_admin
        from public.members
        where active$q$, $q$        select id, email, role, full_name, title, plan, cohort_id, predicted, target, is_admin, active
        from public.members
        where active or role = 'student'$q$);
  if position('is_admin, active' in d) = 0 then raise exception 'portal_snapshot not patched'; end if;
  execute d;
end $$;

-- adding an email whose access is off: say how to bring them back
do $$
declare d text;
begin
  d := pg_get_functiondef('public.add_to_group(bigint,text,text)'::regprocedure);
  d := replace(d, $q$  if exists (select 1 from public.members m where m.email = v_e) then raise exception 'That email is already in the portal'; end if;$q$,
    $q$  if exists (select 1 from public.members m where m.email = v_e and not m.active) then
    raise exception 'That student''s access is turned off. Turn it back on from their profile.';
  end if;
  if exists (select 1 from public.members m where m.email = v_e) then raise exception 'That email is already in the portal'; end if;$q$);
  if position('access is turned off' in d) = 0 then raise exception 'add_to_group not patched'; end if;
  execute d;
end $$;

-- replaced by the access switch (and Delete)
drop function public.remove_from_group(bigint);
