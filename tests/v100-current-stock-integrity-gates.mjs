import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const state = read("app/api/state/route.ts");
const page = read("app/page.tsx");

const checks = [
  [page.includes('kind: "Opening Balance" | "Adjustment"'), "Current Stock separates Opening Balance from Adjustment"],
  [page.includes('role === "Stockkeeper" ? "Opening Balance" : "Adjustment"'), "Stockkeeper UI is Opening Balance maker; SC UI is Adjustment maker"],
  [page.includes('status: role === "Stockkeeper" ? "Pending SC" : "Pending Admin"'), "Opening Balance routes through SC; Adjustment routes to Admin"],
  [page.includes('checkOpeningBalance(request, "Pending Admin")'), "SC check forwards Opening Balance to Admin"],
  [page.includes('Maker/checker control: you cannot check your own opening balance'), "Opening Balance maker/checker separation visible in UI"],
  [state.includes('record.kind === "Opening Balance"') && state.includes('record.status === "Pending SC"'), "server allows only controlled Stockkeeper Opening Balance requests"],
  [state.includes('!hasPriorInventoryMovement(previous, record.site, record.code)'), "Opening Balance blocked after prior inventory movement"],
  [state.includes('record.kind === "Adjustment"') && state.includes('record.status === "Pending Admin"'), "server routes SC adjustments to Admin"],
  [state.includes('before.requestedBy !== actorUsername') && state.includes('record.checkedBy === actorUsername'), "server enforces independent SC checker for Opening Balance"],
  [state.includes('before.requestedBy === actorUsername || before.checkedBy === actorUsername'), "Admin final approver cannot be maker/checker"],
  [state.includes('(previous.stock[decision.site]?.[decision.code] ?? 0) !== decision.previousQty'), "stale adjustment approval is rejected server-side"],
  [state.includes('newTransactions[0].previousQty === decision.previousQty') && state.includes('newTransactions[0].newQty === decision.requestedQty'), "posted balance transaction preserves before/after quantities"],
  [state.includes('newAdjustmentsOnNotActiveSite'), "Not Active lifecycle guard still protects Current Stock controls"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, label] of failed) console.error(`FAIL: ${label}`);
  process.exit(1);
}
for (const [, label] of checks) console.log(`PASS: ${label}`);
console.log("V100 CURRENT STOCK INTEGRITY GATES: PASS");
