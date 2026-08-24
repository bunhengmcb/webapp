import { env } from "cloudflare:workers";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type Role = "Admin" | "Storekeeper" | "QS" | "Management";
type Identity = { id: string; email: string; name: string };
type StatePayload = {
  items: Array<{ code: string; name: string; unit: string; min: number; status?: string }>;
  stock: Record<string, Record<string, number>>;
  transactions: Array<{ id: string; type: string; qty: number }>;
  equipment: Array<{ id: string; qty: number; status: string }>;
  bom: Array<{ id: string; approvedQty: number }>;
};

const sites = ["VLS", "SSP", "FPF", "WH"];
const seed: StatePayload = {
  items: [
    { code:"MA-AG-001",name:"River Sand #1",khmer:"ខ្សាច់ទន្លេ លេខ1",unit:"m³",type:"Material",category:"Aggregate",min:8,status:"Active" },
    { code:"MA-AG-003",name:"Stream Sand #1",khmer:"ខ្សាច់ស្ទឹង លេខ1",unit:"m³",type:"Material",category:"Aggregate",min:6,status:"Active" },
    { code:"MA-CE-001",name:"Portland Cement",khmer:"ស៊ីម៉ងត៍ផតឡែន",unit:"Bag",type:"Material",category:"Cement",min:50,status:"Active" },
    { code:"MA-RB-012",name:"Rebar SD390 DB12",khmer:"ដែកសរសៃ DB12",unit:"Ton",type:"Material",category:"Reinforcement",min:2,status:"Active" },
    { code:"MA-BR-001",name:"Hollow Brick",khmer:"ឥដ្ឋប្រហោង",unit:"PCS",type:"Material",category:"Brick",min:500,status:"Active" },
    { code:"ST-PT-004",name:"Electric Drill",khmer:"ម៉ូទ័រស្វាន",unit:"PCS",type:"Small Tools",category:"Power Tool",min:2,status:"Active" },
    { code:"EQ-EQ-002",name:"Air Compressor (Small)",khmer:"ម៉ាស៊ីនខ្យល់ តូច",unit:"PCS",type:"Equipment",category:"Equipment",min:1,status:"Active" },
  ] as StatePayload["items"],
  stock: {
    VLS:{"MA-AG-001":20,"MA-AG-003":0,"MA-CE-001":120,"MA-RB-012":3.5,"MA-BR-001":800,"ST-PT-004":4,"EQ-EQ-002":1},
    SSP:{"MA-AG-001":5,"MA-AG-003":5,"MA-CE-001":42,"MA-RB-012":1.2,"MA-BR-001":350,"ST-PT-004":2,"EQ-EQ-002":1},
    FPF:{"MA-AG-001":12,"MA-AG-003":0,"MA-CE-001":75,"MA-RB-012":2.4,"MA-BR-001":1000,"ST-PT-004":3,"EQ-EQ-002":0},
    WH:{"MA-AG-001":0,"MA-AG-003":0,"MA-CE-001":200,"MA-RB-012":5,"MA-BR-001":0,"ST-PT-004":6,"EQ-EQ-002":2},
  },
  transactions:[],
  equipment:[],
  bom:[
    {id:"bom-1",site:"VLS",costCode:"A02-04",code:"MA-AG-001",originalQty:20,approvedQty:15,rate:15,approvedBy:"QS Manager"},
    {id:"bom-2",site:"VLS",costCode:"A06-06",code:"MA-AG-001",originalQty:5,approvedQty:5,rate:15,approvedBy:"QS Manager"},
  ] as StatePayload["bom"],
};

function database(): D1Database {
  if (!env.DB) throw new Error("Database binding is unavailable");
  return env.DB;
}

async function identity(): Promise<Identity | null> {
  const h = await headers();
  const id = h.get("oai-authenticated-user-id");
  const email = h.get("oai-authenticated-user-email");
  if (!id || !email) return null;
  const encoded = h.get("oai-authenticated-user-full-name");
  let name = email;
  if (encoded && h.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
    try { name = decodeURIComponent(encoded); } catch {}
  }
  return { id, email: email.toLowerCase(), name };
}

async function initialize(db: D1Database) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1), revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0), payload TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS users (user_id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('Admin','Storekeeper','QS','Management')), active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY NOT NULL, occurred_at TEXT NOT NULL, actor_id TEXT NOT NULL, actor_email TEXT NOT NULL, actor_role TEXT NOT NULL, action TEXT NOT NULL, from_revision INTEGER NOT NULL, to_revision INTEGER NOT NULL, summary TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred_at ON audit_logs(occurred_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id)"),
    db.prepare("CREATE TABLE IF NOT EXISTS login_history (session_id TEXT PRIMARY KEY NOT NULL,user_id TEXT NOT NULL,email TEXT NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL,login_at TEXT NOT NULL,user_agent TEXT NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_login_history_login_at ON login_history(login_at)"),
  ]);
}

