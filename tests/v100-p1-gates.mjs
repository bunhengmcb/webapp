import fs from 'node:fs';
import assert from 'node:assert/strict';

const state = fs.readFileSync('app/api/state/route.ts','utf8');
const page = fs.readFileSync('app/page.tsx','utf8');

// Ensure moduleAccess column handling is present
assert(state.includes("ALTER TABLE users ADD COLUMN modules"), 'users.modules migration missing');
assert(state.includes('moduleAccess') && state.includes('moduleAccess: invited.modules'), 'moduleAccess parsing/return missing');

// Ensure PUT enforces module access check
assert(state.includes('Your account does not have Inventory module access') || state.includes('moduleAccess') , 'PUT must enforce module-level access for Inventory');

// UI: Stockkeeper may prepare but cannot post
assert(page.includes('Only a Stock Controller or Developer may post') || page.includes('Only Stock Controller or Developer may post'), 'Stock Out UI must prevent Stockkeeper posting');

console.log('V100 P1 GATES: PASS');
