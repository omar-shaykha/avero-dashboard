-- Earlier migrations stored quote characters in the value, so an active
-- company appeared inactive to every filter using status = 'active'.
alter table public.companies alter column status set default 'active';
update public.companies set status = 'active'
where status = chr(39) || 'active' || chr(39);
