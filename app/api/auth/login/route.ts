import { env } from "cloudflare:workers";
import { hashSessionToken, verifyPassword } from "../../../auth/password";

export const dynamic = "force-dynamic";

type Role = "Developer" | "Admin" | "MD" | "PD" | "FM" | "PM" | "TMS" | "SRA" | "TMMEP" | "QSM" | "Site Engineer" | "Stock Controller" | "Stockkeeper" | "QS";
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

function sessionCookie(token: string, maxAge: number) {
  return `__Host-mcb_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}; Priority=High`;
}

function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

async function digestHex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function securityEvent(action: string, username: string, role: string, request: Request, detail = "") {
  const ip = request.headers.get("cf-connecting-ip") || "";
  const ipHint = ip ? `${ip.split(".").slice(0,2).join(".")}.*.*` : "";
  await env.DB.prepare("INSERT INTO security_events (id,occurred_at,action,username,role,ip_hint,user_agent,detail) VALUES (?,?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(),new Date().toISOString(),action,username,role,ipHint,request.headers.get("user-agent")||"Unknown",detail).run().catch(()=>undefined);
}

async function attemptKey(request: Request, username: string) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return digestHex(`${username}|${ip}`);
}

async function blocked(key: string) {
  const cutoff = new Date(Date.now() - WINDOW_MS).toISOString();
  const row = await env.DB.prepare("SELECT COUNT(*) AS failures FROM login_attempts WHERE attempt_key=? AND success=0 AND occurred_at>=?")
    .bind(key, cutoff).first<{ failures: number }>();
  return Number(row?.failures || 0) >= MAX_FAILURES;
}

async function recordAttempt(request: Request, key: string, username: string, success: boolean) {
  await env.DB.prepare("INSERT INTO login_attempts (id,attempt_key,username,success,occurred_at,user_agent) VALUES (?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), key, username, success ? 1 : 0, new Date().toISOString(), request.headers.get("user-agent") || "Unknown").run();
  if (success) await env.DB.prepare("DELETE FROM login_attempts WHERE attempt_key=? AND success=0").bind(key).run();
  // Keep the security table bounded without requiring a scheduled job.
  const stale = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare("DELETE FROM login_attempts WHERE occurred_at<?").bind(stale).run().catch(() => undefined);
}

async function issueSession(request: Request, user: { userId: string; username: string; email: string; name: string; role: Role }, remember: boolean) {
  const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
  const tokenHash = await hashSessionToken(token);
  const now = new Date();
  const maxAge = remember ? 60 * 60 * 24 * 7 : 60 * 60 * 12;
  const expiresAt = new Date(now.getTime() + maxAge * 1000).toISOString();
  await env.DB.prepare("INSERT INTO auth_sessions (token_hash,user_id,username,email,name,role,created_at,expires_at,last_seen_at) VALUES (?,?,?,?,?,?,?,?,?)")
    .bind(tokenHash, user.userId, user.username, user.email, user.name, user.role, now.toISOString(), expiresAt, now.toISOString()).run();
  await env.DB.prepare("INSERT OR IGNORE INTO login_history (session_id,user_id,email,name,role,login_at,user_agent) VALUES (?,?,?,?,?,?,?)")
    .bind(`auth:${tokenHash.slice(0, 40)}`, user.userId, user.email, user.name, user.role, now.toISOString(), request.headers.get("user-agent") || "Unknown").run().catch(() => undefined);
  return Response.json({ ok: true, role: user.role }, {
    headers: {
      "Set-Cookie": sessionCookie(token, maxAge),
      "Cache-Control": "no-store, private",
      "Pragma": "no-cache",
    },
  });
}

function authError(status = 401) {
  return Response.json({ error: "Incorrect username or password" }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!env.DB) return Response.json({ error: "Database unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const body = await request.json().catch(() => null) as { username?: string; password?: string; remember?: boolean } | null;
  const username = body?.username?.trim().toLowerCase();
  const password = body?.password || "";
  if (!username || !password) return Response.json({ error: "Enter your username and password" }, { status: 400, headers: { "Cache-Control": "no-store" } });

  const key = await attemptKey(request, username);
  if (await blocked(key)) {
    return Response.json({ error: "Too many sign-in attempts. Try again in 15 minutes." }, {
      status: 429,
      headers: { "Retry-After": "900", "Cache-Control": "no-store" },
    });
  }

  const row = await env.DB.prepare("SELECT c.user_id AS userId,c.username,c.password_salt AS passwordSalt,c.password_hash AS passwordHash,c.password_iterations AS passwordIterations,u.email,u.name,u.role,u.active FROM auth_credentials c JOIN users u ON u.user_id=c.user_id WHERE c.username=?")
    .bind(username).first<{ userId:string; username:string; passwordSalt:string; passwordHash:string; passwordIterations:number; email:string; name:string; role:Role; active:number }>();

  const validPassword = Boolean(row) && await verifyPassword(password, row!.passwordSalt, row!.passwordHash, Number(row!.passwordIterations));
  if (!row || !validPassword) {
    await recordAttempt(request, key, username, false);
    await securityEvent("LOGIN FAILED",username,row?.role||"",request);
    return authError();
  }
  if (!row.active) {
    await recordAttempt(request, key, username, false);
    return Response.json({ error: "Your account is waiting for administrator approval" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  await recordAttempt(request, key, username, true);
  await securityEvent("LOGIN SUCCESS",username,row.role,request);
  return issueSession(request, { userId: row.userId, username: row.username, email: row.email, name: row.name, role: row.role }, Boolean(body?.remember));
}
