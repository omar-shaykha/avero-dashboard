# AVERO SaaS module access

AVERO Core uses one codebase and tenant-scoped feature access.

## Business applications
- POS / Sell: app_sell
- Manager monitoring: app_manager
- Stock, purchasing, production and accounting: app_operations
- Online ordering / AVERO GO: app_go
- AI & Automation: app_intelligence
- HR & Employees: app_hr
- Loyalty & Promotions: app_loyalty
- ZATCA Fatoora: app_zatca

Company access is stored in `company_features`. The King Admin API at
`/api/clients/[id]/features` is the source of truth for enabling or disabling
features per company.

## SaaS rule
A tenant only sees applications that are enabled for its company and that the
signed-in user is permitted to use. King Admin always retains platform-wide
visibility.

Example: a POS-only customer gets `app_sell` enabled. Operations, AI, GO,
HR, loyalty and ZATCA remain disabled and must not appear in the tenant
navigation.

Settings is not a standalone subscription: it is available to a tenant admin
when at least one subscribed business application is enabled and the user has
settings permission.

This keeps all customers on the same AVERO deployment while access is
controlled per company instead of creating a separate deployment per customer.
