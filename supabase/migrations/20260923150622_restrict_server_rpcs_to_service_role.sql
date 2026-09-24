-- User-facing access goes through authenticated server API routes, where
-- company scope and permissions are checked before privileged RPC calls.
-- Keep the legacy customer/lead intake RPCs unchanged pending Make review.
do $migration$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure::text as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.prorettype not in ('trigger'::regtype, 'event_trigger'::regtype)
      and p.proname not in ('upsert_customer', 'upsert_lead', 'upsert_lead_v2')
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      fn.signature
    );
    execute format(
      'grant execute on function %s to service_role',
      fn.signature
    );
  end loop;
end;
$migration$;