async function userFor(db: D1Database, who: Identity) {
  const existing = await db.prepare("SELECT user_id, email, name, role, active FROM users WHERE user_id = ?").bind(who.id).first<{user_id:string;email:string;name:string;role:Role;active:number}>();
  if (existing) {
    if (!existing.active) return null;
    if (existing.email !== who.email || existing.name !== who.name) await db.prepare("UPDATE users SET email=?, name=?, updated_at=? WHERE user_id=?").bind(who.email,who.name,new Date().toISOString(),who.id).run();
    return { username: who.email, email: who.email, name: who.name, role: existing.role };
  }
  const invited = await db.prepare("SELECT user_id,email,name,role,active FROM users WHERE email=? AND user_id LIKE 'invite:%'").bind(who.email).first<{user_id:string;email:string;name:string;role:Role;active:number}>();
  if(invited?.active){
    await db.batch([
      db.prepare("UPDATE users SET user_id=?,updated_at=? WHERE user_id=?").bind(who.id,new Date().toISOString(),invited.user_id),
      db.prepare("UPDATE registration_profiles SET user_id=? WHERE user_id=?").bind(who.id,invited.user_id),
    ]);
    return {username:who.email,email:who.email,name:invited.name,role:invited.role};
  }
  return null;
}

function validState(value: unknown): value is StatePayload {
  if (!value || typeof value !== "object") return false;
  const x = value as StatePayload;
  if (!Array.isArray(x.items)||!Array.isArray(x.transactions)||!Array.isArray(x.equipment)||!Array.isArray(x.bom)||!x.stock) return false;
  const codes = new Set<string>();
  for (const item of x.items) {
    if (!item || typeof item.code!=="string" || !item.code.trim() || codes.has(item.code) || typeof item.name!=="string" || !item.name.trim() || typeof item.unit!=="string" || !Number.isFinite(item.min) || item.min<0) return false;
    codes.add(item.code);
  }
  for (const site of sites) {
    if (!x.stock[site] || Object.values(x.stock[site]).some(q=>!Number.isFinite(q)||q<0)) return false;
    if (Object.keys(x.stock[site]).some(code=>!codes.has(code))) return false;
  }
  if (x.transactions.some(t=>!t?.id||!t.type||!Number.isFinite(t.qty))) return false;
  if (x.equipment.some(e=>!e?.id||!Number.isInteger(e.qty)||e.qty<0||!e.status)) return false;
  if (x.bom.some(b=>!b?.id||!Number.isFinite(b.approvedQty)||b.approvedQty<0)) return false;
  return true;
}

function changed(a: unknown, b: unknown) { return JSON.stringify(a) !== JSON.stringify(b); }

function authorize(role: Role, previous: StatePayload, next: StatePayload) {
  if (role === "Admin") return true;
  if (role === "Management") return false;
  if (role === "QS") return !changed(previous.stock,next.stock) && !changed(previous.transactions,next.transactions) && !changed(previous.equipment,next.equipment);
  return !changed(previous.items,next.items) && !changed(previous.bom,next.bom);
}

function actionName(previous: StatePayload, next: StatePayload) {
  if (next.transactions.length > previous.transactions.length) return next.transactions[0]?.type || "TRANSACTION";
  if (changed(previous.items,next.items)) return "ITEM MASTER UPDATE";
  if (changed(previous.bom,next.bom)) return "BOM UPDATE";
  if (changed(previous.equipment,next.equipment)) return "EQUIPMENT UPDATE";
  if (changed(previous.stock,next.stock)) return "STOCK UPDATE";
  return "STATE SYNC";
}

