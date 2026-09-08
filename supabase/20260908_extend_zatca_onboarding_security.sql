-- AVERO OS · ZATCA/FATOORA onboarding security
-- Applied to production Supabase on 2026-09-08.

alter table public.zatca_company_settings add column if not exists industry text;

alter table public.zatca_egs_units
  add column if not exists common_name text,
  add column if not exists registered_address text,
  add column if not exists business_category text,
  add column if not exists invoice_type_code text,
  add column if not exists key_provider text not null default 'vault_software',
  add column if not exists key_reference text,
  add column if not exists private_key_vault_id uuid,
  add column if not exists compliance_csid_vault_id uuid,
  add column if not exists compliance_secret_vault_id uuid,
  add column if not exists production_csid_vault_id uuid,
  add column if not exists production_secret_vault_id uuid,
  add column if not exists csr_generated_at timestamptz,
  add column if not exists compliance_issued_at timestamptz,
  add column if not exists production_issued_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='zatca_egs_key_provider_check') then
    alter table public.zatca_egs_units
      add constraint zatca_egs_key_provider_check
      check (key_provider in ('vault_software','external_hsm'));
  end if;
end $$;

create or replace function public.zatca_vault_upsert_secret(
  p_secret_id uuid,
  p_secret text,
  p_name text,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, vault
as $$
declare v_id uuid;
begin
  if p_secret is null or length(p_secret)=0 then
    raise exception 'Secret cannot be empty';
  end if;

  if p_secret_id is null then
    select vault.create_secret(p_secret,p_name,p_description) into v_id;
  else
    perform vault.update_secret(p_secret_id,p_secret,p_name,p_description);
    v_id := p_secret_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.zatca_vault_get_secret(p_secret_id uuid)
returns text
language sql
security definer
set search_path = pg_catalog, public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where id=p_secret_id;
$$;

revoke all on function public.zatca_vault_upsert_secret(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.zatca_vault_get_secret(uuid) from public, anon, authenticated;
grant execute on function public.zatca_vault_upsert_secret(uuid,text,text,text) to service_role;
grant execute on function public.zatca_vault_get_secret(uuid) to service_role;
