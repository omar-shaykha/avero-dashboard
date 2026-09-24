-- Entitlements are controlled by AVERO staff. Preserve the apps that existing
-- customers could already open; new customers start with no subscribed apps.
insert into public.features (key, name, description) values
  ('app_sell', 'AVERO Sell', 'POS, products, customers and sales'),
  ('app_operations', 'AVERO Operations', 'Inventory, purchasing, production and accounting'),
  ('app_go', 'AVERO GO', 'Pickup menu and orders'),
  ('app_intelligence', 'AVERO Intelligence', 'AI agents master switch')
on conflict (key) do nothing;

insert into public.company_features (company_id, feature_id, enabled)
select c.id, f.id, true from public.companies c
cross join public.features f
where f.key in ('app_sell', 'app_operations', 'app_go')
  and exists (select 1 from public.user_profiles p where p.company_id = c.id)
on conflict (company_id, feature_id) do nothing;

insert into public.company_features (company_id, feature_id, enabled)
select distinct cf.company_id, f.id, true
from public.company_features cf
join public.features agent on agent.id = cf.feature_id
cross join public.features f
where f.key = 'app_intelligence' and agent.key in ('ai_sales','ai_marketing','ai_hr','ai_inventory','ai_support')
  and cf.enabled = true and (cf.expires_at is null or cf.expires_at > now())
on conflict (company_id, feature_id) do nothing;
