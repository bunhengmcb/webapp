import fs from 'node:fs';

const page = fs.readFileSync('app/page.tsx', 'utf8');
const state = fs.readFileSync('app/api/state/route.ts', 'utf8');

let failures = 0;
function expect(condition, message) {
  if (condition) console.log(`PASS: ${message}`);
  else { console.error(`FAIL: ${message}`); failures += 1; }
}

const scAllowedStart = state.indexOf('role === "Stock Controller"');
const scAllowedEnd = state.indexOf('      : [', scAllowedStart);
const scAllowed = state.slice(scAllowedStart, scAllowedEnd);

expect(!scAllowed.includes('"SITE TRANSFER"'), 'Stock Controller cannot create new Site Transfer records');
expect(state.includes('record.by !== actorUsername'), 'Site Transfer approval blocks maker/checker self-approval');
expect(state.includes('after.dispatchedBy === actorUsername'), 'dispatch records the actual source dispatcher');
expect(state.includes('record.dispatchedBy !== actorUsername'), 'dispatcher cannot confirm destination receipt');
expect(state.includes('after.receivedBy === actorUsername'), 'destination receipt records the receiver');
expect(state.includes('record.status === "Received"') && state.includes('after.status === "Completed"'), 'Received to Completed transition is server-authorized');
expect(state.includes('after.completedBy === actorUsername'), 'completion records the Stock Controller actor');
expect(page.includes('status: "Completed"') && page.includes('completedBy: user'), 'UI supports final transfer completion');
expect(page.includes('t.dispatchedBy !== user'), 'UI hides destination receipt from the dispatcher');
expect(page.includes('["Pending Approval", "Approved / Reserved", "In Transit", "Received"]'), 'Received transfers remain active until final completion');

if (failures) {
  console.error(`V100 SITE TRANSFER WORKFLOW GATES: FAIL (${failures})`);
  process.exit(1);
}
console.log('V100 SITE TRANSFER WORKFLOW GATES: PASS');
