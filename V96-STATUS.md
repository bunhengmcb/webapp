# V96 Real Site Workflow Alignment — Execution Status

Started: 2026-08-28
Baseline: protected FINAL v94 (untouched in Library)
Working copy: local V96 execution workspace

## Coded in this execution pass
- Ported the stronger V95 authorization/workflow hardening into V96 instead of rebuilding it.
- Restored strict server-side site scoping for Stock Controller, Stockkeeper and QS operations.
- Restored Stock In Pending Verification -> Stock Controller verification/post flow.
- Restored strict BOM validation for Stock In/Out and aggregate transaction control.
- Restored Daily Stock Out batch UI and Stock Controller posting restriction.
- Expanded role model: Developer, Admin, Stock Controller, Stockkeeper, Site Team, QS, PM, Management.
- Added role-view defaults for Site Team and PM.
- Split Stock Controller from Stockkeeper navigation.
- Restricted global site visibility to Developer in the frontend.
- Restricted User Access API administration to Developer.
- First-account bootstrap changed from Admin to Developer.
- Registration/user role lists expanded for the real-site responsibility hierarchy.
- Added conservative backend behavior for Site Team/PM (read-only state mutation until exact action permissions are implemented).

## Release blockers still open
- Exact PM/Site Team action permissions and notification/escalation rules.
- Full transfer state machine and reservation semantics.
- Blind Physical Count/recount/variance approval.
- BOM revision approval authority.
- Relational ledger/atomic posting/idempotency production architecture.
- Migration agent output for Project/Site + Item Master + BOM + Physical Count opening stock.
- Full runtime build, QA, security, staging deploy, mobile verification, backup/restore test.

## Release rule
Nothing is LIVE/VERIFIED until Team 2 deploys an approved release candidate and post-deploy checks pass.

## QA checkpoint — 2026-08-28
- TypeScript syntax/transpile check: PASS for page.tsx, state/users/register APIs, db/schema.ts.
- V96 static release gates: PASS.
- Full dependency-resolved build/runtime test: still pending (environment dependencies not installed in this container).
- Status remains CODING/STATIC-QA, not DEPLOYED or VERIFIED.

## RC2 execution pass — 2026-08-29
- Upgraded Site Transfer from immediate source deduction to controlled lifecycle: Pending Approval -> Approved / Reserved -> In Transit -> Received.
- Added pre-dispatch cancellation for Pending Approval / Approved-Reserved transfers.
- Added reservation-aware Available Stock calculation so approved transfers reduce availability before physical dispatch.
- Daily Stock Out validation now respects transfer reservations.
- Added server-side transfer transition authorization and reservation integrity check.
- Destination stock still increases only after receipt confirmation.
- V96 static gates extended for transfer lifecycle and PASS.
- Full dependency-resolved TypeScript/runtime build remains blocked in this container because npm dependency installation timed out; no staging/live claim made.

## RC3 continuation — 2026-08-29
- Physical Count Draft is now blind: System Qty and Variance remain hidden until submission.
- Added guarded Excel migration-preparation script for Project/Site, Item Master and approved BOM source data.
- Migration script explicitly refuses to derive Opening Current Stock from legacy Current Stock; verified Physical Count remains the required opening source.
- Missing UOM is flagged UOM_REVIEW and quantity is never auto-converted.
- Added formal V96 release gate document.
- Static V96 gates PASS after these changes.
- Full dependency-resolved build/runtime QA remains NOT VERIFIED because package installation cannot complete in this container.
- Staging/production deployment remains NOT PERFORMED; no accessible GitHub repository was found through the connected GitHub account.

## RC4 — 2026-08-29
- Physical Count upgraded to: Blind 1st Count -> Pending Recount when variance exists -> variance-only Recount -> Stock Controller review -> final variance posting.
- Backend validation updated for recount states and final recount quantity.
- Migration script corrected to use actual Project Site headers (`Site Code`, `Site Name`) and ignore hidden reserved sites.
- Source audit: 4 active sites, 980 populated Item Master rows, 386 missing-UOM review rows, 0 populated Approved BOM Data rows.
- Opening Stock remains blocked pending verified Physical Count data.
- Static regression: PASS.
