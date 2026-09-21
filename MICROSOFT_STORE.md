# AVERO — Microsoft Store / Windows

AVERO is prepared as an installable Progressive Web App for Windows and Microsoft Store packaging.

## Live production URL
https://avero-dashboard-avero5.vercel.app

## Architecture
- App type: PWA packaged for Microsoft Store
- Hosting: Vercel
- Backend/Auth/Data: Supabase
- Web app updates: delivered from the live hosted app without repackaging for ordinary UI/business-logic changes
- Store package updates: only needed for package identity, icons/assets, native Windows capabilities, or Store metadata changes

## Microsoft Store publication flow
1. Enroll in Microsoft Partner Center as a Windows developer.
2. Reserve the product name AVERO.
3. Copy Package ID, Publisher ID, and Publisher display name from Partner Center.
4. Open PWABuilder and analyze the production URL.
5. Generate the Windows package using the Partner Center identity values.
6. Upload the generated package to Partner Center.
7. Complete Store listing, screenshots, age ratings, privacy/support URLs, and submit for certification.

## Current repo readiness
- HTTPS production URL: yes
- Web app manifest: yes
- Service worker: yes
- Standalone display mode: yes
- Windows-friendly orientation: yes
- Business/productivity categories: yes
- App shortcuts: yes

## Pending external account data
The final signed Store submission package requires the Microsoft Partner Center Product Identity values. These are account-bound and cannot be invented in source code.
