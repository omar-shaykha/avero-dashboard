alter table public.sales_customers
 add column if not exists commercial_registration text,
 add column if not exists national_address text,
 add column if not exists iban text,
 add column if not exists customer_type text not null default 'individual';
update public.sales_customers set customer_type='business'
 where nullif(trim(coalesce(commercial_registration,'')),'') is not null
 and nullif(trim(coalesce(tax_number,'')),'') is not null
 and nullif(trim(coalesce(national_address,'')),'') is not null;
alter table public.sales_customers drop constraint if exists sales_customers_customer_type_check;
alter table public.sales_customers add constraint sales_customers_customer_type_check check (customer_type in ('individual','business'));