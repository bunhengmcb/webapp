MCB Inventory V43.16 STAGING - Audit Log & Security Activity

Adds:
- Developer/Admin audit trail inside User Access
- Security events for successful and failed logins
- Registration-submitted security event
- Unified /api/audit feed combining operational audit_logs and security_events
- D1 migration 0008_audit_security_events.sql

Deploy:
1. Extract over D:\MCB-Inventory-System-Source
2. npx wrangler d1 execute mcb-inventory-staging --remote --file=drizzle/0008_audit_security_events.sql
3. npx vinext build
4. npx @vinext/cloudflare deploy --name mcb-inventory-staging

No inventory calculation/business-flow changes are included.
