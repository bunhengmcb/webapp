MCB Inventory V43.15 - Security Hardening

Scope only: authentication/session security. Inventory business logic and RBAC are not changed.

Changes:
- Login throttling: 5 failed attempts per username+IP in 15 minutes, then HTTP 429.
- Login attempt records are automatically pruned after 24 hours.
- Session cookies use HttpOnly + Secure + SameSite=Strict + Priority=High.
- Sessions have absolute expiry plus idle expiry (2h normal; 24h when Remember Me is used).
- Disabled accounts lose existing sessions on their next authenticated request.
- Session last-seen writes are limited to once per 5 minutes.
- Successful authentication is recorded in login_history immediately.
- Logout deletes the server session and expires the cookie.
- Local Admin fallback remains loopback-only.

Migration required before deploy:
  npx wrangler d1 execute mcb-inventory-staging --remote --file=drizzle/0007_security_hardening.sql
