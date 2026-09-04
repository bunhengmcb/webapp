import fs from "node:fs";

const page = fs.readFileSync("app/page.tsx", "utf8");
const stateRoute = fs.readFileSync("app/api/state/route.ts", "utf8");
const stockOutRoute = fs.readFileSync("app/api/stock-out/route.ts", "utf8");

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function expect(condition, message) {
  if (condition) pass(message);
  else fail(message);
}

expect(
  page.includes('"Active"') &&
    page.includes('"On Progress"') &&
    page.includes('"Handover"') &&
    page.includes('"Defect"') &&
    page.includes('"Not Active"'),
  "all V100 project lifecycle statuses present",
);

expect(
  page.includes('type CostCodeStandard = "Standard" | "Non-Standard"'),
  "Cost Code Standard model present",
);

expect(
  page.includes("isOperationalProjectStatus"),
  "operational project status helper present",
);

expect(
  page.includes("costCodeStandard"),
  "Project/Site Master includes Cost Code Standard",
);

expect(
  page.includes("plannedCompletionDate") &&
    page.includes("actualCompletionDate"),
  "Project/Site Master completion dates present",
);

expect(
  stateRoute.includes('"Closed"') &&
    stateRoute.includes('"Not Active"'),
  "legacy Closed project status normalized to Not Active",
);

expect(
  stateRoute.includes("notActiveSites") &&
    stateRoute.includes(
      "Project/site is Not Active. New inventory operations are blocked.",
    ),
  "generic state API blocks new operations on Not Active projects",
);

expect(
  stockOutRoute.includes("siteIsOperational") &&
    stockOutRoute.includes(
      "Project/site is Not Active. New Stock Out requests are blocked.",
    ),
  "Stock Out POST blocks Not Active projects",
);

expect(
  stockOutRoute.includes(
    "Project/site is Not Active. Stock Out processing is blocked.",
  ),
  "Stock Out verify/post blocked for Not Active projects",
);

if (process.exitCode) {
  console.error("V100 PROJECT LIFECYCLE GATES: FAIL");
  process.exit(process.exitCode);
}

console.log("V100 PROJECT LIFECYCLE GATES: PASS");