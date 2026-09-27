# AVERO Client Apps — Foundation

This branch introduces the reusable white-label app model for companies managed by AVERO.

## Model
- One AVERO company/tenant can own one or more client apps.
- Each app has independent branding, slug/domain, platform targets and module selection.
- Business data remains company-scoped in AVERO/Supabase.
- Web/PWA can be delivered first; iOS/Android builds can use the same app blueprint later.
- Store signing credentials are not stored in the app definition.

## Tables
- client_apps
- client_app_modules
- client_app_builds

## Builder route
- /client-apps

## Next implementation phase
1. Apply migration with company-scoped RLS policies.
2. Connect builder UI to CRUD API.
3. Add logo/icon storage.
4. Add app runtime that resolves a blueprint by domain/slug.
5. Add web/PWA build + custom-domain pipeline.
6. Add iOS/Android packaging and signing integration.
7. Add King Admin subscription, entitlement and build controls.
