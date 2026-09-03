import { env } from "cloudflare:workers";
import { requestIdentity } from "../../local-identity";

export const dynamic = "force-dynamic";

const codePattern = /^[A-Z0-9][A-Z0-9._-]{1,79}$/;
const keyFor = (code: string) => `item-photos/${code}.webp`;

async function userContext(requireAdmin = false) {
  const identity = await requestIdentity();
  if (!identity)
    return {
      error: Response.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    };
  if (!env.DB || !env.BUCKET)
    return {
      error: Response.json(
        { error: "Photo storage unavailable" },
        { status: 503 },
      ),
    };
  const user = await env.DB.prepare(
    "SELECT role,active FROM users WHERE user_id=?",
  )
    .bind(identity.id)
    .first<{ role: string; active: number }>();
  if (!user?.active)
    return {
      error: Response.json({ error: "Account disabled" }, { status: 403 }),
    };
  if (requireAdmin && !["Admin", "Developer"].includes(user.role))
    return {
      error: Response.json(
        { error: "Developer or Administrator permission required" },
        { status: 403 },
      ),
    };
  return { bucket: env.BUCKET, id: identity.id };
}

function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

function isWebP(bytes: Uint8Array) {
  return bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

function itemCode(request: Request) {
  const code =
    new URL(request.url).searchParams.get("code")?.trim().toUpperCase() || "";
  return codePattern.test(code) ? code : null;
}

export async function GET(request: Request) {
  const context = await userContext();
  if (context.error) return context.error;
  const code = itemCode(request);
  if (!code)
    return Response.json({ error: "Invalid item code" }, { status: 400 });
  const object = await context.bucket!.get(keyFor(code));
  if (!object)
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "image/webp",
      "Cache-Control": "private, max-age=300",
      ETag: object.httpEtag,
    },
  });
}

export async function PUT(request: Request) {
  const context = await userContext(true);
  if (context.error) return context.error;
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  const code = itemCode(request);
  if (!code)
    return Response.json({ error: "Invalid item code" }, { status: 400 });
  const contentType = request.headers.get("content-type") || "";
  const buffer = await request.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (
    contentType !== "image/webp" ||
    bytes.byteLength <= 0 ||
    bytes.byteLength > 5 * 1024 * 1024 ||
    !isWebP(bytes)
  )
    return Response.json(
      { error: "Upload an optimized WebP image up to 5 MB" },
      { status: 400 },
    );
  await context.bucket!.put(keyFor(code), buffer, {
    httpMetadata: {
      contentType: "image/webp",
      cacheControl: "private, max-age=300",
    },
    customMetadata: {
      itemCode: code,
      uploadedBy: context.id!,
      uploadedAt: new Date().toISOString(),
    },
  });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const context = await userContext(true);
  if (context.error) return context.error;
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  const code = itemCode(request);
  if (!code)
    return Response.json({ error: "Invalid item code" }, { status: 400 });
  await context.bucket!.delete(keyFor(code));
  return Response.json({ ok: true });
}
