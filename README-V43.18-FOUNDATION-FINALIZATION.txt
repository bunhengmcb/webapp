MCB Inventory System V43.18 — Foundation Finalization

Purpose
-------
Final narrow foundation cleanup before V90 rebuild. Inventory business logic is unchanged.

Fix 1 — Remove legacy hosted identity fallback
----------------------------------------------
- Public/staging/production requests authenticate only through the MCB mcb_session cookie.
- Legacy hosted identity headers are no longer accepted.
- Local development fallback is allowed only when BOTH:
    APP_ENV=local
    Host is localhost / 127.0.0.1 / ::1
- The localhost fallback is Developer-equivalent for local development only.

Fix 2 — Make Admin '+ Add user' create a real account
-----------------------------------------------------
The Add User form now collects:
- Full Name (required)
- Username (required, 3-32 lowercase letters/numbers/._-)
- Initial Password (required, minimum 8 characters)
- Employee ID (optional)
- Phone (optional)
- Primary Site (required)
- Role (required)

The API now creates all required records together:
- users
- registration_profiles
- auth_credentials (PBKDF2 password verifier)
- audit log
- security event

Rules preserved:
- Developer never appears as a creatable employee role.
- Only Developer can directly create an Admin account.
- Admin can directly create Storekeeper / QS / Management accounts.
- Username 'bunheng' remains reserved for Developer.
- Existing username / pending username / employee ID collisions are rejected.

Database migration
------------------
NONE. V43.18 uses the existing V43.17 schema.

Deploy
------
1. Extract this ZIP over:
   D:\MCB-Inventory-System-Source
2. Build:
   npx vinext build
3. Deploy staging:
   npx @vinext/cloudflare deploy --name mcb-inventory-staging

Recommended validation after deployment
---------------------------------------
1. /api/system/health => staging + database connected.
2. Developer login works.
3. Register a normal test user => Pending => approve => login works.
4. Developer: User Access > Add User => create Storekeeper with username/password => login works.
5. Admin: Add User can create Storekeeper/QS/Management.
6. Admin cannot directly create Admin; Developer can.
7. Direct-added user's site/RBAC restrictions work.
8. Logout destroys session.
9. Audit trail records USER CREATED.

If all tests pass, freeze V43.18 as FINAL FOUNDATION BASELINE before V90 rebuild.
