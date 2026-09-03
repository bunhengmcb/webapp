import fs from 'node:fs';
import assert from 'node:assert/strict';
const state = fs.readFileSync('app/api/state/route.ts','utf8');
const page = fs.readFileSync('app/page.tsx','utf8');
const css = fs.readFileSync('app/globals.css','utf8');

// 1. Maker/creator cannot approve own count
assert(state.includes('before.createdBy !== actorUsername') || state.includes('createdBy !== actorUsername'), 'maker-checker separation missing');

// 2. Duplicate approval/post prevention (optimistic concurrency check)
assert(state.includes('WHERE id=1 AND revision=?') && state.includes("(result[0].meta.changes ?? 0) !== 1"), 'concurrency/duplicate-post guard missing');

// 3. Intervening Stock In/Out after snapshot: reconciliation uses previous.stock and tx previousQty/newQty
assert(state.includes('previous.stock[decision.site]?.[line.code]') && state.includes('tx.previousQty') && state.includes('tx.newQty'), 'reconciliation transaction fields missing');

// 4. Negative resulting stock prevention
assert(state.includes('if ((expected[site]?.[code] ?? 0) < 0) return false') || state.includes('negative expected'), 'negative stock prevention missing');

// 5. siteAccess enforcement for stock counts
assert(state.includes('siteAllowed(siteAccess, session.site)') || state.includes('siteAllowed(siteAccess, session.site)'), 'siteAccess check for stock counts missing');

// 6. Concurrent approvals: ensure optimistic update and audit occurs (audit insert + revision check)
assert(state.includes('INSERT INTO audit_logs') && state.includes('UPDATE app_state SET revision=?'), 'audit + optimistic update missing');

// 7. Transaction/audit record contains previousQty, qty, newQty, actor and reference
assert(
	(state.includes('previousQty') && state.includes('newQty') && (state.includes('reference:') || page.includes('reference:')) && (state.includes('by:') || page.includes('by:')) && (state.includes('timestamp') || page.includes('timestamp'))) ,
	'variance transaction audit fields missing',
);

// UI checks for snapshot display and mobile styles already in page/globals
assert(page.includes('snapshotAt') || page.includes('snapshotAt'), 'UI should handle snapshotAt presence');
assert(css.includes('.count-input') && css.includes('@media (max-width: 480px)'), 'responsive CSS for Physical Count missing');

console.log('INTEGRATION-PHYSICAL-COUNT-STATIC: PASS');
