import { env } from "cloudflare:workers";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
type Role = "Admin"|"Storekeeper"|"QS"|"Management";

export async function POST(request:Request){
  const h=await headers();
  const userId=h.get("oai-authenticated-user-id"),email=h.get("oai-authenticated-user-email")?.toLowerCase();
  if(!userId||!email)return Response.json({error:"Verify your identity before registering"},{status:401});
  if(!env.DB)return Response.json({error:"Database unavailable"},{status:503});
  const body=await request.json().catch(()=>null) as {name?:string;employeeId?:string;phone?:string;site?:string;requestedRole?:Role;note?:string}|null;
  const roles:Role[]=["Storekeeper","QS","Management"];
  const sites=["VLS","SSP","FPF","WH","ALL SITES"];
  if(!body?.name?.trim()||!body.employeeId?.trim()||!body.phone?.trim()||!body.requestedRole||!roles.includes(body.requestedRole)||!body.site||!sites.includes(body.site))return Response.json({error:"Complete all required registration fields"},{status:400});
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS users (user_id TEXT PRIMARY KEY NOT NULL,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,role TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS registration_profiles (user_id TEXT PRIMARY KEY NOT NULL,employee_id TEXT NOT NULL UNIQUE,phone TEXT NOT NULL,site TEXT NOT NULL,requested_role TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',submitted_at TEXT NOT NULL,approved_at TEXT,approved_by TEXT)"),
  ]);
  const existing=await env.DB.prepare("SELECT user_id FROM users WHERE user_id=? OR email=?").bind(userId,email).first();
  if(existing)return Response.json({error:"This identity is already registered"},{status:409});
  const count=await env.DB.prepare("SELECT COUNT(*) AS total FROM users").first<{total:number}>();
  const first=Number(count?.total??0)===0,role:Role=first?"Admin":body.requestedRole,active=first?1:0,now=new Date().toISOString();
  try{
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users (user_id,email,name,role,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?)").bind(userId,email,body.name.trim(),role,active,now,now),
      env.DB.prepare("INSERT INTO registration_profiles (user_id,employee_id,phone,site,requested_role,note,submitted_at,approved_at,approved_by) VALUES (?,?,?,?,?,?,?,?,?)").bind(userId,body.employeeId.trim().toUpperCase(),body.phone.trim(),body.site,body.requestedRole,body.note?.trim()||"",now,first?now:null,first?userId:null),
    ]);
  }catch{return Response.json({error:"Employee ID or email is already registered"},{status:409})}
  return Response.json({approved:first,message:first?"Registration complete. Administrator access activated.":"Registration submitted for administrator approval."});
}
