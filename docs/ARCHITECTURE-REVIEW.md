# MCB Inventory System - Full-Stack Architecture Review

## Current v94/v95 foundation
- Next/React/Vinext application with Cloudflare D1/Drizzle support.
- Current state service stores the main application state as one JSON payload with a revision number.
- Revision checking is useful for detecting concurrent overwrite, but whole-state contention is a production limitation.

## Final production target
Move high-integrity operations to relational/ledger tables:
- items
- sites + lifecycle
- users, roles, user_site_access, permission_overrides
- bom_versions + bom_lines + revision approvals
- transactions + transaction_lines
- stock_positions (materialized/derived from ledger with controlled update)
- transfers + transfer_lines + receipts
- equipment_custody + condition events
- stock_counts + stock_count_lines
- adjustments/corrections
- approvals/action items
- accounting periods
- audit_events

## Transaction boundary
A stock posting should atomically:
1. authenticate/authorize user and site;
2. validate item/site/status;
3. lock/check Available Stock and BOM balance;
4. insert immutable ledger event;
5. update/derive stock position/reservation;
6. update workflow status/action item;
7. write audit event;
8. commit once.

## Risk in monolithic JSON state
- Unrelated users/sites can conflict on the same state revision.
- Retry/reload can be user-hostile if a draft is not preserved.
- Atomic line-level stock/BOM semantics are harder to guarantee.
- Query/report/audit growth becomes expensive.

Therefore the JSON state can support the current prototype/demo, but the production implementation should migrate inventory posting to the relational ledger before broad multi-site launch.

## Frontend architecture target
Split the current large page into domain modules:
- shell/navigation/access
- dashboard
- item-master
- bom
- current-stock
- stock-in
- stock-out-batch
- transfer
- equipment
- stock-count
- transactions/audit
- reports
- administration
Use shared form controls, status badges, evidence uploader, action center, permission hook, transaction API client and error/conflict handling.
