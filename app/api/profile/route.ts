import { env } from "cloudflare:workers";
import { requestIdentity } from "../../local-identity";

export const dynamic = "force-dynamic";

async function identity() {
  const current = await requestIdentity();
  if (!current)
    return { error: Response.json({ error: "Authentication required" }, { status: 401 }) };
  if (!env.DB)
    return { error: Response.json({ error: "Database unavailable" }, { status: 503 }) };
  return { db: env.DB, id: current.id, email: current.email.toLowerCase() };
}

export async function GET() {
  const context = await identity();
  if (context.error) return context.error;
  const profile = await context.db!.prepare(
    "SELECT u.user_id AS userId,u.email,COALESCE(NULLIF(TRIM(u.display_name),''),u.name) AS name,u.role,u.active,CASE WHEN p.employee_id LIKE 'UNASSIGNED:%' THEN '' ELSE p.employee_id END AS employeeId,p.phone FROM users u LEFT JOIN registration_profiles p ON p.user_id=u.user_id WHERE u.user_id=?",
  ).bind(context.id).first();
  if (!profile) return Response.json({ error: "Profile not found" }, { status: 404 });
  return Response.json({ profile }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const context = await identity();
  if (context.error) return context.error;
  const body = await request.json().catch(() => null) as {
    name?: string;
    employeeId?: string;
    phone?: string;
  } | null;
  const name = body?.name?.trim();
  const employeeId = body?.employeeId?.trim().toUpperCase();
  const phone = body?.phone?.trim();
  if (!name || name.length > 120 || (employeeId?.length ?? 0) > 40 || (phone?.length ?? 0) > 40)
    return Response.json({ error: "Enter a valid name and optional contact details" }, { status: 400 });

  const current = await context.db!.prepare(
    "SELECT COALESCE(NULLIF(TRIM(u.display_name),''),u.name) AS name,p.employee_id AS employeeId,p.phone FROM users u LEFT JOIN registration_profiles p ON p.user_id=u.user_id WHERE u.user_id=?",
  ).bind(context.id).first<{ name: string; employeeId: string | null; phone: string | null }>();
  if (!current) return Response.json({ error: "Profile not found" }, { status: 404 });
  const now = new Date().toISOString();
  try {
    await context.db!.batch([
      context.db!.prepare("UPDATE users SET display_name=?,updated_at=? WHERE user_id=?").bind(name, now, context.id),
      context.db!.prepare("INSERT INTO registration_profiles (user_id,employee_id,phone,site,requested_role,note,submitted_at,approved_at,approved_by) SELECT user_id,?,?, '[]',role,'',?,?,? FROM users WHERE user_id=? ON CONFLICT(user_id) DO UPDATE SET employee_id=excluded.employee_id,phone=excluded.phone").bind(employeeId||`UNASSIGNED:${context.id}`, phone||"", now, now, context.id, context.id),
      context.db!.prepare("INSERT INTO audit_logs (id,occurred_at,actor_id,actor_email,actor_role,action,from_revision,to_revision,summary) SELECT ?,?,?,?,role,'PROFILE UPDATE',0,0,? FROM users WHERE user_id=?").bind(crypto.randomUUID(), now, context.id, context.email, JSON.stringify({ previous: current, next: { name, employeeId:employeeId||"", phone:phone||"" } }), context.id),
    ]);
  } catch {
    return Response.json({ error: "Employee ID is already assigned to another user" }, { status: 409 });
  }
  return Response.json({ ok: true, name });
}
