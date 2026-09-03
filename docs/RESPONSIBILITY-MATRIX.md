# MCB Inventory System - Responsibility Matrix

| Workflow | Do / Create | Check | Approve / Control | Action / Exception Owner | Informed | Stock Effect |
|---|---|---|---|---|---|---|
| Item Master | Authorized master-data user | Master-data checker as configured | Developer/Admin policy | Developer for duplicates/data conflicts | Relevant inventory/QS users | None |
| Opening Balance | Authorized site user | Stock Controller | Stock Controller | Stock Controller | Site team | On approval |
| Stock In | Site Stockkeeper | Stock Controller verifies DN/evidence | Stock Controller posts | QS for BOM Hold; supplier/site for delivery issue | Site/management via status | On verification/post |
| Daily Stock Out | Stock Controller | System validates entire batch | Normal flow: no per-line approval | QS for BOM Hold; Stock Controller for source-sheet correction | Site/management via records | On atomic batch post |
| Transfer | Sender authorized user | System validates availability; receiver checks actual | Approval role TBD | Sender/receiver normal mismatch; Stock Controller serious/unresolved | Both involved sites | Reserve -> dispatch -> receipt stages |
| Equipment Checkout | Authorized site user | Warehouse/site checker | Per permission | Stock Controller for unresolved lost/damaged | Assigned site | Reusable custody state |
| Material Return | Authorized site user | Warehouse checker | Per permission | Stock Controller if quantity/condition disputed | Site | On accepted return |
| Weekly Count | Site Stockkeeper + Stock Controller | Joint | Stock Controller controls final variance path | Stock Controller | Site | None until adjustment |
| Monthly Count | Site Stockkeeper + Stock Controller + Admin | Joint | Variance authority TBD | Stock Controller prepares exception | Management/Admin | None until adjustment |
| Correction/Reversal | Authorized controller | System + audit | Sensitive authority per permission | Stock Controller/Developer | Audit/report consumers | New linked transaction |
| BOM Revision | QS prepares | Cost/control review | FINAL APPROVER TBD | QS | Stock Controller/site when hold released | No direct stock effect |
| Month Close | TBD | System checks unresolved operations | CLOSE/REOPEN AUTHORITY TBD | Developer for technical exception | Management | Blocks period posting |
| Site Final Closure | Site/Admin team | Stock Controller + relevant equipment/transfer owners | Authority TBD | Site/Admin/Stock Controller | Management | Must be cleared before archive |
| User Access | Developer | Developer | Developer | Developer | Audit/management as required | None |
