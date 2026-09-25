# AVERO OS — engineering and security baseline

Status: incremental target architecture. The existing AVERO application remains the product base. This document records the boundaries to apply as features are changed; it does not claim that every existing route already follows them.

## Scope and source of truth

- One company workspace and shared identity across Manager, Operations, Sell, GO and Intelligence. King Admin is a platform role and its controls never depend on client navigation visibility.
- Production data and deployments use the AVERO India Supabase project (`haxotqhdpdkbhhrmjrro`, `ap-south-1`) and the existing Vercel application. Do not connect to the retired Tokyo project.
- A subscription enables an app or agent; a role grants actions within that app; tenant and branch ownership constrain data. A hidden sidebar item is presentation only, never authorization.

## Code boundaries for incremental extraction

| Layer | Responsibility | Rule |
| --- | --- | --- |
| `app/**` | Pages, route handlers, HTTP decoding and responses | No direct trust in body-supplied company, branch, user or warehouse IDs. Route handlers call an authorized use case. |
| `lib/auth/**` | Session, King/tenant membership, effective permissions, entitlements | Fail closed when an identity, active membership or feature is missing. |
| `lib/{inventory,sell,go,...}/**` | Domain input, invariants and use cases | Keep business decisions independently testable from Next.js and Supabase where practical. |
| `lib/supabase/**` and future data adapters | Authenticated and privileged persistence | A service-role client bypasses RLS: every query and mutation must carry the authenticated tenant scope and validate related records. |
| `supabase/migrations/**` | Schema, composite tenant keys, RLS, constraints and indexes | Database constraints are a second enforcement layer; verify on India before applying additive migrations. |

Request path: authenticate → resolve active tenant membership → check subscribed app/agent → check action permission → validate and scope all referenced records → mutate → record actor and audit event → return tenant-safe response. AI tools and Make callbacks use the same authorization boundary, not their own broad service key logic.

## First implemented slice: warehouse access

`POST /api/inventory/access` now validates UUIDs and boolean flags, verifies the target user's profile and active company membership, and verifies that the active warehouse belongs to the same company before a privileged upsert. The request cannot award cost visibility unless its caller has cost permission or the appropriate admin role. Pure input and tenant-boundary tests live in `tests/warehouse-access.test.mjs`.

This is an API guard, not yet a database invariant. The warehouse access table currently has a foreign key to the warehouse ID but no composite company/warehouse key. Before adding one, inspect existing rows, add the corresponding `(id, company_id)` unique key, and apply a reviewed additive migration. Also examine concurrent membership changes and audit consistency when moving the write into a single database transaction.

## Security backlog in order

1. **WhatsApp inbound webhooks:** both native and `/webhook` POST endpoints currently accept callbacks without checking Meta's `X-Hub-Signature-256` against the raw body and app secret. Configure the India production app secret as a server-only secret, implement and test signature validation, then deploy both routes together. Do not enable fail-closed verification until the secret is present, to avoid interrupting legitimate orders/messages.
2. **Service-role surface:** inventory and other legacy API handlers still contain direct privileged queries and `@ts-nocheck`. Inventory access is the first migrated route; audit remaining write endpoints for related IDs that could cross companies, then move one use case at a time behind a scoped data adapter.
3. **Database integrity:** add composite tenant foreign keys and constraints on sensitive relationships after checking India data. Keep RLS enabled for any table accessed with a user session; service-role calls still require explicit tenant validation.
4. **Authentication hardening:** Supabase advisor reports leaked-password protection disabled. Review existing login experience and enable the Auth setting through a planned release.
5. **Audit guarantees:** make permission changes and their audit record atomic; surface failed audit writes instead of treating them as a successful permission change.

## Engineering gates

- Add meaningful tests for tenant A versus tenant B, missing subscription, revoked membership, missing permission and forbidden referenced IDs on every extracted use case.
- Run production build and focused tests before merge. For migration changes, inspect live India schema and affected rows first, then validate the migration on a safe environment.
- Ship small changes to the existing application and verify the Vercel deployment. Separate Vercel projects only when shared auth, session handoff, API contracts and routing are proven; split by domain boundaries, not by sidebar labels.
