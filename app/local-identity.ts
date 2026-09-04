import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { hashSessionToken } from "./auth/password";

export type RequestIdentity = {
  id: string;
  email: string;
  name: string;
  username: string;
  role: string;
};

const LOCAL_ADMIN: RequestIdentity = { id: "local-admin", email: "local.admin@mcb.test", name: "Local Admin", username: "local-admin", role: "Developer" };

// Test override hook for integration tests. Tests may set this to simulate identities.
// Test override hook: available only in test environment via `process.env.NODE_ENV === 'test'`.
// This prevents runtime identity bypass in staging/production.
let TEST_IDENTITY_OVERRIDE: RequestIdentity | null = null;

export function __setTestIdentityOverride(identity: RequestIdentity | null) {
  // Only allow in Node test environment. Cloudflare Workers and production environments
  // do not have `process.env.NODE_ENV === 'test'` so this cannot be enabled there.
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') {
    TEST_IDENTITY_OVERRIDE = identity;
    return;
  }
  throw new Error('Test identity override is restricted to test environment');
}

function isLoopbackHost(host: string | null): boolean {
  if (!host) return false;
  const normalized = host.toLowerCase();
  return normalized === "localhost" || normalized.startsWith("localhost:") || normalized === "127.0.0.1" || normalized.startsWith("127.0.0.1:") || normalized === "[::1]" || normalized.startsWith("[::1]:");
}

function cookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(";")) {
    const [key, ...rest] = pair.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

async function deleteSession(tokenHash: string) {
  await env.DB.prepare("DELETE FROM auth_sessions WHERE token_hash=?").bind(tokenHash).run().catch(() => undefined);
}

export async function requestIdentity(): Promise<RequestIdentity | null> {
  if (TEST_IDENTITY_OVERRIDE) return TEST_IDENTITY_OVERRIDE;
  const h = await headers();
  const sessionToken = cookieValue(h.get("cookie"), "__Host-mcb_session");
  if (sessionToken && env.DB) {
    const tokenHash = await hashSessionToken(sessionToken);
    const row = await env.DB.prepare("SELECT s.user_id AS userId,s.username,u.email,COALESCE(NULLIF(TRIM(u.display_name),''),u.name) AS name,u.role,u.active,s.created_at AS createdAt,s.expires_at AS expiresAt,s.last_seen_at AS lastSeenAt FROM auth_sessions s JOIN users u ON u.user_id=s.user_id WHERE s.token_hash=?")
      .bind(tokenHash).first<{ userId: string; username: string; email: string; name: string; role: string; active: number; createdAt: string; expiresAt: string; lastSeenAt: string }>();
    if (row) {
      const now = Date.now();
      const absoluteExpiry = Date.parse(row.expiresAt);
      const sessionSpan = absoluteExpiry - Date.parse(row.createdAt);
      const idleLimit = sessionSpan > 24 * 60 * 60 * 1000 ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
      const idleExpired = now - Date.parse(row.lastSeenAt) > idleLimit;
      if (absoluteExpiry <= now || idleExpired) {
        await deleteSession(tokenHash);
        return null;
      }

      if (!row.active) {
        await deleteSession(tokenHash);
        return null;
      }

      // Reduce write amplification: touch the session at most once every five minutes.
      if (now - Date.parse(row.lastSeenAt) > 5 * 60 * 1000) {
        await env.DB.prepare("UPDATE auth_sessions SET last_seen_at=? WHERE token_hash=?").bind(new Date(now).toISOString(), tokenHash).run();
      }
      return { id: row.userId, username: row.username, email: row.email, name: row.name, role: row.role };
    }
  }

  // V43.18: hosted environments trust only MCB's own server-side session.
  // The previous hosted identity-header fallback has been removed so
  // public Worker requests cannot authenticate through legacy ChatGPT hosting headers.

  // Local development fallback requires BOTH a loopback host and ENVIRONMENT=local.
  // Staging/production therefore cannot be bypassed by changing request headers.
  const appEnv = String(env.ENVIRONMENT || "").toLowerCase();
  if (appEnv === "local" && isLoopbackHost(h.get("host")))
    return LOCAL_ADMIN;
  return null;
}
