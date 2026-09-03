MCB Inventory V43.11 STAGING - Registration Approval Link

What changed
- Registration requests are now stored separately as Pending requests.
- User Access GET reads Pending requests and approved users together.
- A Pending request appears with Access=Pending and the requested role.
- Developer/Admin changes Access to Active and presses Save access to approve.
- Admin role requests require Developer approval.
- Approval creates the actual users, registration_profiles and auth_credentials rows in one batch.
- After approval, the Pending request is marked Approved and disappears from pending.

Required migration
npx wrangler d1 execute mcb-inventory-staging --remote --file=drizzle/0005_registration_requests.sql

Then build/deploy
npx vinext build
npx @vinext/cloudflare deploy --name mcb-inventory-staging

Test
1. Register a brand-new username.
2. Confirm success message says pending approval.
3. Login as Developer.
4. Open User Access: counter should show 1 pending and row should appear.
5. Set Access=Active and Save access.
6. Logout and login with the newly approved username/password.
