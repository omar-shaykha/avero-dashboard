-- AVERO GO merchant branding, contact and menu nutrition.
alter table public.go_stores
  add column if not exists logo_url text,
  add column if not exists hero_image_url text,
  add column if not exists primary_color text not null default '#06b6d4',
  add column if not exists accent_color text not null default '#f59e0b',
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists whatsapp_url text,
  add column if not exists map_url text,
  add column if not exists help_url text;
alter table public.sales_products
  add column if not exists calories numeric,
  add column if not exists allergens text[] not null default '{}'::text[];