MCB Inventory V43.2 STAGING online-auth patch

Purpose:
- Enables the existing synthetic Local Admin identity on the exact staging hostname:
  mcb-inventory-staging.bunhengmcb.workers.dev
- Keeps localhost / 127.0.0.1 support.
- Does NOT enable the identity for any future production/custom domain.

Install:
1. Extract this ZIP into D:\MCB-Inventory-System-Source
2. Replace app\local-identity.ts when prompted.
3. Rebuild and redeploy.

Security note:
This is temporary STAGING access. Anyone who can reach the staging URL will share the Local Admin identity until Cloudflare Access or final production authentication is configured. Do not use real production data while this patch is active.
