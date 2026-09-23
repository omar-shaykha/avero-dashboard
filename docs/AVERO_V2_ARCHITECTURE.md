# AVERO V2 Architecture

**Status:** Architecture baseline approved for implementation planning  
**Repository baseline:** `avero-dashboard` at commit `6ad5828c1c115d3731770913c62ba55be0746405`  
**Target database:** AVERO-India  
**Hosting and automation:** Vercel, Supabase, Make.com

## Product direction

AVERO is a unified Business Operating System. Users experience one platform, one login, and one workspace even when application domains are deployed separately in the future.

- One Platform. Every Business.
- One Business. One Account. One Operating System.

AVERO serves multiple business types through a shared core and configurable applications. Business type recommends an application setup; subscription entitlements determine what the company can use.

## Application boundaries

### AVERO Admin
Internal AVERO control plane for clients, subscriptions, billing, modules, platform users and permissions, agent usage, integrations, system health, support, analytics, and platform settings. Platform staff authorization is separate from customer company membership.

### Client Workspace / AVERO Core
Shared entry point and Control Center: company profile, branches, user memberships, roles and permissions, settings, integrations, subscription details, audit logs, and application launcher.

### AVERO Operations
Company operations: inventory, warehouses, purchasing, suppliers, recipes, product cost, production, HR and attendance, accounting and expenses, assets, maintenance, and operational reporting.

### AVERO SELL
In-person and business sales: cashier/POS, orders, tables, menu/items, KDS, payments, customers, loyalty, returns, shifts, and sales reporting.

### AVERO GO
Customer-facing order entry: online ordering, pickup, delivery, reservations, QR ordering, and customer experiences. Driver management is a later capability.

### AVERO Intelligence
Shared AI layer. LEO, VEXA, GORE, and AREO use authorized domain operations and data. Each agent has explicit company, branch, application, and action permissions, with human approval where required. FOXY Marketing is on hold and outside the current implementation scope.

## Technical shape

1. Start with the existing `avero-dashboard` repository as the product foundation.
2. Organize code into explicit Core, Admin, Operations, SELL, GO, Intelligence, and shared Platform domains.
3. Keep one Vercel deployment while boundaries and API contracts mature. Reassess separate deployments only after the domains are stable.
4. Use AVERO-India as the target Supabase project.
5. Keep one logical data platform with company and branch isolation enforced by database policies and server-side authorization.
6. Use Make.com for current automation and WhatsApp integrations.
7. Treat existing production systems as the source for gradual reuse and migration; avoid destructive rebuilds.

## Identity, tenancy, and authorization

- Supabase Auth owns the person’s login identity.
- A person can have multiple company memberships.
- A membership carries its own status, roles, and branch access.
- Branches belong to a company. Company-wide records remain company-scoped; operational records may also be branch-scoped.
- A company subscription grants applications and module entitlements.
- User roles and permissions determine actions available inside those entitlements.
- AVERO platform staff have separate platform roles and are not automatically company members.
- Authorization must not depend on user-editable metadata.
- RLS policies and API authorization must use the same membership and branch model.

## Cross-application order flow

GO and SELL use a shared order lifecycle. Orders retain their source channel. SELL owns accepting and fulfilling business orders; Operations owns resulting stock consumption, cost, and operational reporting. State transitions must be idempotent so duplicate requests cannot duplicate payments or inventory movements.

## Reuse map

| Existing foundation | V2 destination | Treatment |
|---|---|---|
| Companies and activity catalog | Core | Reuse and normalize business type |
| User profiles, roles, permissions | Core | Separate personal profile from company membership; preserve existing authorization during transition |
| Features and subscriptions | Core | Map existing features to application/module entitlements |
| Client administration | AVERO Admin | Reuse workflows; establish a separate internal permission boundary |
| Inventory, suppliers, purchasing, production, accounting, HR | Operations | Reuse existing schema and APIs; complete operator-facing workflows |
| Cashier and Add Items | SELL | Reuse as the initial sales workspace |
| AI configuration, runs, CRM, leads | Intelligence | Reuse with explicit domain permissions |
| WhatsApp and ZATCA | Platform integrations | Reuse behind company-scoped integration connections |
| Marketing / FOXY | Deferred | Keep out of current V2 scope |

The small `avero-core-fixed-deploy.zip` starter is not the source of truth: its queries and Supabase reference do not match the active repository and AVERO-India schema.

## Implementation sequence and gates

1. **Foundation:** define and backfill company memberships; add branch model; preserve legacy profile behavior; test RLS against cross-company and cross-branch access.
2. **Control planes:** separate Admin authorization from customer workspace; add company/branch selection and application launcher.
3. **Operations:** expose and organize existing operational domains with shared authorization and branch scope.
4. **SELL:** retain cashier and Add Items; standardize order, payment, shift, and stock-consumption transitions.
5. **GO:** define external ordering and customer workflow on the shared order lifecycle.
6. **Intelligence:** expose domain tools under the same permission model and record actions/approvals.
7. **Deployment review:** assess independent deployments after boundaries, session strategy, and API contracts are stable.

Do not apply database changes until the migration path for AVERO-India is reproducible and tenant-isolation tests pass.

## Audit findings that shape this plan

- The active repository has 344 files, 41 app pages, and 67 API route handlers at the baseline commit.
- The repository already contains substantial Operations, sales, AI, administration, WhatsApp, and ZATCA capabilities.
- AVERO-India and the older AVERO project show the same 115 public tables and columns in the current catalog comparison.
- AVERO-India reports no registered migrations while the older project has a migration history. Establish a reproducible migration baseline before rollout.
- Current `user_profiles` has `user_id` as its primary key and a single `company_id`; this cannot represent one person’s memberships in multiple companies.
- Current schema has no dedicated branches, company-membership, or module-catalog tables. Existing `features` and `company_features` are candidates for the entitlement bridge.
- All 115 public tables report RLS enabled and at least one policy. Policy behavior still requires validation against the future membership and branch model.
