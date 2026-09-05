import fs from "node:fs";

const page = fs.readFileSync("app/page.tsx", "utf8");
const stateRoute = fs.readFileSync("app/api/state/route.ts", "utf8");

function expect(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS: ${message}`);
  }
}

const scAllowedBlock = stateRoute.match(/role === "Stock Controller"\s*\? \[([\s\S]*?)\]\s*:\s*\[/)?.[1] ?? "";
expect(!scAllowedBlock.includes('"STOCK IN"'), "Stock Controller cannot create new Stock In records");
expect(stateRoute.includes('record.type === "STOCK IN"') && stateRoute.includes('record.status === "Pending Verification"'), "Stock Controller verification transition for pending Stock In remains available");
expect(stateRoute.includes('["STOCK OUT", "REVERSE TRANSACTION", "CORRECT TRANSACTION"]'), "BOM transaction enforcement excludes Stock In");
expect(stateRoute.includes('Stock Out is blocked because the approved BOM would be exceeded or is not linked'), "server BOM rejection is Stock Out specific");
expect(page.includes('mode === "OUT" && (!normalized || !validCodes.includes(normalized))'), "Cost Code is mandatory only for Stock Out");
expect(page.includes('mode === "OUT" &&\r\n      bomLine') || page.includes('mode === "OUT" &&\n      bomLine'), "BOM overrun gate applies only to Stock Out");
expect(page.includes('No mapping yet — receive as Pending Cost Mapping'), "Stock In supports missing cost mapping");
expect(page.includes('role === "Stock Controller" || !approvedSuppliers.length'), "Stock Controller Stock In maker action is disabled in UI");
expect(page.includes('Posted - Pending Cost Mapping'), "posted Stock In preserves pending mapping status");
expect(page.includes('This Stock Out would exceed the'), "BOM exception modal is Stock Out only");

if (process.exitCode) process.exit(process.exitCode);
console.log("V100 STOCK IN WORKFLOW GATES: PASS");
