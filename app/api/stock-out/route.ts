import { env } from "cloudflare:workers";
import { requestIdentity } from "../../local-identity";

export const dynamic = "force-dynamic";

type Role = "Developer" | "Admin" | "MD" | "PD" | "FM" | "PM" | "TMS" | "SRA" | "TMMEP" | "QSM" | "Site Engineer" | "Stock Controller" | "Stockkeeper" | "QS";

type StockOutContext = { error: Response } | { db: D1Database; id: string; email: string; role: Role; siteAccess: string[] };

async function contextFor(req: Request): Promise<StockOutContext> {
  const identity = await requestIdentity();
  if (!identity) return { error: Response.json({ error: "Authentication required" }, { status: 401 }) };
  if (!env.DB) return { error: Response.json({ error: "Database unavailable" }, { status: 503 }) };
  const user = await env.DB.prepare("SELECT u.user_id,u.email,u.role,u.active,p.site FROM users u LEFT JOIN registration_profiles p ON p.user_id=u.user_id WHERE u.user_id=?").bind(identity.id).first<{ user_id: string; email: string; role: Role; active: number; site: string | null }>();
  if (!user || !user.active) return { error: Response.json({ error: "Account not active" }, { status: 403 }) };
  let siteAccess: string[] = [];
  if (user.role === 'Developer') siteAccess = ['*'];
  else if (user.site) {
    try {
      const parsed = JSON.parse(user.site);
      siteAccess = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch { siteAccess = user.site === 'ALL SITES' ? ['*'] : [user.site]; }
  }
  return { db: env.DB, id: identity.id, email: identity.email, role: user.role, siteAccess };
}

function canUseSite(ctx: Exclude<StockOutContext, { error: Response }>, site: string) {
  return ctx.role === 'Developer' || ctx.siteAccess.includes('*') || ctx.siteAccess.includes(site);
}
async function siteIsOperational(db: D1Database, site: string) {
  const row = await db
    .prepare("SELECT payload FROM app_state WHERE id=1")
    .first<{ payload: string }>();

  if (!row?.payload) return true;

  try {
    const state = JSON.parse(row.payload) as {
      sites?: Array<{ code?: string; status?: string }>;
    };

    const record = (state.sites || []).find(
      (entry) => entry.code === site
    );

    return !record || record.status !== "Not Active";
  } catch {
    return true;
  }
}
function uid() {
  return crypto.randomUUID();
}

// Ensure table exists (for staging/demo). Real deployment should use migrations.
async function ensureTable(db: D1Database) {
  const cols = await db
    .prepare("PRAGMA table_info('stock_out_requests')")
    .all();

  if (!cols.results || !cols.results.length) {
    await db
      .prepare(`
        CREATE TABLE IF NOT EXISTS stock_out_requests (
          id TEXT PRIMARY KEY,
          site TEXT,
          created_at TEXT,
          created_by TEXT,
          created_by_email TEXT,
          status TEXT,
          submitted_at TEXT,
          verified_at TEXT,
          verified_by TEXT,
          posted_at TEXT,
          posted_by TEXT,
          reference TEXT,
          payload TEXT
        )
      `)
      .run();
  }
}

export async function POST(request: Request) {
  const ctx = await contextFor(request);
  if ('error' in ctx) return ctx.error;
  const db = ctx.db;
  await ensureTable(db);
  type StockOutRow = { code: string; qty: number | string; costCode?: string; issuedTo?: string; remark?: string };
  type StockOutBody = { site?: string; rows?: StockOutRow[]; transactionDate?: string; sheetRef?: string; draft?: boolean } | null;
  const body = (await request.json().catch(() => null)) as StockOutBody;
  if (!body || !body.site || !Array.isArray(body.rows) || !body.transactionDate) return Response.json({ error: 'Invalid payload' }, { status: 400 });
  if (ctx.role !== 'Stockkeeper' && ctx.role !== 'Developer') return Response.json({ error: 'Stockkeeper maker role required' }, { status: 403 });
  if (!canUseSite(ctx, body.site))
  return Response.json(
    { error: "Site access denied" },
    { status: 403 }
  );

if (!(await siteIsOperational(db, body.site))) {
  return Response.json(
    {
      error:
        "Project/site is Not Active. New Stock Out requests are blocked.",
    },
    { status: 409 },
  );
}

// existing POST code continues here
  const submittedRows = ctx.role === 'Stockkeeper' ? body.rows.map((line) => ({ ...line, costCode: '' })) : body.rows;
  const now = new Date().toISOString();
  const id = `SOREQ-${now.replace(/[^0-9]/g,'')}-${uid().slice(0,6)}`;
  const payload = JSON.stringify({ rows: submittedRows, sheetRef: body.sheetRef || '', transactionDate: body.transactionDate });
  const status = body.draft ? 'Draft' : 'Pending Verification';
  await db.prepare("INSERT INTO stock_out_requests (id,site,created_at,created_by,created_by_email,status,submitted_at,reference,payload) VALUES (?,?,?,?,?,?,?,?,?)").bind(id, body.site, now, ctx.id, ctx.email, status, status === 'Pending Verification' ? now : null, body.sheetRef || '', payload).run();
  await db.prepare("INSERT INTO audit_logs (id,occurred_at,actor_id,actor_email,actor_role,action,from_revision,to_revision,summary) VALUES (?,?,?,?,?,?,?,?,?)").bind(uid(), now, ctx.id, ctx.email, ctx.role, 'STOCK OUT REQUEST CREATED', 0, 0, JSON.stringify({ requestId: id, status })).run();
  return Response.json({ ok: true, requestId: id, status });
}

export async function GET(request: Request) {
  const ctx = await contextFor(request);
  if ('error' in ctx) return ctx.error;
  const db = ctx.db;
  await ensureTable(db);
  if (!['Developer','Stock Controller','Stockkeeper'].includes(ctx.role)) return Response.json({ error: 'Stock Out access denied' }, { status: 403 });
  const rows = await db.prepare("SELECT id,site,created_at,created_by,created_by_email,status,submitted_at,verified_at,verified_by,posted_at,posted_by,reference,payload FROM stock_out_requests ORDER BY submitted_at DESC LIMIT 200").all<{ site: string; created_by: string }>();
  const visible = (rows.results || []).filter((record) => canUseSite(ctx, record.site) && (ctx.role !== 'Stockkeeper' || record.created_by === ctx.id));
  return Response.json({ requests: visible }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  // Supports actions: verify and post
  const ctx = await contextFor(request);
  if ('error' in ctx) return ctx.error;
  const db = ctx.db;
  await ensureTable(db);
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const action = url.searchParams.get('action');
  if (!id || !action) return Response.json({ error: 'Missing id or action' }, { status: 400 });
  const row = await db.prepare("SELECT id,site,created_by,status,payload,reference FROM stock_out_requests WHERE id=?").bind(id).first<{ id: string; site: string; created_by: string; status: string; payload: string; reference: string | null }>();
  if (!row) return Response.json({ error: 'Request not found' }, { status: 404 });
  if (!canUseSite(ctx, row.site)) return Response.json({ error: 'Site access denied' }, { status: 403 });
  if (
  (action === 'verify' || action === 'post') &&
  !(await siteIsOperational(db, row.site))
) {
  return Response.json(
    { error: 'Project/site is Not Active. Stock Out processing is blocked.' },
    { status: 409 },
  );
}
  const now = new Date().toISOString();
  if (action === 'verify') {
    if (ctx.role !== 'Stock Controller' && ctx.role !== 'Developer') return Response.json({ error: 'Verifier role required' }, { status: 403 });
    if (row.created_by === ctx.id && ctx.role !== 'Developer') return Response.json({ error: 'Maker cannot verify own request' }, { status: 403 });
    if (row.status !== 'Pending Verification') return Response.json({ error: 'Request not pending verification' }, { status: 409 });
    // Allow verifier to submit updated payload (e.g., assign cost codes)
    const body = (await request.json().catch(() => null)) as { rows?: Array<{ code?: string; qty?: number | string; costCode?: string }>; sheetRef?: string; transactionDate?: string } | null;
    let updatedPayload = row.payload;
    if (body && body.rows && Array.isArray(body.rows)) {
      updatedPayload = JSON.stringify({ rows: body.rows, sheetRef: body.sheetRef || '', transactionDate: body.transactionDate || JSON.parse(row.payload).transactionDate });
    }
    // Ensure all rows have costCode before verifying
    try {
      const parsed = JSON.parse(updatedPayload) as { rows?: Array<{ costCode?: string }> };
      const missing = (parsed.rows || []).some((r) => !(r.costCode && String(r.costCode).trim()));
      if (missing) return Response.json({ error: 'All rows must have a QS cost code assigned before verification' }, { status: 400 });
    } catch {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }
    await db.prepare("UPDATE stock_out_requests SET payload=?,status=?,verified_at=?,verified_by=? WHERE id=?").bind(updatedPayload, 'Verified', now, ctx.id, id).run();
    await db.prepare("INSERT INTO audit_logs (id,occurred_at,actor_id,actor_email,actor_role,action,from_revision,to_revision,summary) VALUES (?,?,?,?,?,?,?,?,?)").bind(uid(), now, ctx.id, ctx.email, ctx.role, 'STOCK OUT REQUEST VERIFIED', 0, 0, JSON.stringify({ requestId: id })).run();
    return Response.json({ ok: true });
  }
  if (action === 'post') {
    if (ctx.role !== 'Stock Controller' && ctx.role !== 'Developer') return Response.json({ error: 'Poster role required' }, { status: 403 });
    // Only allow posting from Verified state, use conditional update to ensure idempotency
    const fresh = await db.prepare("SELECT status,payload,site FROM stock_out_requests WHERE id=?").bind(id).first<{ status: string; payload: string; site: string }>();
    if (!fresh || fresh.status !== 'Verified') return Response.json({ error: 'Request not Verified' }, { status: 409 });
    // Load app_state
    const stateRow = await db.prepare("SELECT payload FROM app_state WHERE id=1").first<{ payload: string }>();
    const state = JSON.parse(stateRow?.payload || '{}') as { stock?: Record<string, Record<string, number>>; transactions?: Array<{ type?: string; site?: string; code?: string; qty?: number; costCode?: string }>; bom?: Array<{ site?: string; code?: string; costCode?: string; approvedQty?: number }>; };
    const payload = JSON.parse(fresh.payload) as { transactionDate?: string; sheetRef?: string; rows?: Array<{ code: string; qty: number | string; costCode?: string; issuedTo?: string; remark?: string }> };
    const rows = payload.rows || [];
    // Basic stock checks: ensure available >= requested and BOM checks
    for (const line of rows as Array<{ code?: string; qty?: number | string; costCode?: string }>) {
      const code = line.code as string;
      const qty = Number(line.qty) || 0;
      const onHand = (state.stock?.[fresh.site]?.[code]) ?? 0;
      const reserved = (state.transactions || []).filter((t) => t.type === 'SITE TRANSFER' && t.site === fresh.site && t.code === code).reduce((s, t) => s + Math.abs(Math.min(0, t.qty ?? 0)), 0);
      const available = Math.max(0, onHand - reserved);
      if (Math.abs(qty) > available) return Response.json({ error: `Insufficient available stock for ${code}` }, { status: 409 });
      // BOM check
      const bline = (state.bom || []).find((b) => b.site === fresh.site && b.code === code && b.costCode === (line.costCode || '').trim().toUpperCase());
      if (bline) {
        const used = (state.transactions || []).filter((t) => t.type === 'STOCK OUT' && t.site === fresh.site && t.code === code && t.costCode === bline.costCode).reduce((s, t) => s + Math.abs(Math.min(0, t.qty ?? 0)), 0);
        if (used + Math.abs(qty) > (bline.approvedQty ?? 0)) return Response.json({ error: `BOM limit exceeded for ${code} / ${bline.costCode}` }, { status: 409 });
      }
    }
    // Attempt conditional update to prevent duplicate posts
    const upd = await db.prepare("UPDATE stock_out_requests SET status=?,posted_at=?,posted_by=? WHERE id=? AND status='Verified'").bind('Posted', now, ctx.id, id).run();
    const updMeta = (upd as unknown as { meta?: { changes?: number } }).meta?.changes ?? 0;
    if (updMeta !== 1) return Response.json({ error: 'Request not Verified or already posted' }, { status: 409 });
    // Build transactions and update stock
    const txs: Array<{ id: string; date: string; timestamp: string; type: string; site?: string; other?: string; code?: string; qty: number; by: string; status: string; costCode?: string; reference?: string; person?: string; reason?: string }> = [];
    const nowTs = now;
    for (const line of rows) {
      const tx = {
        id: uid(), date: payload.transactionDate || nowTs.split('T')[0], timestamp: nowTs, type: 'STOCK OUT', site: fresh.site, other: '', code: line.code, qty: -Math.abs(Number(line.qty) || 0), by: ctx.id, status: 'Posted', costCode: (line.costCode || '').trim().toUpperCase(), reference: payload.sheetRef ? `${payload.sheetRef} · ${id}` : id, person: line.issuedTo || '', reason: line.remark || ''
      };
      txs.push(tx);
      state.stock = state.stock || {};
      state.stock[fresh.site] = state.stock[fresh.site] || {};
      state.stock[fresh.site][line.code] = (state.stock[fresh.site][line.code] || 0) + tx.qty;
    }
    state.transactions = [...txs, ...(state.transactions || [])];
    // Persist updated state and audit log
    await db.batch([
      db.prepare("UPDATE app_state SET payload=?,revision=COALESCE(revision,0)+1 WHERE id=1").bind(JSON.stringify(state)),
      db.prepare("INSERT INTO audit_logs (id,occurred_at,actor_id,actor_email,actor_role,action,from_revision,to_revision,summary) VALUES (?,?,?,?,?,?,?,?,?)").bind(uid(), now, ctx.id, ctx.email, ctx.role, 'STOCK OUT REQUEST POSTED', 0, 0, JSON.stringify({ requestId: id, txCount: txs.length })),
    ]);
    return Response.json({ ok: true, posted: true, txCount: txs.length });
  }
  if (action === 'return' || action === 'reject') {
    if (ctx.role !== 'Stock Controller' && ctx.role !== 'Developer') return Response.json({ error: 'Verifier role required' }, { status: 403 });
    const fresh2 = await db.prepare("SELECT status FROM stock_out_requests WHERE id=?").bind(id).first();
    if (!fresh2) return Response.json({ error: 'Request not found' }, { status: 404 });
    if (fresh2.status !== 'Pending Verification' && fresh2.status !== 'Verified') return Response.json({ error: 'Request cannot be returned/rejected in current state' }, { status: 409 });
    const newStatus = action === 'return' ? 'Returned' : 'Rejected';
    await db.prepare("UPDATE stock_out_requests SET status=? WHERE id=?").bind(newStatus, id).run();
    await db.prepare("INSERT INTO audit_logs (id,occurred_at,actor_id,actor_email,actor_role,action,from_revision,to_revision,summary) VALUES (?,?,?,?,?,?,?,?,?)").bind(uid(), now, ctx.id, ctx.email, ctx.role, `STOCK OUT REQUEST ${newStatus.toUpperCase()}`, 0, 0, JSON.stringify({ requestId: id })).run();
    return Response.json({ ok: true, status: newStatus });
  }
  return Response.json({ error: 'Unknown action' }, { status: 400 });
}
