import { env } from "cloudflare:workers";
import { requestIdentity } from "../../local-identity";

export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await requestIdentity();
  if (!identity)
    return Response.json({ error: "Authentication required" }, { status: 401 });
  if (!env.DB)
    return Response.json({ error: "Database unavailable" }, { status: 503 });
  const user = await env.DB.prepare(
    "SELECT role,active FROM users WHERE user_id=?",
  )
    .bind(identity.id)
    .first<{ role: string; active: number }>();
  if (!user?.active || !["Developer", "Admin", "MD", "PD", "FM", "PM", "QSM"].includes(user.role))
    return Response.json(
      { error: "Audit permission required" },
      { status: 403 },
    );
  const logs = await env.DB.prepare(
    "SELECT id,occurred_at AS occurredAt,actor_email AS actorEmail,actor_role AS actorRole,action,from_revision AS fromRevision,to_revision AS toRevision,summary FROM audit_logs ORDER BY occurred_at DESC LIMIT 2000",
  ).all();
  return Response.json(
    { logs: logs.results },
    { headers: { "Cache-Control": "no-store" } },
  );
}
