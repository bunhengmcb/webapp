# MCB Inventory V96 — RC5 Hardening/UI Restoration Patch

This patch was prepared from the uploaded V96 RC4 standalone-auth staging source. It is **not production-deployed**. Apply to the current Codex working tree, then run the full build/runtime/staging test suite before release.

## Fixed in this patch

- Server-side `/api/state` site isolation for non-Developer users.
- Safe scoped-state merge on PUT so hidden-site data is preserved instead of being deleted by a site-scoped client.
- Conflict (`409`) state responses are site-scoped too.
- Transaction-evidence GET object/site authorization.
- Transaction-evidence upload is site-bound, same-origin protected, and validates JPG/PNG/WebP/PDF signatures.
- Item-photo PUT/DELETE same-origin protection and real WebP signature validation.
- Record IDs switched from timestamp + `Math.random()` to `crypto.randomUUID()`.
- Management/Admin stock-adjustment approval path wired to the existing approval validator.
- Stock Controller can create Pending adjustments but cannot self-approve them.
- Stock-count maker/checker check: a Stock Controller cannot approve a count they created; another Stock Controller or Developer is required.
- BOM consumption now nets linked reversal/correction transactions before enforcing approved quantity.
- Drizzle migration set reconciled to 0000-0004; stale unjournaled experimental SQL archived as non-executable `.txt` documentation.
- Security response headers added.
- UI restored toward the approved light-blue / Outline Modern direction while preserving the V96 feature/backend structure.
- Added `tests/rc5-hardening-gates.mjs`.

## Static verification run here

- `node tests/v96-static-gates.mjs` — PASS
- `node tests/standalone-auth-gates.mjs` — PASS
- `node tests/rc5-hardening-gates.mjs` — PASS

A dependency-resolved TypeScript/build/runtime test must still be run by Codex before staging deployment.

## Deliberately not silently redesigned

Equipment server-side arithmetic validation needs a lifecycle-aware data-model change and runtime tests. Do not implement a shallow check that can corrupt checkout/partial-return/repair/lost/scrap flows. Treat it as a remaining P1 implementation task.

Backup/restore is a runtime release gate: perform an actual staging backup and restore drill rather than marking it fixed from static source review.

## Remove from the current working tree when applying

The following old unjournaled Drizzle SQL files are archived in this patch and should not remain active under `drizzle/`:

- `drizzle/0003_auth_sessions.sql`
- `drizzle/0004_username_auth.sql`
- `drizzle/0005_registration_requests.sql`
- `drizzle/0006_registration_role_admin.sql`
- `drizzle/0007_security_hardening.sql`
- `drizzle/0008_audit_security_events.sql`

Use `drizzle/0004_standalone_auth.sql` instead.
