# AVERO Mobile App

AVERO uses Capacitor as a native iOS/Android shell while loading the production AVERO web app from Vercel.

## Architecture
- Native app ID: com.avero.os
- App name: AVERO
- Live app URL: https://avero-dashboard-avero5.vercel.app
- Backend/auth/data remain shared with the web app.

## First native build
1. npm install
2. npx cap add ios
3. npx cap add android
4. npm run mobile:sync
5. npm run mobile:ios or npm run mobile:android

## Update behavior
Most web UI, dashboard, POS, CRM, AI-agent and server-side changes deployed to Vercel appear in the installed app automatically because the native shell loads the production app URL.

A new store build is still required for changes to native permissions, push-notification capabilities, app icons/splash assets, bundle identifiers, native plugins, or native iOS/Android code.
