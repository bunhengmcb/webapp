# MCB Inventory Control System - PD Meeting Brief

## Purpose
MCB Inventory Control is a centralized multi-site control system for construction materials, small tools and equipment. The aim is not only to record stock, but to prevent uncontrolled movement, connect material activity to the approved BOM, make responsibility visible and preserve a reliable audit trail.

## Management outcomes
- One controlled source of inventory truth across sites.
- Clear accountability for receiving, issuing, transferring, counting and correcting stock.
- Strict Approved BOM control: operational users cannot bypass the limit.
- Current Stock is system-controlled rather than manually overwritten.
- Site-to-site transfers remain accountable from sender to receiver.
- Reusable tools/equipment remain traceable through checkout/return and condition.
- Weekly/monthly physical counts identify variance through a controlled correction path.
- Management receives dashboards, reports, exceptions and audit history without performing daily data entry.

## Operating model
### Normal operations
Keep normal work fast. The system validates stock, BOM, role and site automatically. Human approval is reserved for high-risk points and exceptions.

### Exception operations
- Over BOM -> BOM Hold -> QS action -> approved revision -> release.
- Insufficient stock -> hard block; replenish/transfer/correct through an authorized process.
- Transfer mismatch -> sender/receiver resolve normal discrepancy; serious/unresolved case goes to Stock Controller.
- Wrong posted transaction -> correction/reversal; original history remains.
- Physical-count variance -> confirm/recount -> controlled adjustment.

## Key responsibilities
- Developer: system administration, role/site/permission control and technical override with audit.
- Stock Controller: operational inventory control, daily Stock Out entry, Stock In verification, count control and serious transfer/stock exceptions.
- Stockkeeper: site receiving, evidence/data submission, site transfer/receipt work, equipment custody and count entry.
- QS: Approved BOM/cost-code control and BOM revision action.
- Admin: project/site/master administrative support according to permissions; monthly count participation.
- Management: management visibility, reports and oversight; not routine stock posting.

## Current build position
Baseline source is FINAL v94. v95 working candidate is being hardened against the workflow specification. The candidate already includes or improves role/site restrictions, strict Stock In/Out BOM blocking, Stockkeeper Stock In pending verification, controlled Item Master-to-site activation, Current Stock site-position filtering, backdated Transaction Date vs Posted At, and a Daily Stock Out Batch/Grid direction.

## Production architecture decision
The current application uses a whole-application state payload with revision conflict protection. This is useful for a prototype/demo, but production multi-site posting should move high-integrity inventory operations to a relational transaction ledger with atomic stock/BOM updates, reservations, transfer receipts, period locks and idempotency.

## Decisions requested from PD / management
1. Who gives final approval to increase an Approved BOM revision after QS prepares it?
2. For Site Transfer, should BOM allocation move at approval, dispatch or receipt? Recommended: receiver allocation at confirmed receipt; sender release at dispatch/confirmed transfer policy.
3. Who is authorized to approve final physical-count variance adjustments?
4. Who can close and reopen an accounting/inventory month?
5. What is the transfer approval owner for normal site-to-site movement?
6. PO/DN exceptions: allow Stock In without PO? How to treat substitution, over-delivery and cancelled PO?
7. Equipment authority: who concludes Lost/Damaged/Repair/Scrap/replacement cases?

## Rollout recommendation
Phase 1: controlled manual workflow and real-site pilot.
Phase 2: stabilize, train users and validate weekly/monthly controls.
Phase 3: AI/Telegram document extraction into review grids; AI never posts stock automatically.
Phase 4: broader multi-site rollout after concurrency, security, backup/restore and disaster-recovery tests pass.
