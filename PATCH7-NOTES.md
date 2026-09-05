# MCB V100 PATCH7 — Current Stock / Adjustment Integrity

Launch-critical controls completed:

- Current Stock is read-only for normal direct edits; balance changes flow through controlled records.
- Opening Balance workflow: Stockkeeper maker → Stock Controller independent check → Admin final verify/post.
- Stock Adjustment workflow: Stock Controller maker → Admin final verify/post.
- Opening Balance can only be created when the current balance is zero and there is no prior inventory movement for that site/item.
- Maker/checker separation is enforced server-side.
- Stale requests are rejected if live stock changed after request creation.
- Final Admin approval is the only normal point that updates stock.
- Approved transactions preserve previousQty/newQty and audit reference/reason.
- Not Active project/site guard remains enforced.
- Legacy Pending adjustment records normalize to Pending Admin for compatibility.

Validation:
- npx tsc --noEmit — PASS
- V100 Current Stock Integrity Gates — PASS
- V100 Equipment Workflow Gates — PASS
- V100 Site Transfer Workflow Gates — PASS
- V100 Stock In Workflow Gates — PASS
- V100 Project Lifecycle Gates — PASS
- V100 Role Authority Gates — PASS
- RC5 Hardening Gates — PASS
- V96 Static Gates — PASS
- Physical Count Controls — PASS
- Physical Count Static Integration — PASS
