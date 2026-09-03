import { env } from "cloudflare:workers";
export const dynamic="force-dynamic";

export async function GET(){
  const started=Date.now();
  const appEnv=String(env.ENVIRONMENT || "staging");
  const expectedDb=appEnv;
  let database="unavailable";
  try {
    if (env.DB) {
      await env.DB.prepare("SELECT 1 AS ok").first();
      database="connected";
    }
  } catch { database="error"; }
  const ok=database==="connected";
  return Response.json({
    ok,
    service:"MCB Inventory System",
    environment:appEnv,
    databaseEnvironment:expectedDb,
    database,
    checkedAt:new Date().toISOString(),
    responseMs:Date.now()-started
  },{status:ok?200:503,headers:{"Cache-Control":"no-store"}});
}
