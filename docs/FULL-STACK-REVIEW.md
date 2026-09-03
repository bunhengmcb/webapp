# MCB Inventory System - Full-Stack Review

## Executive status
**Current classification: FINAL-CANDIDATE DEVELOPMENT, not yet production-ready.**

The v94 baseline has a strong functional prototype and restored approved UI direction. The v95 candidate hardens workflow and access control. A full production declaration must wait until the transfer lifecycle, permission overrides, count/adjustment authority, period closing and relational posting architecture are completed and tested.

## Frontend
### Strengths
- Broad operational coverage in one application.
- Existing management dashboard, Item Master, BOM, Current Stock, Stock In/Out, Transfer, Equipment, counts, reports, audit, suppliers, sites and access UI.
- Light, practical operational UI direction can be retained.
- Evidence fields and transaction verification surfaces already exist.

### Risks / gaps
- `app/page.tsx` is very large and couples many domains; regression risk is high.
- Site Transfer UI still requires full reserved/dispatch/partial receipt/dispute state machine.
- Physical Count must become blind-count/recount-first rather than exposing system quantity too early.
- Permission Overrides need a clear UI and permission-aware navigation/action controls.
- Error/conflict handling needs user-draft preservation and safe retry.

## Backend/API
### Strengths
- Central state route with optimistic revision checking detects concurrent stale writes.
- Server-side role/site authorization is being strengthened in v95.
- Strict BOM validation exists for newly posted Stock In/Out.
- User-management writes are Developer-controlled in v95.

### Risks / gaps
- Whole-state JSON posting causes contention across unrelated users/sites.
- Stock/BOM/reservation needs line-level atomic database transactions for production.
- Idempotency keys are required to prevent double posting on retry.
- Transfer partial receipts/disputes need server-enforced state transitions.
- Period close needs server enforcement.
- Permission Overrides need server enforcement; UI-only override is insufficient.

## Data model
### Current
Main operational state is effectively a JSON document plus revision number.

### Production target
Use relational tables/ledger for items, sites, users/access, BOM versions, transactions/lines, stock positions/reservations, transfers/receipts, equipment custody, counts, adjustments, periods, approvals/action items and audit events.

## Security/access
- Developer is superuser and controls access assignment.
- Regular Admin must not self-escalate.
- Site users must be restricted on server, not only in dropdowns.
- Management defaults to read-oriented access.
- All critical access and posting decisions must produce audit events.
- Critical Developer override should require a reason and remain auditable.

## Data integrity controls
Production gate requires:
- no negative Available Stock;
- no over-BOM operational posting;
- atomic batch Stock Out;
- transfer reservation and one-time receipt;
- immutable posted transactions;
- controlled corrections/reversals;
- count variance approval;
- period lock;
- duplicate/idempotency protection;
- tested concurrent posting.

## Backup/recovery
Source backup is not runtime-data backup. Production must define scheduled D1/data backups, restore test procedure, retention and responsible owner. Restore should remain a privileged Developer function and every restore should be audited.

## Testing gate
Use `docs/ACCEPTANCE-TESTS.md` as the minimum acceptance set. Add API-level authorization tests and concurrent posting tests before launch.
