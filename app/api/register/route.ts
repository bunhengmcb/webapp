import { env } from "cloudflare:workers";
import { constantTimeSecretEqual, createPasswordVerifier } from "../../auth/password";

export const dynamic = "force-dynamic";
type Role = "Developer" | "Admin" | "MD" | "PD" | "FM" | "PM" | "TMS" | "SRA" | "TMMEP" | "QSM" | "Site Engineer" | "Stock Controller" | "Stockkeeper" | "QS";
const requestableRoles: Role[] = ["Stock Controller", "Stockkeeper", "Site Engineer", "QS"];
const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,39}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function options(status = 200) {
  return { status, headers: { "Cache-Control": "no-store, private" } };
}
function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
async function firstAccount() {
  const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM users").first<{ total: number }>();
  return Number(row?.total ?? 0) === 0;
}

export async function GET() {
  if (!env.DB) return Response.json({ error: "Database unavailable" }, options(503));
  return Response.json({ firstAccount: await firstAccount() }, options());
}

export async function POST(request: Request) {
  if (!env.DB) return Response.json({ error: "Database unavailable" }, options(503));
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin" }, options(403));
  const body = await request.json().catch(() => null) as {
    name?: string; email?: string; username?: string; password?: string;
    employeeId?: string; phone?: string; site?: string; requestedRole?: Role;
    bootstrapCode?: string;
  } | null;
  const name = body?.name?.trim() ?? "", email = body?.email?.trim().toLowerCase() ?? "";
  const username = body?.username?.trim().toLowerCase() ?? "", password = body?.password ?? "";
  const employeeId = body?.employeeId?.trim().toUpperCase() ?? "", phone = body?.phone?.trim() ?? "";
  const site = body?.site?.trim().toUpperCase() ?? "", requestedRole = body?.requestedRole;
  const isFirst = await firstAccount();
  const validRequestedRole = requestedRole === "Developer" ? isFirst : Boolean(requestedRole && requestableRoles.includes(requestedRole));
  const invalidFields = [
    ...(!name || name.length > 120 ? ["name"] : []),
    ...(!emailPattern.test(email) ? ["email"] : []),
    ...(!usernamePattern.test(username) ? ["username"] : []),
    ...(password.length < 8 || password.length > 200 ? ["password"] : []),
    ...(!site || site.length > 20 ? ["site"] : []),
    ...(!validRequestedRole ? ["requested role"] : []),
  ];
  if (invalidFields.length)
    return Response.json({ error: `Please correct: ${invalidFields.join(", ")}` }, options(400));

  if (isFirst) {
    const expected = env.BOOTSTRAP_REGISTRATION_TOKEN, provided = body?.bootstrapCode ?? "";
    if (!expected || expected.length < 24 || !(await constantTimeSecretEqual(provided, expected)))
      return Response.json({ error: "The Developer setup code is incorrect" }, options(403));
  }

  const verifier = await createPasswordVerifier(password), userId = `user:${crypto.randomUUID()}`;
  const role: Role = isFirst ? "Developer" : requestedRole!, active = isFirst ? 1 : 0;
  const now = new Date().toISOString(), profileEmployeeId = employeeId || `UNASSIGNED:${userId}`;
  const invited = await env.DB.prepare("SELECT user_id AS userId,role,active FROM users WHERE email=? AND user_id LIKE 'invite:%'")
    .bind(email).first<{ userId: string; role: Role; active: number }>();
  if (invited) {
    try {
      await env.DB.batch([
        env.DB.prepare("UPDATE users SET user_id=?,name=?,updated_at=? WHERE user_id=?").bind(userId, name, now, invited.userId),
        env.DB.prepare("UPDATE registration_profiles SET user_id=?,employee_id=?,phone=? WHERE user_id=?").bind(userId, profileEmployeeId, phone, invited.userId),
        env.DB.prepare("INSERT INTO auth_credentials (user_id,username,password_salt,password_hash,password_iterations,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").bind(userId, username, verifier.salt, verifier.hash, verifier.iterations, now, now),
      ]);
    } catch {
      return Response.json({ error: "Username, email or employee ID is already registered" }, options(409));
    }
    return Response.json({ approved: Boolean(invited.active), message: invited.active ? "Registration complete. You can now sign in." : "Registration submitted for Developer approval." }, options());
  }

  const statements = [
    ...(isFirst ? [env.DB.prepare("INSERT INTO auth_bootstrap (id,user_id,claimed_at) VALUES (1,?,?)").bind(userId, now)] : []),
    env.DB.prepare("INSERT INTO users (user_id,email,name,display_name,role,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").bind(userId, email, name, name, role, active, now, now),
    env.DB.prepare("INSERT INTO auth_credentials (user_id,username,password_salt,password_hash,password_iterations,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").bind(userId, username, verifier.salt, verifier.hash, verifier.iterations, now, now),
    env.DB.prepare("INSERT INTO registration_profiles (user_id,employee_id,phone,site,requested_role,note,submitted_at,approved_at,approved_by) VALUES (?,?,?,?,?,?,?,?,?)").bind(userId, profileEmployeeId, phone, JSON.stringify([site]), role, isFirst ? "Initial controlled Developer registration" : "", now, isFirst ? now : null, isFirst ? userId : null),
    env.DB.prepare("INSERT INTO audit_logs (id,occurred_at,actor_id,actor_email,actor_role,action,from_revision,to_revision,summary) VALUES (?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), now, userId, email, role, isFirst ? "DEVELOPER BOOTSTRAP" : "REGISTRATION SUBMITTED", 0, 0, JSON.stringify({ username, requestedRole: role, site })),
  ];
  try {
    await env.DB.batch(statements);
  } catch {
    return Response.json({ error: isFirst ? "Developer registration was already claimed or the account details already exist" : "Username, email or employee ID is already registered" }, options(409));
  }
  return Response.json({ approved: isFirst, message: isFirst ? "Registration complete. Developer access activated." : "Registration submitted for Developer approval." }, options());
}
