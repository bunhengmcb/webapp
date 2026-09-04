import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const state = read("app/api/state/route.ts");
const evidence = read("app/api/transaction-evidence/route.ts");
const page = read("app/page.tsx");
const journal = JSON.parse(read("drizzle/meta/_journal.json"));

const checks = [
  [state.includes("function stateForUser"), "server-side scoped state response"],
  [state.includes("function mergeScopedState"), "server-side merge preserving hidden site data"],
  [state.includes("return stateForUser(normalized, user)"), "state GET/conflict response scoped"],
  [evidence.includes("authorizedTransaction"), "transaction evidence object authorization"],
  [evidence.includes("fileSignatureMatches"), "transaction evidence signature validation"],
  [evidence.includes("x-mcb-site"), "site-bound pre-transaction evidence upload"],
  [state.includes('if (role === "Admin") return adminChangesValid(previous, next);'), "Admin controlled approval path wired"],
  [state.includes('return !before && record.status === "Pending";'), "Stock Controller cannot self-approve adjustments"],
  [state.includes('before.createdBy !== actorUsername'), "Stock count maker/checker separation"],
  [state.includes("controlledBomQuantity"), "BOM reversal/correction net accounting"],
  [page.includes("return crypto.randomUUID();"), "cryptographic record IDs"],
  [!state.includes("dream14gaming@gmail.com"), "no hard-coded owner promotion"],
  [journal.entries.some((entry) => entry.tag === "0004_standalone_auth"), "standalone auth migration journaled"],
  [fs.existsSync(path.join(root, "drizzle/0004_standalone_auth.sql")), "standalone auth Drizzle migration present"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, label] of failed) console.error(`FAIL: ${label}`);
  process.exit(1);
}
for (const [, label] of checks) console.log(`PASS: ${label}`);
console.log("RC5 HARDENING GATES: PASS");
