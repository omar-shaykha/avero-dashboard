-- Vault-backed credentials are used by server routes with the service key.
-- They must not be callable through the public Data API by anon/authenticated.
revoke all on function public.get_avero_secret(text)
  from public, anon, authenticated;
grant execute on function public.get_avero_secret(text)
  to service_role;

revoke all on function public.set_avero_secret(text, text, text)
  from public, anon, authenticated;
grant execute on function public.set_avero_secret(text, text, text)
  to service_role;

revoke all on function public.marketing_get_social_token(uuid, text)
  from public, anon, authenticated;
grant execute on function public.marketing_get_social_token(uuid, text)
  to service_role;

revoke all on function public.marketing_store_social_token(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.marketing_store_social_token(uuid, text, text, text, text)
  to service_role;

revoke all on function public.zatca_vault_get_secret(uuid)
  from public, anon, authenticated;
grant execute on function public.zatca_vault_get_secret(uuid)
  to service_role;

revoke all on function public.zatca_vault_upsert_secret(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.zatca_vault_upsert_secret(uuid, text, text, text)
  to service_role;
