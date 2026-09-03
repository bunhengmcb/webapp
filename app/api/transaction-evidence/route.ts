import { env } from "cloudflare:workers";
import { requestIdentity } from "../../local-identity";

export const dynamic = "force-dynamic";

const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{5,99}$/;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const keyFor = (id: string) => `transaction-evidence/${id}`;

type EvidenceUser = { bucket: R2Bucket; userId: string; role: string; siteAccess: string[] };
type TransactionShape = { id: string; site?: string; other?: string };

function assignedSites(value: string | null | undefined) {
  if (!value?.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((site): site is string => typeof site === "string") : [];
  } catch {
    return value === "ALL SITES" ? ["VLS", "SSP", "FPF", "WH"] : [value];
  }
}

async function userContext(): Promise<{ user?: EvidenceUser; error?: Response }> {
  const identity = await requestIdentity();
  if (!identity) return { error: Response.json({ error: "Authentication required" }, { status: 401 }) };
  if (!env.DB || !env.BUCKET) return { error: Response.json({ error: "Evidence storage unavailable" }, { status: 503 }) };
  const row = await env.DB.prepare("SELECT u.role,u.active,p.site FROM users u LEFT JOIN registration_profiles p ON p.user_id=u.user_id WHERE u.user_id=?")
    .bind(identity.id).first<{ role: string; active: number; site: string | null }>();
  if (!row?.active) return { error: Response.json({ error: "Account disabled" }, { status: 403 }) };
  return { user: { bucket: env.BUCKET, userId: identity.id, role: row.role, siteAccess: assignedSites(row.site) } };
}

function transactionId(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() || "";
  return idPattern.test(id) ? id : null;
}

function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

async function authorizedTransaction(user: EvidenceUser, id: string) {
  const row = await env.DB.prepare("SELECT payload FROM app_state WHERE id=1").first<{ payload: string }>();
  if (!row?.payload) return null;
  let state: { transactions?: TransactionShape[] };
  try { state = JSON.parse(row.payload); } catch { return null; }
  const transaction = state.transactions?.find((candidate) => candidate.id === id);
  if (!transaction) return null;
  if (user.role === "Developer") return transaction;
  const allowed = new Set(user.siteAccess);
  return (transaction.site && allowed.has(transaction.site)) || (transaction.other && allowed.has(transaction.other)) ? transaction : null;
}

function fileSignatureMatches(contentType: string, bytes: Uint8Array) {
  if (contentType === "application/pdf")
    return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  if (contentType === "image/png")
    return bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value, index) => bytes[index] === value);
  if (contentType === "image/jpeg")
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/webp")
    return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  return false;
}

export async function GET(request: Request) {
  const context = await userContext();
  if (context.error) return context.error;
  const id = transactionId(request);
  if (!id) return Response.json({ error: "Invalid transaction ID" }, { status: 400 });
  if (!(await authorizedTransaction(context.user!, id)))
    return Response.json({ error: "Evidence is not available for this site" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const object = await context.user!.bucket.get(keyFor(id));
  if (!object) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(object.body, { headers: { "Content-Type": object.httpMetadata?.contentType || "application/octet-stream", "Content-Disposition": `inline; filename="${(object.customMetadata?.filename || "evidence").replace(/["\r\n]/g, "")}"`, "Cache-Control": "private, max-age=300", ETag: object.httpEtag } });
}

export async function PUT(request: Request) {
  const context = await userContext();
  if (context.error) return context.error;
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  const id = transactionId(request), contentType = request.headers.get("content-type") || "", filename = (request.headers.get("x-file-name") || "evidence").slice(0, 160).replace(/[\r\n]/g, "");
  if (!id) return Response.json({ error: "Invalid transaction ID" }, { status: 400 });
  if (!allowedTypes.has(contentType)) return Response.json({ error: "Upload a JPG, PNG, WebP or PDF document" }, { status: 400 });
  const transaction = await authorizedTransaction(context.user!, id);
  const requestedSite = (request.headers.get("x-mcb-site") || "").trim().toUpperCase();
  const siteAuthorized = context.user!.role === "Developer"
    ? Boolean(requestedSite)
    : Boolean(requestedSite && context.user!.siteAccess.includes(requestedSite));
  if (!transaction && !siteAuthorized)
    return Response.json({ error: "Evidence cannot be attached outside your assigned site" }, { status: 403 });
  const existing = await context.user!.bucket.head(keyFor(id));
  if (existing && !["Admin", "Developer"].includes(context.user!.role)) return Response.json({ error: "Only Admin or Developer can replace evidence" }, { status: 403 });
  const buffer = await request.arrayBuffer();
  if (!buffer.byteLength || buffer.byteLength > 10 * 1024 * 1024) return Response.json({ error: "Evidence must be 10 MB or smaller" }, { status: 400 });
  const bytes = new Uint8Array(buffer);
  if (!fileSignatureMatches(contentType, bytes)) return Response.json({ error: "The file content does not match its declared file type" }, { status: 400 });
  await context.user!.bucket.put(keyFor(id), buffer, { httpMetadata: { contentType, cacheControl: "private, max-age=300" }, customMetadata: { filename, uploadedBy: context.user!.userId, uploadedAt: new Date().toISOString(), site: requestedSite || transaction?.site || transaction?.other || "" } });
  return Response.json({ ok: true, filename, contentType });
}
