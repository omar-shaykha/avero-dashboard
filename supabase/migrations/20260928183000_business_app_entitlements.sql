-- Expand AVERO SaaS business application entitlements.
-- Additive only. Existing customer access is preserved; new apps remain OFF
-- until King explicitly enables them for a company.

insert into public.features (key, name, description) values
  ('app_accounting', 'Accounting', 'Accounting and financial management'),
  ('app_stock', 'Stock Management', 'Inventory and warehouse management'),
  ('app_hr', 'HR & Employees', 'Employee and human resources management'),
  ('app_loyalty', 'Loyalty & Promotions', 'Customer loyalty, rewards and promotions'),
  ('app_zatca', 'ZATCA Fatoora', 'Saudi e-invoicing and ZATCA compliance')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description;

-- Do not auto-enable the new applications for any tenant.
-- company_features rows are created only when King activates a subscription.
