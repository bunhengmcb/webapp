import { env } from "cloudflare:workers";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
type Role = "Admin" | "Storekeeper" | "QS" | "Management";

async function adminContext() {
  const h = await headers();
  const id = h.get("oai-authenticated-user-id");
  const email = h.get("oai-authenticated-user-email");
  if (!id || !email) return { error: Response.json({error:"Authentication required"},{status:401}) };
  if (!env.DB) return { error: Response.json({error:"Database unavailable"},{status:503}) };
  const actor = await env.DB.prepare("SELECT role,active FROM users WHERE user_id=?").bind(id).first<{role:Role;active:number}>();
  if (!actor?.active || actor.role !== "Admin") return { error: Response.json({error:"Administrator permission required"},{status:403}) };
  return { db:env.DB, id, email };
}

export async function GET() {
  const context = await adminContext();
  if (context.error) return context.error;
  const result = await context.db!.prepare("SELECT u.user_id AS userId,u.email,u.name,u.role,u.active,u.created_at AS createdAt,u.updated_at AS updatedAt,p.employee_id AS employeeId,p.phone,p.site,p.requested_role AS requestedRole,p.note FROM users u LEFT JOIN registration_profiles p ON p.user_id=u.user_id ORDER BY u.active DESC,u.name").all();
  const history=await context.db!.prepare("SELECT session_id AS sessionId,email,name,role,login_at AS loginAt,user_agent AS userAgent FROM login_history ORDER BY login_at DESC LIMIT 100").all();
  return Response.json({users:result.results,history:history.results},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:Request){
  const context=await adminContext();if(context.error)return context.error;
  const body=await request.json().catch(()=>null) as {email?:string;name?:string;employeeId?:string;phone?:string;site?:string;role?:Role}|null;
  const roles:Role[]=["Admin","Storekeeper","QS","Management"],sites=["VLS","SSP","FPF","WH","ALL SITES"],email=body?.email?.trim().toLowerCase();
  if(!email||!email.includes("@")||!body?.name?.trim()||!body.employeeId?.trim()||!body.phone?.trim()||!body.role||!roles.includes(body.role)||!body.site||!sites.includes(body.site))return Response.json({error:"Complete all required user fields"},{status:400});
  const now=new Date().toISOString(),inviteId=`invite:${email}`;
  try{await context.db!.batch([
    context.db!.prepare("INSERT INTO users (user_id,email,name,role,active,created_at,updated_at) VALUES (?,?,?,?,1,?,?)").bind(inviteId,email,body.name.trim(),body.role,now,now),
    context.db!.prepare("INSERT INTO registration_profiles (user_id,employee_id,phone,site,requested_role,note,submitted_at,approved_at,approved_by) VALUES (?,?,?,?,?,'Added by administrator',?,?,?)").bind(inviteId,body.employeeId.trim().toUpperCase(),body.phone.trim(),body.site,body.role,now,now,context.id),
    context.db!.prepare("INSERT INTO audit_logs (id,occurred_at,actor_id,actor_email,actor_role,action,from_revision,to_revision,summary) VALUES (?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),now,context.id,context.email,"Admin","USER ADDED",0,0,JSON.stringify({email,role:body.role,site:body.site})),
  ]);}catch{return Response.json({error:"Email or employee ID already exists"},{status:409})}
  return Response.json({ok:true});
}

export async function PATCH(request:Request) {
  const context = await adminContext();
  if (context.error) return context.error;
  const body = await request.json().catch(()=>null) as {userId?:string;role?:Role;active?:boolean}|null;
  const roles:Role[]=["Admin","Storekeeper","QS","Management"];
  if (!body?.userId || !body.role || !roles.includes(body.role) || typeof body.active!=="boolean") return Response.json({error:"Invalid access update"},{status:400});
  if (body.userId===context.id && (!body.active || body.role!=="Admin")) return Response.json({error:"You cannot remove your own administrator access"},{status:400});
  const now=new Date().toISOString();
  const result=await context.db!.prepare("UPDATE users SET role=?,active=?,updated_at=? WHERE user_id=?").bind(body.role,body.active?1:0,now,body.userId).run();
  if ((result.meta.changes??0)!==1) return Response.json({error:"User not found"},{status:404});
  if(body.active)await context.db!.prepare("UPDATE registration_profiles SET approved_at=COALESCE(approved_at,?),approved_by=COALESCE(approved_by,?) WHERE user_id=?").bind(now,context.id,body.userId).run();
  await context.db!.prepare("INSERT INTO audit_logs (id,occurred_at,actor_id,actor_email,actor_role,action,from_revision,to_revision,summary) VALUES (?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),now,context.id,context.email,"Admin","USER ACCESS UPDATE",0,0,JSON.stringify({userId:body.userId,role:body.role,active:body.active})).run();
  return Response.json({ok:true});
}
