-- Atomic ICV/PIH reservation per EGS.
create or replace function public.zatca_reserve_invoice_chain(p_company_id uuid,p_egs_unit_id uuid)
returns table(next_counter bigint,previous_hash text)
language plpgsql security definer set search_path=public as $$
declare v_counter bigint; v_hash text;
begin
 select coalesce(invoice_counter,0),last_invoice_hash into v_counter,v_hash
 from public.zatca_egs_units where id=p_egs_unit_id and company_id=p_company_id for update;
 if not found then raise exception 'EGS unit not found'; end if;
 next_counter:=v_counter+1;
 previous_hash:=coalesce(nullif(v_hash,''),'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZiNmQ2OTZiNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyY2ZiNTdlOQ==');
 update public.zatca_egs_units set invoice_counter=next_counter,updated_at=now() where id=p_egs_unit_id;
 return next;
end $$;
revoke all on function public.zatca_reserve_invoice_chain(uuid,uuid) from public,anon,authenticated;
grant execute on function public.zatca_reserve_invoice_chain(uuid,uuid) to service_role;
