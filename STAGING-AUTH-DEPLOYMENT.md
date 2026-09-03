# V96 RC5 standalone staging authentication and hardening

This source replaces the OpenAI Sites-only sign-in dependency with standalone,
D1-backed authentication. It does not change MCB inventory workflows, RBAC
roles, or site-access rules.

## Deploy to the existing isolated staging Worker

Run these commands in Git Bash from this source directory:

```bash
npm install
npx wrangler whoami
npx wrangler secret put BOOTSTRAP_REGISTRATION_TOKEN --config wrangler.staging.jsonc
bash scripts/deploy-v96-staging.sh
```

Choose a unique setup code of at least 24 characters when Wrangler prompts for
the secret. Keep it private. It is accepted only while the staging database has
no users, and the database atomically records that the Developer bootstrap has
been claimed.

The deploy script targets only:

- Worker: `mcb-inventory-v96-rc4-staging`
- D1: `mcb-inventory-v96-rc4-staging-db`
- R2: `mcb-inventory-v96-rc4-staging-r2`

It has no production route or custom domain.

## First controlled Developer registration

1. Open the staging URL ending in `/register`.
2. Enter the private setup code and the first Developer account details.
3. Sign in at `/login`.
4. Do not send the setup code or password through chat.

## Authenticated smoke test

After registration, run:

```bash
bash scripts/smoke-v96-auth-staging.sh
```

The script prompts locally for the Developer credentials and verifies the login
page, unauthenticated rejection, spoofed legacy-header rejection, authenticated
state, refresh persistence, logout, and post-logout rejection. Run it a second
time to verify re-login persistence.

## Backup/restore drill

After deployment and the authenticated smoke test, run:

```bash
bash scripts/drill-staging-backup-restore.sh
```

The drill exports the isolated staging D1 database, restores it into a fresh
local D1 instance, compares critical table counts, and runs SQLite integrity
checking. The timestamped backup stays under `backups/staging/` and is excluded
from source control.

Opening Stock and BOM data migrations remain excluded. Equipment server-side
arithmetic validation remains a documented P1 task and is not silently changed
by RC5.
