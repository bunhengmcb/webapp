MCB Inventory V43.12 STAGING - Approval State Fix

Scope:
- Fix approval of pending registration requests that collide with inactive legacy user rows created by V43.10.
- Adopt/reactivate the matching inactive legacy account instead of rejecting it as a duplicate.
- Keep active accounts protected from takeover.
- Normalize active/pending state returned by /api/users so the User Access counter and dropdown agree.
- Log server-side approval failures without exposing database details to users.

No database migration is required. This patch assumes V43.11 migration 0005_registration_requests.sql is already applied.

Files:
- app/api/users/route.ts
- app/page.tsx

Deploy:
1. Extract over D:\MCB-Inventory-System-Source
2. npm run / vinext build as used for your project
3. npx @vinext/cloudflare deploy --name mcb-inventory-staging

Test:
- Login as Developer.
- User Access should show the pending request as Pending and counter should match.
- Set Access=Active and Save access.
- The request should become an active user and disappear from pending.
- Logout and login with the approved user's username/password.
