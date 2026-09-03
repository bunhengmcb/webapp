MCB Inventory V43.10 STAGING — Registration Approval Workflow

Scope:
- Approved /register form now creates a real Pending user in D1.
- Username + password credentials are stored as PBKDF2 verifiers (100,000 iterations).
- Pending requests appear in User Access.
- Developer or Admin can approve Storekeeper/QS/Management.
- Admin requests require Developer approval.
- Approved users can sign in with Username + Password.
- Developer remains hidden from public registration.
- Employee ID and phone stay optional.

Remote migration required before deploy:
  npx wrangler d1 execute mcb-inventory-staging --remote --file=drizzle/0004_username_auth.sql
