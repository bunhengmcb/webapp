MCB V43.8 STAGING - Developer Login

Scope:
- Adds functional Username + Password login for the protected Developer account.
- Developer username remains bunheng.
- Password is verified server-side using PBKDF2; plaintext is not stored in the UI or database.
- Adds HttpOnly/Secure/SameSite session cookie backed by D1 auth_sessions.
- Adds Developer full-access role to the inventory application.
- Replaces staging-host synthetic Local Admin with real session authentication.
- Keeps localhost Local Admin fallback for development only.
- Logout now clears the MCB session and returns to /login.

Before deploy, apply drizzle/0003_auth_sessions.sql to the staging D1 database.
