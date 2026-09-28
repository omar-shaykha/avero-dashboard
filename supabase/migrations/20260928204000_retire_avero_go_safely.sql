-- Retire AVERO GO without deleting historical tenant data.
update public.company_features cf set enabled=false
from public.features f where cf.feature_id=f.id and f.key='app_go' and cf.enabled=true;

update public.go_stores set enabled=false, updated_at=now() where enabled=true;

drop policy if exists tenant_company_access on public.go_stores;
create policy tenant_company_access on public.go_stores for all to authenticated
using (company_id=(select up.company_id from public.user_profiles up where up.user_id=(select auth.uid())))
with check (company_id=(select up.company_id from public.user_profiles up where up.user_id=(select auth.uid())));