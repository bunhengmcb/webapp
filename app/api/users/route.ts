import { env } from "cloudflare:workers";
import { requestIdentity } from "../../local-identity";

export const dynamic = "force-dynamic";
type Role = "Admin" | "Developer" | "Stock Controller" | "Stockkeeper" | "Site Team" | "QS" | "PM" | "Management";

async function adminContext() {
  const identity = await requestIdentity();
  if (!identity)
    return {
      error: Response.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    };
  if (!env.DB)
    return {
      error: Response.json({ error: "Database unavailable" }, { status: 503 }),
    };
  const actor = await env.DB.prepare(
    "SELECT role,active FROM users WHERE user_id=?",
  )
    .bind(identity.id)
    .first<{ role: Role; active: number }>();
  if (!actor?.active || actor.role !== "Developer")
    return {
      error: Response.json(
        { error: "Developer permission required" },
        { status: 403 },
      ),
    };
  return { db: env.DB, id: identity.id, email: identity.email };
}

async function activeSiteCodes(db: D1Database) {
  const row = await db
    .prepare("SELECT payload FROM app_state WHERE id=1")
    .first<{ payload: string }>();
  try {
    const state = JSON.parse(row?.payload ?? "{}") as {
      sites?: Array<{ code: string; status: string }>;
    };
    const codes = (state.sites ?? [])
      .filter((site) => site.status === "Active")
      .map((site) => site.code);
    return codes.length ? codes : ["VLS", "SSP", "FPF", "WH"];
  } catch {
    return ["VLS", "SSP", "FPF", "WH"];
  }
}

function parseSites(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed))
      return parsed.filter((v) => typeof v === "string");
  } catch {}
  return value === "ALL SITES" ? ["ALL SITES"] : [value];
}

