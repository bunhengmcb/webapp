import fs from 'node:fs';
import assert from 'node:assert/strict';

const page = fs.readFileSync('app/page.tsx','utf8');
const state = fs.readFileSync('app/api/state/route.ts','utf8');
const users = fs.readFileSync('app/api/users/route.ts','utf8');
const register = fs.readFileSync('app/api/register/route.ts','utf8');

for (const role of ['Developer','Admin','Stock Controller','Stockkeeper','Site Team','QS','PM','Management']) {
  assert(page.includes(role), `page missing role ${role}`);
  assert(state.includes(role), `state API missing role ${role}`);
}
assert(state.includes('if (role === "Site Team" || role === "PM") return !changed(previous, next);'), 'Site Team/PM must remain read-only until explicit workflow permissions are approved');
assert(state.includes('return stockControllerChangesValid(siteAccess, previous, next, actorUsername)'), 'Stock Controller server authorization missing');
assert(state.includes('return stockkeeperChangesValid(siteAccess, previous, next)'), 'Stockkeeper server authorization missing');
assert(state.includes('if (controlled > line.approvedQty + 1e-9) return false;'), 'Strict BOM server limit missing');
assert(state.includes('record.status === "Pending Verification"'), 'Stock In pending verification flow missing');
assert(page.includes('Daily Stock Out'), 'Daily Stock Out UI missing');
assert(page.includes('Pending Verification'), 'Stock In verification UI missing');
assert(users.includes('"Site Team"') && users.includes('"PM"'), 'User Access role list incomplete');
assert(register.includes('"Site Team"') && register.includes('"PM"'), 'Registration role list incomplete');
assert(page.includes('viewerRole={user.role}'), 'Dashboard must receive viewer role for PM/Site Team/Management context');
assert(page.includes('Project inventory overview') && page.includes('Site material overview'), 'Role-aware PM/Site Team dashboard copy missing');
assert(page.includes('const hasGlobalSiteAccess = user.role === "Developer";'), 'Only Developer should have global site access by default');

assert(page.includes('Blind physical count'), 'Physical Count must be blind during Draft');
assert(page.includes('System quantity and variance stay hidden until submission.'), 'Blind count guidance missing');
const migration = fs.readFileSync('scripts/prepare-v96-migration.mjs','utf8');
assert(migration.includes('Opening Current Stock is intentionally NOT generated from Excel Current Stock'), 'Migration must not seed opening stock from legacy Current Stock');
assert(migration.includes('UOM_REVIEW'), 'Migration must flag missing UOM for review');

console.log('V96 STATIC GATES: PASS');

// RC4 physical count gate: first count with variance must force variance-only recount before approval.
assert(page.includes('status: hasVariance ? "Pending Recount" : "Pending"'), "Physical count variance must enter Pending Recount");
assert(page.includes('function startRecount()'), "Variance recount transition missing");
assert(page.includes('function submitRecount()'), "Variance recount submission missing");
assert(page.includes('line.recountQty ?? line.physicalQty ?? line.systemQty'), "Final count must prefer recount quantity");
assert(state.includes('"Pending Recount" | "Recount" | "Pending"'), "Backend stock-count recount states missing");
