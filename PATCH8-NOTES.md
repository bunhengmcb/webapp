# MCB V100 PATCH8 — Stock Out + Physical Count Integration

## Physical Count
- Count maker is Stockkeeper (Developer override only).
- Session types: Weekly, Monthly, Spot Check; legacy MONTHLY_FULL/CYCLE remain readable.
- Blind first count remains enforced.
- Variances require variance-only recount before review.
- Submitted counts route to Stock Controller.
- Weekly/Spot: independent Stock Controller may approve/post.
- Monthly: independent Stock Controller checks and routes to Admin; independent Admin performs final verify/post.
- Maker/checker separation enforced server-side.
- Final count posting must match exact variance transactions and stock reconciliation.
- Not Active project guard remains in force.

## Stock Out
- Stockkeeper remains maker; Stock Controller remains verifier/poster.
- OPS/Daily Sheet reference required server-side.
- Each row requires valid item, positive quantity, and Requested/Issued To.
- During verification, Stock Controller may assign cost code but cannot silently change maker item or quantity.
- Final post requires an approved BOM mapping and respects BOM remaining quantity.
- Available stock check remains enforced.
- Maker/checker separation and duplicate-post/idempotency guard remain enforced.

## Validation
- TypeScript: PASS
- PATCH8 Stock Out + Physical Count gates: PASS
- PATCH7 Current Stock gates: PASS
- PATCH6 Equipment gates: PASS
- PATCH5 Site Transfer gates: PASS
- PATCH4 Stock In gates: PASS
- Project Lifecycle gates: PASS
- Role Authority gates: PASS
- RC5 Hardening gates: PASS
- V96 Static gates: PASS
- Physical Count controls/static integration: PASS
- Stock Out P1/integration route tests: PASS
