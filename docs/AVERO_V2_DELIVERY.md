# AVERO OS V2 delivery map

## Current connected slice

- Supabase India is the shared project for the current V2 preview branch.
- The root route opens the company Control Center after authentication.
- Control Center shows the current company, active branch count, account entry points, and an app launcher derived from current role permissions and legacy feature entitlements.
- Operations has a server-checked entry point for the existing inventory, purchasing, production, and accounting interfaces.
- SELL reuses the cashier and Add Items flow already present in the repository.
- GO stays unavailable in the launcher until a real pickup order lifecycle exists.
- Platform Admin remains the current king-only clients interface. Its separate staff identity boundary is still to be built.

## Source of truth during transition

| Concern | Today | Intended V2 source |
| --- | --- | --- |
| Person | Supabase Auth | Supabase Auth |
| Company selected for existing APIs | `user_profiles.company_id` | Active `company_memberships` plus a company selection mechanism |
| Branch access | `branches`, `membership_branch_access` seeded; no active branches yet | Same tables, enforced for operational records |
| Application access | `company_features` plus user role permissions | Subscription-backed `company_modules` plus permissions |
| Staff access | `user_profiles.role = king_admin` | Dedicated platform roles independent of customer membership |
| Order | Existing `sales_orders` | Shared SELL/GO order lifecycle with source channel and idempotent transitions |

Do not treat an app tile as a security boundary: API authorization and RLS remain authoritative. During the bridge, a company membership must be active to render the new Control Center and Operations entry point; existing API routes still require migration to the membership model.

## Next delivery gates

1. Make company selection and membership authorization consistent in every customer API. Update the user-creation workflow to create a membership and migrate old users before enforcing it globally. Verify suspended and cross-company users cannot fetch or mutate data.
2. Define the module catalog, subscription entitlements, and company-module bridge. Backfill current `features` and `company_features`; keep existing subscriptions active during transition.
3. Create branch records and connect operational records to branches where appropriate. Verify cross-branch access with both API and RLS checks.
4. Finish Operations: recipes, food/product cost, HR, assets, maintenance, and internal reports; check every screen against its API and entitlement.
5. Normalize SELL order and payment transitions before GO. Add idempotent inventory consumption and accounting postings with reconciliation checks.
6. Launch GO with online pickup for Fattirat Lebanon and Beyond Catering. Add delivery after the pickup flow is proven.
7. Expose LEO, VEXA, GORE, AREO tools via company- and branch-scoped permissions, approvals, and audit records. Keep FOXY on hold for this wave.
8. Separate Vercel projects only after the shared session, cross-app navigation, APIs, and deployment contracts are verified end to end.

## Release rule

Ship only to `codex/avero-v2-architecture` Preview until the app and tenant isolation gates pass. Production remains untouched.
