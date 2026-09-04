import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const page = read("app/page.tsx");
const users = read("app/api/users/route.ts");
const state = read("app/api/state/route.ts");
const register = read("app/api/register/route.ts");
const migration = read("migrations/0007_v100_role_authority_foundation.sql");
const expected = ["MD","PD","FM","PM","TMS","SRA","TMMEP","QSM","Site Engineer","Stock Controller","Stockkeeper","QS","Admin","Developer"];
const checks = [
  [expected.every((r) => page.includes(`\"${r}\"`) || page.includes(`${r}:`)), "all locked V100 roles present in UI authority model"],
  [!page.includes('"Site Team"') && !page.includes('"Management"'), "legacy Site Team/Management roles removed from app UI"],
  [state.includes('const managerRoles: Role[] = ["MD", "PD", "FM", "PM", "TMS", "SRA", "TMMEP", "QSM"]'), "all manager positions receive all-site read visibility"],
  [state.includes('["MD", "PD", "FM", "PM", "TMS", "SRA", "TMMEP", "QSM", "Site Engineer"].includes(role)) return !changed(previous, next);'), "management/site engineer cannot mutate shared state through generic state API"],
  [users.includes('!["Developer", "Admin"].includes(actor.role)'), "Admin and Developer can manage normal accounts"],
  [users.includes('context.role === "Admin" && body.role === "Developer"'), "Admin cannot grant Developer"],
  [users.includes('context.role === "Admin" && targetRole?.role === "Developer"'), "Admin cannot modify Developer accounts"],
  [page.includes('"Backup & Recovery"') && page.includes('Developer: fullSystemViews') && !/Admin:\s*\[[\s\S]{0,400}"Backup & Recovery"/.test(page), "Backup/Recovery excluded from Admin module access"],
  [register.includes('const requestableRoles: Role[] = ["Stock Controller", "Stockkeeper", "Site Engineer", "QS"]'), "self-registration limited to normal operational role requests"],
  [migration.includes("'MD','PD','FM','PM','TMS','SRA','TMMEP','QSM','Site Engineer','Stock Controller','Stockkeeper','QS'"), "role migration contains exact V100 organization roles"],
  [migration.includes("WHEN role='Management' THEN 0"), "legacy generic Management accounts suspended for explicit reassignment"],
  [page.includes('Stockkeeper: ["Dashboard", "Current Stock", "Physical Count", "Stock In", "Stock Out"'), "Stockkeeper has Stock Out maker workspace"],
];
const failed = checks.filter(([ok]) => !ok);
for (const [ok,label] of checks) console.log(`${ok ? "PASS" : "FAIL"}: ${label}`);
if (failed.length) process.exit(1);
console.log("V100 ROLE AUTHORITY GATES: PASS");
