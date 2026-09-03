import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { hashSessionToken } from "../../../auth/password";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Invalid request origin" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const store = await cookies();
  const token = store.get("__Host-mcb_session")?.value;
  if (token && env.DB) {
    await env.DB.prepare("DELETE FROM auth_sessions WHERE token_hash=?").bind(await hashSessionToken(token)).run().catch(() => undefined);
  }
  return Response.json({ ok: true }, {
    headers: {
      "Set-Cookie": "__Host-mcb_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Priority=High",
      "Cache-Control": "no-store, private",
      "Pragma": "no-cache",
    },
  });
}
