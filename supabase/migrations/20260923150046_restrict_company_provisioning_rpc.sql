-- Company provisioning is only exposed through the King Admin API route,
-- which performs authorization before using the Supabase server secret.
revoke all on function public.create_client_company(text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_client_company(text, text, text)
  to service_role;
