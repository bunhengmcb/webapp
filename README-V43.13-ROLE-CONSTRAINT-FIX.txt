MCB Inventory V43.13 STAGING - Admin Registration Role Constraint + Pending Counter Fix

Changes
- D1 registration_profiles requested_role now accepts: Storekeeper, QS, Management, Admin.
- Developer remains excluded from registration.
- User Access active/pending counter now reflects persisted request state, not an unsaved dropdown selection.
- No inventory/business-flow changes.

IMPORTANT: Run the new D1 migration before redeploying:
  npx wrangler d1 execute mcb-inventory-staging --remote --file=drizzle/0006_registration_role_admin.sql

Then:
  npx vinext build
  npx @vinext/cloudflare deploy --name mcb-inventory-staging

Test
1. Login as Developer.
2. User Access should show the registration request as pending until approval is actually saved.
3. Select the desired role, set Access=Active, click Save access.
4. The request should become an active user and the pending count should drop only after the API succeeds.
