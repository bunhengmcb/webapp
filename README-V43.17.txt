MCB Inventory V43.17 STAGING - Data Storage & Backup Foundation

Adds:
- /api/system/health database/environment health endpoint
- explicit staging and production configuration templates
- D1 backup/export and restore-safety procedure
- production separation checklist

Important:
- No production D1 database is created automatically.
- No existing wrangler config is overwritten.
- No inventory business logic is changed.
- V43.16 audit/security changes remain included in this cumulative patch.

Deploy staging:
1. Extract over D:\MCB-Inventory-System-Source
2. Keep your CURRENT working wrangler configuration/database_id.
3. Add APP_ENV=staging and DB_ENV=staging to the active Cloudflare config if not already set.
4. npx vinext build
5. npx @vinext/cloudflare deploy --name mcb-inventory-staging
6. Open /api/system/health and confirm staging + connected.

Backup before the next feature phase:
npx wrangler d1 export mcb-inventory-staging --remote --output=backups\mcb-inventory-staging-backup.sql
