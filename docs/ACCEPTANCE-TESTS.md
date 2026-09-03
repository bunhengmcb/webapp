# MCB Inventory System - Acceptance Test Gate

## Inventory integrity
- New Item Master item does not appear as zero stock at every site.
- Current Stock cannot be manually overwritten through normal UI/API.
- Stock Out cannot make Available Stock negative.
- Failed transaction changes neither stock nor BOM state.
- Posted transaction cannot be edited/deleted; correction/reversal retains original.

## Stock In
- Stockkeeper submits Stock In -> Pending Verification -> Current Stock unchanged.
- Assigned Stock Controller verifies -> transaction Posted -> Current Stock increases once.
- Same verification repeated cannot double-post.
- User outside site cannot verify/post.
- Accepted qty posts; rejected/damaged qty does not.
- Stock In over Approved BOM is blocked and creates/links BOM Hold behavior.

## Stock Out batch
- Whole batch validates before post.
- Aggregate duplicate lines for same item/cost code cannot evade stock/BOM limit.
- One invalid row prevents partial invisible posting unless explicitly designed as partial batch.
- Physical Transaction Date and Posted At differ correctly for backdated paper entry.

## Transfer
- Pending transfer has no stock effect.
- Approval creates reservation and reduces Available only.
- Dispatch reduces sender On Hand once.
- Full receipt increases receiver once.
- Partial receipt keeps remaining In Transit - Disputed.
- Unrelated site cannot see/act on operational transfer.
- Post-dispatch normal cancel is rejected.

## Physical count
- Counter sees/enters Actual Count without System Qty anchoring.
- Recount contains only variance lines.
- Count approval creates controlled variance posting; no silent stock overwrite.

## Security/access
- Developer all-sites/full administration.
- Stock Controller cannot change Item Master/BOM/access unless explicit override.
- Stockkeeper cannot post Stock Out or adjustments by default.
- QS cannot post stock.
- Management write attempts are rejected server-side.
- Site-scoped users cannot mutate other-site records by crafting API payload.
- Access changes are audit logged.

## Concurrency/idempotency
- Two users cannot consume the same last available quantity.
- Duplicate submit/retry cannot post transaction twice.
- Concurrent unrelated site operations should not cause data loss.

## Period/site lifecycle
- Closed month rejects normal backdated posting.
- Warranty site allows configured defect operations.
- Final closure blocked by unresolved stock/equipment/transfer/open transactions.
- Archived site remains report/audit searchable.
