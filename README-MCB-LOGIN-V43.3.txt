MCB Inventory V43.3 STAGING - Login Page Preview

Scope:
- Adds a new /login route only.
- Does NOT change Dashboard, inventory logic, D1 data, roles, or existing staging identity.
- Login form is UI/UX preview only. It does not authenticate yet.
- Next phase will connect approved MCB users and protect application routes.

Install on Windows:
1. Extract this ZIP into D:\MCB-Inventory-System-Source
2. Replace/merge folders when prompted. Existing files are not overwritten except if app\login already exists.
3. Run: npx vinext build
4. Run: npx @vinext/cloudflare deploy --name mcb-inventory-staging
5. Open: https://mcb-inventory-staging.bunhengmcb.workers.dev/login

Rollback:
- Delete app\login and redeploy the previous build.
