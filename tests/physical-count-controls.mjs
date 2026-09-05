import fs from 'node:fs';
import assert from 'node:assert/strict';

const state = fs.readFileSync('app/api/state/route.ts','utf8');

assert(state.includes('snapshotAt'), 'Server must persist snapshotAt for stock count sessions');
assert(state.includes('WEEKLY') && state.includes('MONTHLY') && state.includes('SPOT') && state.includes('MONTHLY_FULL') && state.includes('CYCLE'), 'Server must accept V100 Weekly/Monthly/Spot count types and legacy count codes');
assert(state.includes('before.snapshotAt && session.snapshotAt && before.snapshotAt !== session.snapshotAt') || state.includes('snapshotAt must be immutable'), 'Server must enforce snapshotAt immutability');
assert(state.includes('previous.stock[decision.site]?.[line.code] === line.systemQty') || state.includes('previous.stock[decision.site]'), 'Server must verify snapshot system quantities at approval time');
assert(state.includes('STOCK COUNT VARIANCE'), 'Server approval must create STOCK COUNT VARIANCE transactions');
assert(state.includes('< 0') || state.includes('negative expected'), 'Server must prevent negative expected stock values');

console.log('PHYSICAL COUNT CONTROLS: STATIC CHECKS PASS');
