# MCB Inventory System - Workflow Specification

Status legend: LOCKED | NEEDS DECISION | GAP | FUTURE PHASE

## 1. Item Master - LOCKED
Trigger: Need a new controlled material/tool/equipment identity.
Creator: Authorized master-data user (default Developer/Admin subject to permission).
Checker/Approver: Business policy to be finalized if item approval is required.
System: Global item identity. Status Active/Inactive. Must not create zero Current Stock rows at every site.
Stock effect: None.
BOM effect: None until linked to BOM/cost code.
Audit: create/update/status changes.

## 2. Opening Balance - LOCKED DIRECTION
Trigger: Site/item initialization.
Creator: Site operation user according to permission.
Approver: Stock Controller.
Informed: Site team.
System: Only initialization; after go-live use controlled Adjustment.
Stock effect: On approval only.
BOM effect: NEEDS DECISION for pre-existing project stock.

## 3. Stock In - LOCKED CORE
Trigger: Supplier delivery arrives.
Creator: Site Stockkeeper physically checks delivery and DN; submits receipt.
Checker/Approver: Stock Controller verifies DN/evidence.
System: validate item/site/cost code/BOM, quantity/evidence, duplicate posting.
Stock effect: Stockkeeper submission = none; Stock Controller verification/post = On Hand + accepted quantity.
BOM effect: strict approved BOM purchase limit; excess is blocked.
Exception: BOM HOLD -> QS BOM revision workflow. Rejected/damaged quantity never enters usable stock.
Audit: transaction date, posted timestamp, creator, verifier, evidence, reference, accepted/rejected qty.
PO/DN edge cases: NEEDS DECISION.

## 4. Daily Stock Out - LOCKED CORE / BUILD GAP
Trigger: Daily paper issue record.
Creator/Data Entry: Stock Controller in Phase 1.
Approver: No per-line approval in normal daily operation.
System: Batch/Grid entry; validate all rows before posting. Qty <= Available; Qty <= Approved BOM Remaining.
Stock effect: On batch Post only, atomically.
BOM effect: consumption recorded against project/item/cost code.
Exception: insufficient stock = hard block; over BOM = BOM HOLD/QS action.
Audit: daily sheet ref, physical transaction date, posted time/by, rows and responsible receiver/issued-to.
Future: AI/Telegram extracts paper into same review grid; human reviews/posts.

## 5. Site Transfer - LOCKED CORE / BUILD GAP
Lifecycle: Draft -> Pending Approval -> Approved/Reserved -> Dispatch -> In Transit -> Receiver Confirm -> Complete.
Creator: Sender-side authorized site user.
Approver: Permission matrix to finalize; approval creates reservation.
Sender action: Dispatch after approval.
Receiver action: Confirm actual received quantity.
System stock:
- Draft/Pending: no stock effect.
- Approved: Reserved +; On Hand unchanged; Available -.
- Dispatch: sender On Hand -; reservation clears; In Transit +.
- Receipt: receiver On Hand + actual received; In Transit - actual received.
Mismatch: sent 80 / received 78 -> receive 78; remaining 2 stays In Transit - Disputed.
Exception owner: sender + receiver first; serious/unresolved mismatch concluded by Stock Controller.
Cancel: before dispatch can release reservation; after dispatch use return/exception, never simple cancel.
BOM effect timing: NEEDS DECISION. Newer direction expects transfer allocation control; older spreadsheet rule excluded transfer from BOM consumption.

## 6. Equipment / Reusable Small Tools - LOCKED DIRECTION / BUILD GAP
Flow: Checkout -> Outstanding -> Return.
Condition: Good / Damaged / Lost.
System: reusable items follow borrow/return rather than consumable Stock Out.
Open decisions: overdue escalation, repair, scrap, replacement authority.

## 7. Consumable Material Return - LOCKED DIRECTION / BUILD GAP
Trigger: Unused issued material returned to warehouse.
Creator: Authorized site operation user.
System: link to original Stock Out; cannot return more than eligible issued quantity.
Stock effect: On Hand + accepted returned quantity.
BOM effect: reduce net consumption, preserving gross history.
Audit: original transaction link, condition, quantity, return reason.

## 8. Physical Count - LOCKED CORE / BUILD GAP
Weekly: Stock Controller + Site Stockkeeper.
Monthly: Stock Controller + Site Stockkeeper + Admin joint check.
Count principle: blind count. Enter Actual Count before revealing System Qty/Variance.
Rounds: 1st Count -> Recount variance items -> Final Count.
System: snapshot/cutoff at count; count does not silently overwrite stock.
Variance: confirmed variance goes through controlled adjustment/correction.

## 9. Adjustment / Correction / Reversal - LOCKED
Draft: editable.
Posted: immutable; no edit/delete.
Correction/reversal: new linked transaction with reason, original transaction, corrected by, timestamp and before/after values.
Stock effect: atomic new adjustment only when authorized.
Approval authority for count variance: NEEDS DECISION.

## 10. Backdating / Month Close - LOCKED CONCEPT / BUILD GAP
Transaction Date = physical movement date.
Posted At = system timestamp.
Open month: authorized users may enter valid backdated paper movements.
Closed month: normal posting into period blocked.
Corrections after close: controlled correction/reversal.
Close/reopen authority: NEEDS DECISION.

## 11. Site Lifecycle - LOCKED / BUILD GAP
Active Construction -> Handover -> Warranty/Defect Period -> Final Closure -> Archived.
Warranty remains operational for defect work with restricted unnecessary actions.
Final closure requires stock/equipment/transfers/open transactions resolved.
History is retained and searchable.

## 12. Access Control - LOCKED ARCHITECTURE / PARTIAL BUILD
Target: Role -> Site Assignment -> Permission Overrides -> Status Active/Inactive.
Developer sets role/site/overrides. No expiry/duration field.
Explicit Deny wins.
All access changes audit logged.
