# V95 Implementation Status

## Implemented/hardened in this candidate
- Expanded role model: Developer, Stock Controller, Stockkeeper, QS, Admin, Management.
- Developer-controlled user access and first-account Developer bootstrap.
- Assigned-site filtering for operational forms and views.
- New global Item Master item no longer creates zero stock position on every site.
- Dashboard/Current Stock no longer treats uninitialized global items as site out-of-stock lines.
- Stockkeeper Stock In creates Pending Verification without changing stock.
- Stock Controller verification transitions Pending Verification -> Posted and applies stock once through the expected controlled state change.
- Strict Approved BOM server/frontend blocking for Stock In and Stock Out; over-BOM operational override removed.
- BOM Hold status/action path to QS.
- Daily Stock Out Batch/Grid with aggregate Available Stock and BOM validation before posting.
- Separate physical Transaction Date from system posting timestamp.
- Stronger server-side role/site authorization scaffolding.
- Coding-agent contract, workflow spec, responsibility matrix, architecture review and acceptance tests.

## Validation completed
- TypeScript/TSX syntax transpilation check passed for changed core files.
- DOCX deliverables rendered and visually reviewed.

## Validation blocked in this environment
A full dependency install/build cannot complete because the working container cannot resolve `registry.npmjs.org`; the source package does not contain a complete installed node_modules tree. Therefore this candidate MUST be built in the normal connected CI/Sites environment before deployment.

## Remaining production gates
- Full transfer reservation/approval/dispatch/partial receipt/dispute workflow.
- Relational transaction ledger / line-level atomic inventory architecture.
- Permission Overrides data model + UI + server enforcement.
- Blind physical count/recount and final variance authority.
- BOM revision approval workflow and transfer-BOM timing decision.
- Period close/reopen.
- Site lifecycle stages through Warranty/Archive.
- PO/DN exception controls.
- Material Return linked to original Stock Out.
- Final equipment Lost/Damaged/Repair/Scrap authority/workflow.
- Idempotency/concurrency tests and API authorization test suite.
