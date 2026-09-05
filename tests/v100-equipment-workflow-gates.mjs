import fs from 'node:fs';

const page = fs.readFileSync('app/page.tsx', 'utf8');
const state = fs.readFileSync('app/api/state/route.ts', 'utf8');

function expect(ok, message) {
  if (!ok) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else console.log(`PASS: ${message}`);
}

expect(page.includes('role={user.role}') && page.includes('role: Role;'), 'Equipment panel receives authenticated role');
expect(page.includes('Only Stockkeeper can issue equipment'), 'checkout is Stockkeeper custody action');
expect(page.includes('Only Stockkeeper can process physical equipment returns'), 'return is Stockkeeper custody action');
expect(page.includes('Stock Controller verification is required for repair lifecycle changes'), 'repair lifecycle requires Stock Controller');
expect(page.includes('Scrap requires management-controlled approval. Direct operational scrap is blocked.'), 'operational direct scrap is blocked');
expect(page.includes('status: "Under Investigation"'), 'lost equipment enters Under Investigation');
expect(state.includes('role: "Stockkeeper" | "Stock Controller"') && state.includes('const equipmentTransactions = addedTransactions.filter'), 'server validates equipment changes by role and transaction');
expect(state.includes('? ["EQUIPMENT CHECKOUT", "EQUIPMENT RETURN", "EQUIPMENT DAMAGED", "EQUIPMENT LOST"]'), 'server limits Stockkeeper equipment transaction types');
expect(state.includes(': ["EQUIPMENT REPAIR START", "EQUIPMENT REPAIRED"]'), 'server limits Stock Controller to repair transitions');
expect(state.includes('newEquipmentOnNotActiveSite'), 'Not Active lifecycle guard remains active for equipment');

if (process.exitCode) process.exit(process.exitCode);
console.log('V100 EQUIPMENT WORKFLOW GATES: PASS');
