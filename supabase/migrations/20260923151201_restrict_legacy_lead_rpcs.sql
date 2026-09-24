-- Keep the legacy customer/lead upsert endpoints available to trusted server code only.
-- Vercel can call these with the Supabase service role key if/when needed; browser roles cannot.
REVOKE ALL ON FUNCTION public.upsert_customer(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_customer(text, text, text)
  TO service_role;

REVOKE ALL ON FUNCTION public.upsert_lead(uuid, text, text, text, text, integer, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_lead(uuid, text, text, text, text, integer, text, text)
  TO service_role;

REVOKE ALL ON FUNCTION public.upsert_lead(uuid, text, text, text, text, integer, text, text, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_lead(uuid, text, text, text, text, integer, text, text, date)
  TO service_role;

REVOKE ALL ON FUNCTION public.upsert_lead_v2(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_lead_v2(jsonb)
  TO service_role;
