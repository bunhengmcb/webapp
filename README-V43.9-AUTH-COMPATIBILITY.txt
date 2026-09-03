MCB Inventory V43.9-STAGING - Cloudflare auth compatibility fix

Changes:
- PBKDF2 iterations reduced from 120,000 to 100,000 to match Cloudflare Workers WebCrypto limit.
- Developer password verifier hash regenerated at 100,000 iterations using the existing staging salt and temporary Developer password.
- Login frontend no longer assumes every backend response contains JSON; backend failures show a user-friendly login service error.

Scope:
- Authentication only.
- No inventory, dashboard, register UI, D1 schema, or role-flow changes.

After extracting over the current source:
1. npx vinext build
2. npx @vinext/cloudflare deploy --name mcb-inventory-staging
3. Test Developer login.
