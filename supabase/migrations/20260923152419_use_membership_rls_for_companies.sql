-- Move company reads from the legacy one-company profile link to active memberships.
DROP POLICY IF EXISTS companies_select_own_company ON public.companies;

CREATE POLICY companies_select_active_membership
ON public.companies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.company_memberships AS cm
    WHERE cm.company_id = companies.id
      AND cm.user_id = (SELECT auth.uid())
      AND cm.status = 'active'
  )
);
