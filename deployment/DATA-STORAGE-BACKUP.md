# MCB Inventory — Data Storage & Backup Baseline

## Environment rule
- STAGING Worker must bind only to `mcb-inventory-staging`.
- PRODUCTION Worker must bind only to a separate `mcb-inventory-production` D1 database.
- Never reuse a D1 `database_id` between staging and production.
- Do not copy test users/sessions into production unless intentionally seeded.

## Health check
After deployment open `/api/system/health`. It returns only environment/database connection status and no credentials or business data. Expected staging values are `environment: staging`, `databaseEnvironment: staging`, and `database: connected`.

## Staging backup
Run from the project folder before migrations or major feature releases:

```cmd
if not exist backups mkdir backups
npx wrangler d1 export mcb-inventory-staging --remote --output=backups\mcb-inventory-staging-backup.sql
```

Rename/copy the SQL file with the date/time before making another backup so it is not overwritten. Keep at least one copy outside the project folder.

## Restore safety
Do not restore a backup into the live database until the SQL backup has first been tested against a disposable/test D1 database. A restore can overwrite or conflict with newer records.

## Production creation (later, after inventory validation)
1. Create a new D1 database named `mcb-inventory-production`.
2. Put its new database ID only in the production config.
3. Apply the full migration chain to production.
4. Deploy a separate Worker named `mcb-inventory-production`.
5. Verify `/api/system/health` reports production before entering real stock.

This patch does not create or modify the production database automatically. That is intentional protection against accidental staging/production mixing.