export async function GET() {
  const context = await adminContext();
  if (context.error) return context.error;
  const result = await context
    .db!.prepare(
      "SELECT u.user_id AS userId,u.email,COALESCE(NULLIF(TRIM(u.display_name),''),u.name) AS name,u.role,u.active,u.created_at AS createdAt,u.updated_at AS updatedAt,CASE WHEN p.employee_id LIKE 'UNASSIGNED:%' THEN '' ELSE p.employee_id END AS employeeId,p.phone,p.site,p.requested_role AS requestedRole,p.note FROM users u LEFT JOIN registration_profiles p ON p.user_id=u.user_id ORDER BY u.active DESC,COALESCE(NULLIF(TRIM(u.display_name),''),u.name)",
    )
    .all();
  const history = await context
    .db!.prepare(
      "SELECT session_id AS sessionId,email,name,role,login_at AS loginAt,user_agent AS userAgent FROM login_history ORDER BY login_at DESC LIMIT 100",
    )
    .all();
  return Response.json(
    {
      users: result.results.map((user) => ({
        ...user,
        sites: parseSites(user.site),
      })),
      history: history.results,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const context = await adminContext();
  if (context.error) return context.error;
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    name?: string;
    employeeId?: string;
    phone?: string;
    sites?: string[];
    role?: Role;
  } | null;
  const roles: Role[] = ["Admin", "Developer", "Stock Controller", "Stockkeeper", "Site Team", "QS", "PM", "Management"],
    allowedSites = await activeSiteCodes(context.db!),
    assignedSites = Array.from(new Set(body?.sites ?? [])),
    email = body?.email?.trim().toLowerCase();
  if (
    !email ||
    !email.includes("@") ||
    !body?.name?.trim() ||
    !body.role ||
    !roles.includes(body.role) ||
    assignedSites.some((site) => !allowedSites.includes(site))
  )
    return Response.json(
      { error: "Complete all required user fields" },
      { status: 400 },
    );
  const now = new Date().toISOString(),
    inviteId = `invite:${email}`;
  try {
    await context.db!.batch([
      context
        .db!.prepare(
          "INSERT INTO users (user_id,email,name,display_name,role,active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)",
        )
        .bind(
          inviteId,
          email,
          body.name.trim(),
          body.name.trim(),
          body.role,
          now,
          now,
        ),
      context
        .db!.prepare(
          "INSERT INTO registration_profiles (user_id,employee_id,phone,site,requested_role,note,submitted_at,approved_at,approved_by) VALUES (?,?,?,?,?,'Added by administrator',?,?,?)",
        )
        .bind(
          inviteId,
          body.employeeId?.trim().toUpperCase() || `UNASSIGNED:${inviteId}`,
          body.phone?.trim() || "",
          JSON.stringify(assignedSites),
          body.role,
          now,
          now,
          context.id,
        ),
      context
        .db!.prepare(
          "INSERT INTO audit_logs (id,occurred_at,actor_id,actor_email,actor_role,action,from_revision,to_revision,summary) VALUES (?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          now,
          context.id,
          context.email,
          "Developer",
          "USER ADDED",
          0,
          0,
          JSON.stringify({ email, role: body.role, sites: assignedSites }),
        ),
    ]);
  } catch {
    return Response.json(
      { error: "Email or employee ID already exists" },
      { status: 409 },
    );
  }
  return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
  const context = await adminContext();
  if (context.error) return context.error;
  const body = (await request.json().catch(() => null)) as {
    userId?: string;
    name?: string;
    role?: Role;
    active?: boolean;
    sites?: string[];
    employeeId?: string;
    phone?: string;
  } | null;
  const roles: Role[] = ["Admin", "Developer", "Stock Controller", "Stockkeeper", "Site Team", "QS", "PM", "Management"];
  const displayName = body?.name?.trim(),
    allowedSites = await activeSiteCodes(context.db!),
    assignedSites = Array.from(new Set(body?.sites ?? []));
  if (
    !body?.userId ||
    !displayName ||
    displayName.length > 120 ||
    !body.role ||
    !roles.includes(body.role) ||
    typeof body.active !== "boolean" ||
    assignedSites.some((site) => !allowedSites.includes(site))
  )
    return Response.json(
      { error: "Enter a valid staff display name and access assignment" },
      { status: 400 },
    );
  if (body.userId === context.id && (!body.active || body.role !== "Developer"))
    return Response.json(
      { error: "You cannot remove your own Developer access" },
      { status: 400 },
    );
  const now = new Date().toISOString();
  const before = await context
    .db!.prepare(
      "SELECT COALESCE(NULLIF(TRIM(display_name),''),name) AS name,role,active FROM users WHERE user_id=?",
    )
    .bind(body.userId)
    .first<{ name: string; role: Role; active: number }>();
  const [result] = await context.db!.batch([
    context
      .db!.prepare(
        "UPDATE users SET display_name=?,role=?,active=?,updated_at=? WHERE user_id=?",
      )
      .bind(displayName, body.role, body.active ? 1 : 0, now, body.userId),
    context
      .db!.prepare("UPDATE registration_profiles SET employee_id=?,phone=?,site=? WHERE user_id=?")
      .bind(body.employeeId?.trim().toUpperCase() || `UNASSIGNED:${body.userId}`, body.phone?.trim() || "", JSON.stringify(assignedSites), body.userId),
  ]);
  if ((result.meta.changes ?? 0) !== 1)
    return Response.json({ error: "User not found" }, { status: 404 });
  if (body.active)
    await context
      .db!.prepare(
        "UPDATE registration_profiles SET approved_at=COALESCE(approved_at,?),approved_by=COALESCE(approved_by,?) WHERE user_id=?",
      )
      .bind(now, context.id, body.userId)
      .run();
  await context
    .db!.prepare(
      "INSERT INTO audit_logs (id,occurred_at,actor_id,actor_email,actor_role,action,from_revision,to_revision,summary) VALUES (?,?,?,?,?,?,?,?,?)",
    )
    .bind(
      crypto.randomUUID(),
      now,
      context.id,
      context.email,
      "Developer",
      "USER ACCESS UPDATE",
      0,
      0,
      JSON.stringify({
        userId: body.userId,
        previousName: before?.name,
        newName: displayName,
        previousRole: before?.role,
        newRole: body.role,
        previousActive: Boolean(before?.active),
        newActive: body.active,
        sites: assignedSites,
      }),
    )
    .run();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const context = await adminContext();
  if (context.error) return context.error;
  const body = await request.json().catch(() => null) as { userId?: string } | null;
  if (!body?.userId) return Response.json({ error: "User is required" }, { status: 400 });
  if (body.userId === context.id) return Response.json({ error: "You cannot delete your own account" }, { status: 400 });
  const target = await context.db!.prepare("SELECT email,name,role FROM users WHERE user_id=?").bind(body.userId).first<{ email: string; name: string; role: Role }>();
  if (!target) return Response.json({ error: "User not found" }, { status: 404 });
  const now = new Date().toISOString();
  await context.db!.batch([
    context.db!.prepare("DELETE FROM auth_sessions WHERE user_id=?").bind(body.userId),
    context.db!.prepare("DELETE FROM auth_credentials WHERE user_id=?").bind(body.userId),
    context.db!.prepare("DELETE FROM registration_profiles WHERE user_id=?").bind(body.userId),
    context.db!.prepare("DELETE FROM users WHERE user_id=?").bind(body.userId),
    context.db!.prepare("INSERT INTO audit_logs (id,occurred_at,actor_id,actor_email,actor_role,action,from_revision,to_revision,summary) VALUES (?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),now,context.id,context.email,"Developer","USER DELETED",0,0,JSON.stringify({ userId: body.userId, email: target.email, name: target.name, role: target.role })),
  ]);
  return Response.json({ ok: true });
}
