insert into public.sales_payment_methods(company_id,code,name,active,sort_order)
select id,'credit','Credit',true,90 from public.companies
on conflict (company_id,code) do nothing;
create or replace function public.ensure_company_credit_payment_method()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.sales_payment_methods(company_id,code,name,active,sort_order)
 values(new.id,'credit','Credit',true,90)
 on conflict (company_id,code) do nothing;
 return new;
end $$;
drop trigger if exists companies_seed_credit_payment_method on public.companies;
create trigger companies_seed_credit_payment_method after insert on public.companies
for each row execute function public.ensure_company_credit_payment_method();