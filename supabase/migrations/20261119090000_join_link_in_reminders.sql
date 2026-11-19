-- The "class starts within the hour" email's button joins the class straight away:
-- /portal/student/?join=<class id> records attendance and opens Google Meet.
do $$
declare d text;
begin
  d := pg_get_functiondef('private.enqueue_class_reminders()'::regprocedure);
  d := replace(d,
    E'''Join class'',\n      ''https://cognifypk.com/portal/student/calendar/'');',
    E'''Join class'',\n      ''https://cognifypk.com/portal/student/?join='' || s.id);');
  if position('?join=' in d) = 0 then
    raise exception 'enqueue_class_reminders: join button not found';
  end if;
  execute d;
end $$;
