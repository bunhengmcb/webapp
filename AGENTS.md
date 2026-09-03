# MCB Inventory System - AI Implementation Contract

This repository is developed under a business-workflow-first rule. Coding agents MUST NOT invent or silently change inventory policy.

## Authority
- Business Owner: final business decisions.
- Lead Architect / Product & QA: ChatGPT. Maintains workflow, responsibility, architecture and acceptance criteria.
- Coding Agent: implements approved rules and reports conflicts/gaps before changing behavior.

## Golden Rule
Every feature must be traceable through:

**Business Rule -> Responsible Person -> Permission -> Database Effect -> BOM Effect -> UI State -> Audit Event -> Test Cases**

If any link is unknown, mark it `NEEDS DECISION`; do not guess.

## Protected Baseline
- Source baseline: MCB Inventory System FINAL v94.
- Do not overwrite the baseline artifact.
- Current working candidate: v95.

## Locked Business Controls
1. One central multi-site, multi-user system. Do not clone databases per site.
2. Global Item Master. A new item does not create zero stock rows at every site.
3. Current Stock is derived/controlled; users never type directly over posted stock.
4. On Hand = physically at site. Reserved = approved transfer commitment still at sender. Available = On Hand - Reserved.
5. Stock In and Stock Out for BOM-controlled items cannot exceed Approved BOM. No operational override.
6. Over BOM -> BLOCK/BOM HOLD -> QS action -> approved BOM revision -> release.
7. Stock Out cannot exceed Available Stock.
8. Draft records may be edited. Posted records are immutable. Corrections/reversals create linked audit records.
9. Transaction Date records physical movement; Posted At records system timestamp/user.
10. Site access is scoped. Developer has all-site full access. Role + Site Assignment + Permission Overrides + Active/Inactive is the target access model. Explicit Deny wins.
11. Site lifecycle target: Active Construction -> Handover -> Warranty/Defect -> Final Closure -> Archived. Never delete history.
12. Normal flow must be fast; exceptions receive human control. Do not make Stock Controller approve everything.

## Default Role Intent
- Developer: system superuser, all modules/sites; cannot erase audit history.
- Stock Controller: daily stock control, Stock Out batch entry, Stock In verification, counts, transfer exception control, corrections/adjustments within assigned sites.
- Stockkeeper: site receiving, transfer/receipt operations, equipment operations, stock count entry; no Stock Out posting by default, no BOM override, no direct stock adjustment.
- QS: BOM/cost-code control and BOM revision preparation; no stock posting.
- Admin: administrative/site/master support as explicitly permitted; cannot self-escalate access.
- Management: read-oriented management dashboards/reports/audit visibility.

## UX Rules
- Keep sidebar clean and grouped.
- Use action center/alerts for exceptions rather than adding a module for every exception.
- Forms must be practical for construction-site work, keyboard-friendly where data entry is repetitive.
- Preserve light-blue, clean, management-focused design direction.
- Never add complexity only to imitate a generic ERP.

## Required Engineering Controls
- Server-side authorization for every write. Hiding a button is not authorization.
- Atomic stock/BOM posting and duplicate/idempotency protection.
- No negative Available Stock.
- No stock/BOM update on a failed transaction.
- Site-scoped reads/writes except Developer or explicitly authorized management views.
- Immutable audit trail for posted inventory movement and access changes.
- Conflict handling must not silently discard a user's valid draft.

## Delivery Gate
Do not call a build production-ready until these are exercised:
- Item Master activation by site
- Opening Balance approval
- Stock In pending verification and posting
- BOM hold/revision
- Daily Stock Out batch and aggregate validation
- Transfer reservation/dispatch/partial receipt/mismatch
- Material/equipment return
- Physical count/recount/variance
- Correction/reversal
- concurrent posting
- month closing/backdating
- site warranty/final closure
- role/site/permission isolation
- audit and backup/restore controls
