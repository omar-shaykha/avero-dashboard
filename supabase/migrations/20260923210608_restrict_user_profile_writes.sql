-- All profile changes, including personal fields, go through authenticated
-- server routes using the service role. A direct table UPDATE previously let
-- a user change their own company_id, role, and role_id under the self RLS
-- policy. Keep self SELECT, remove direct client mutations entirely.
revoke insert, update, delete on table public.user_profiles from anon, authenticated;

-- The service role remains the writer for server routes and provisioning RPCs.
grant select on table public.user_profiles to authenticated;
