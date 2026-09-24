-- These functions are invoked by their database triggers, not through public RPC calls.
-- Revoke direct Data API execution while preserving trigger execution and trusted server access.
REVOKE ALL ON FUNCTION public.cleanup_whatsapp_memory_before_insert()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_whatsapp_memory_before_insert()
  TO service_role;

REVOKE ALL ON FUNCTION public.provision_company_ai_brain()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_company_ai_brain()
  TO service_role;

REVOKE ALL ON FUNCTION public.rls_auto_enable()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable()
  TO service_role;