export async function GET() {
  const who = await identity();
  if (!who) return Response.json({error:"Authentication required"},{status:401});
  const db = database();
  await initialize(db);
  const user = await userFor(db,who);
  if (!user) {
    const existing = await db.prepare("SELECT active FROM users WHERE user_id=?").bind(who.id).first<{active:number}>();
    if (existing) return Response.json({error:"Registration is waiting for administrator approval",pendingApproval:true,identity:{email:who.email,name:who.name}},{status:403});
    const count = await db.prepare("SELECT COUNT(*) AS total FROM users").first<{total:number}>();
    return Response.json({registrationRequired:true,firstAccount:Number(count?.total??0)===0,identity:{email:who.email,name:who.name}},{status:428});
  }
  const requestHeaders=await headers(),sessionId=requestHeaders.get("x-mcb-session-id");
  if(sessionId&&/^[a-zA-Z0-9-]{10,100}$/.test(sessionId))await db.prepare("INSERT OR IGNORE INTO login_history (session_id,user_id,email,name,role,login_at,user_agent) VALUES (?,?,?,?,?,?,?)").bind(sessionId,who.id,who.email,user.name,user.role,new Date().toISOString(),requestHeaders.get("user-agent")||"Unknown").run();
  let row = await db.prepare("SELECT revision,payload,updated_at FROM app_state WHERE id=1").first<{revision:number;payload:string;updated_at:string}>();
  if (!row) {
    const now = new Date().toISOString();
    await db.prepare("INSERT OR IGNORE INTO app_state (id,revision,payload,updated_at,updated_by) VALUES (1,1,?,?,?)").bind(JSON.stringify(seed),now,who.id).run();
    row = await db.prepare("SELECT revision,payload,updated_at FROM app_state WHERE id=1").first<{revision:number;payload:string;updated_at:string}>();
  }
  return Response.json({ user, revision:row!.revision, state:JSON.parse(row!.payload), updatedAt:row!.updated_at },{headers:{"Cache-Control":"no-store"}});
}

export async function PUT(request: Request) {
  const who = await identity();
  if (!who) return Response.json({error:"Authentication required"},{status:401});
  const db = database();
  await initialize(db);
  const user = await userFor(db,who);
  if (!user) return Response.json({error:"Account disabled"},{status:403});
  const body = await request.json().catch(()=>null) as {revision?:number;state?:unknown}|null;
  if (!body || !Number.isInteger(body.revision) || !validState(body.state)) return Response.json({error:"Invalid inventory data"},{status:400});
  const current = await db.prepare("SELECT revision,payload FROM app_state WHERE id=1").first<{revision:number;payload:string}>();
  if (!current) return Response.json({error:"Inventory state is unavailable"},{status:503});
  if (current.revision !== body.revision) return Response.json({error:"Data changed by another user. Reloading the latest records.",revision:current.revision,state:JSON.parse(current.payload)},{status:409});
  const previous = JSON.parse(current.payload) as StatePayload;
  const next = body.state;
  if (!authorize(user.role,previous,next)) return Response.json({error:"Your role is not allowed to make this change"},{status:403});
  if (!changed(previous,next)) return Response.json({revision:current.revision});
  const nextRevision = current.revision + 1;
  const now = new Date().toISOString();
  const action = actionName(previous,next);
  const summary = JSON.stringify({items:next.items.length,transactions:next.transactions.length,equipment:next.equipment.length,bom:next.bom.length});
  const result = await db.batch([
    db.prepare("UPDATE app_state SET revision=?,payload=?,updated_at=?,updated_by=? WHERE id=1 AND revision=?").bind(nextRevision,JSON.stringify(next),now,who.id,current.revision),
    db.prepare("INSERT INTO audit_logs (id,occurred_at,actor_id,actor_email,actor_role,action,from_revision,to_revision,summary) VALUES (?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),now,who.id,who.email,user.role,action,current.revision,nextRevision,summary),
  ]);
  if (!result[0].success || (result[0].meta.changes??0)!==1) return Response.json({error:"Concurrent update detected. Reload and try again."},{status:409});
  return Response.json({revision:nextRevision,updatedAt:now});
}

export async function DELETE(request:Request){
  const who=await identity();
  if(!who)return Response.json({error:"Authentication required"},{status:401});
  const db=database();await initialize(db);
  const user=await userFor(db,who);
  if(!user||user.role!=="Admin")return Response.json({error:"Administrator permission required"},{status:403});
  const body=await request.json().catch(()=>null) as {confirmation?:string}|null;
  if(body?.confirmation!=="RESET")return Response.json({error:"Type RESET to confirm"},{status:400});
  const current=await db.prepare("SELECT revision FROM app_state WHERE id=1").first<{revision:number}>();
  const fromRevision=current?.revision??0,toRevision=fromRevision+1,now=new Date().toISOString();
  await db.batch([
    db.prepare("INSERT INTO app_state (id,revision,payload,updated_at,updated_by) VALUES (1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload,updated_at=excluded.updated_at,updated_by=excluded.updated_by").bind(toRevision,JSON.stringify(seed),now,who.id),
    db.prepare("INSERT INTO audit_logs (id,occurred_at,actor_id,actor_email,actor_role,action,from_revision,to_revision,summary) VALUES (?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),now,who.id,who.email,user.role,"DEMO DATA RESET",fromRevision,toRevision,JSON.stringify({preserved:["users","roles","registrations","login_history","audit_logs"]})),
  ]);
  return Response.json({ok:true,revision:toRevision});
}
