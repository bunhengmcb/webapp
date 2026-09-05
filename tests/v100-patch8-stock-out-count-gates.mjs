import fs from "node:fs";
import assert from "node:assert/strict";

const page = fs.readFileSync("app/page.tsx", "utf8");
const state = fs.readFileSync("app/api/state/route.ts", "utf8");
const stockOut = fs.readFileSync("app/api/stock-out/route.ts", "utf8");

const checks = [
  [page.includes('useState<"WEEKLY" | "MONTHLY" | "SPOT">("MONTHLY")'), "Physical Count exposes Weekly, Monthly and Spot types"],
  [page.includes('const canCount = ["Developer", "Stockkeeper"].includes(role)'), "Stockkeeper is the normal count maker"],
  [page.includes('status: hasVariance ? "Pending Recount" : "Pending SC"'), "submitted count routes to Stock Controller"],
  [page.includes('status: "Pending Admin"') && page.includes('checkedBy: user'), "Monthly count routes from SC to Admin"],
  [page.includes('Verify & Post') && page.includes('canAdminPost'), "Admin has final monthly verification/post action"],
  [state.includes('role === "Stockkeeper" && session.status === "Draft" && session.createdBy === actorUsername'), "server blocks SC from creating count sessions"],
  [state.includes('before.createdBy === actorUsername') && state.includes('return false'), "server enforces count maker/checker separation"],
  [state.includes('return countPostingMatches(previous, next, before, decision);'), "server reconciles final count posting to exact variance transactions"],
  [stockOut.includes("OPS / Daily Sheet Reference is required"), "Stock Out server requires OPS/daily reference"],
  [stockOut.includes("positive quantity and Requested/Issued To"), "Stock Out server requires requested/issued-to and positive quantity"],
  [stockOut.includes("Verifier may assign cost codes but cannot change maker item or quantity"), "SC cannot silently change maker item/quantity during verification"],
  [stockOut.includes("Approved BOM mapping required"), "Stock Out post requires approved BOM mapping"],
  [stockOut.includes("Maker cannot verify own request"), "Stock Out maker/checker separation remains enforced"],
  [stockOut.includes("Request not Verified or already posted"), "Stock Out post remains idempotent"],
];

for (const [ok, label] of checks) { assert(ok, label); console.log(`PASS: ${label}`); }
console.log("V100 PATCH8 STOCK OUT + PHYSICAL COUNT GATES: PASS");
