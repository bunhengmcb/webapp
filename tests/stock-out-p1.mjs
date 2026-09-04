import assert from 'node:assert/strict';

function clone(x){ return JSON.parse(JSON.stringify(x)); }

function makeDb(seed){
  return {
    state: clone(seed),
    requests: [],
  };
}

function uid(){ return `ID-${Math.random().toString(36).slice(2,9)}`; }

// operations
function createRequest(db, actor, { site, rows, draft }){
  if (!actor.active) throw new Error('unauth');
  const id = `SOREQ-${Date.now()}-${uid()}`;
  const status = draft ? 'Draft' : 'Pending Verification';
  db.requests.unshift({ id, site, created_at: new Date().toISOString(), created_by: actor.id, created_by_email: actor.email, status, payload: JSON.stringify({ rows, transactionDate: new Date().toISOString(), sheetRef: '' }) });
  return id;
}

function verifyRequest(db, actor, id, updatedRows){
  const req = db.requests.find(r=>r.id===id);
  if(!req) throw new Error('not found');
  if(actor.role !== 'Stock Controller' && actor.role !== 'Developer') throw new Error('verifier role required');
  if(req.created_by === actor.id && actor.role !== 'Developer') throw new Error('maker cannot verify own');
  if(req.status !== 'Pending Verification') throw new Error('not pending');
  // ensure cost codes present
  const rows = updatedRows || JSON.parse(req.payload).rows;
  if(rows.some(r=>!(r.costCode && String(r.costCode).trim()))) throw new Error('missing cost code');
  req.payload = JSON.stringify({ ...JSON.parse(req.payload), rows });
  req.status = 'Verified';
}

function postRequest(db, actor, id){
  const req = db.requests.find(r=>r.id===id);
  if(!req) throw new Error('not found');
  if(actor.role !== 'Stock Controller' && actor.role !== 'Developer') throw new Error('poster role required');
  if(req.status !== 'Verified') throw new Error('not verified');
  if(req.created_by === actor.id && actor.role !== 'Developer') throw new Error('maker cannot post own');
  const payload = JSON.parse(req.payload);
  const rows = payload.rows;
  // check on-hand
  for(const row of rows){
    const onHand = db.state.stock?.[req.site]?.[row.code] ?? 0;
    if(Math.abs(row.qty) > onHand) throw new Error('insufficient');
  }
  // idempotency: mark posted
  if(req.status === 'Posted') throw new Error('already posted');
  // apply
  for(const row of rows){
    db.state.stock = db.state.stock || {};
    db.state.stock[req.site] = db.state.stock[req.site] || {};
    db.state.stock[req.site][row.code] = (db.state.stock[req.site][row.code] || 0) - Math.abs(row.qty);
  }
  req.status = 'Posted';
}

// Seed
const seed = { items:[{code:'IT-1',unit:'PCS'}], stock: { S1: { 'IT-1': 10 } }, transactions: [], bom: [{ site:'S1', code:'IT-1', costCode:'CC1', approvedQty: 100 } ] };

(function(){
  console.log('STOCK OUT P1 TESTS: start');
  const db = makeDb(seed);
  const maker = { id:'u1', email:'maker@example', role:'Stockkeeper', active:true };
  const sc = { id:'u2', email:'sc@example', role:'Stock Controller', active:true };
  const other = { id:'u3', email:'other@example', role:'Stockkeeper', active:true };

  // 1. Maker submits and reload persists
  const id1 = createRequest(db, maker, { site:'S1', rows:[{code:'IT-1', qty:2}], draft:false });
  assert(db.requests.some(r=>r.id===id1 && r.status==='Pending Verification'), 'submitted persists');

  // 2. Maker cannot verify
  let failed=false;
  try{ verifyRequest(db, maker, id1); }catch(e){ failed=true; }
  assert(failed, 'maker cannot verify');

  // 3. Maker cannot post
  failed=false; try{ postRequest(db, maker, id1); }catch(e){ failed=true; } assert(failed, 'maker cannot post');

  // 4. SC cannot create-and-post (we enforce separate steps)
  const id2 = createRequest(db, sc, { site:'S1', rows:[{code:'IT-1', qty:1}], draft:false });
  // SC created a pending request; must not be able to post it immediately (must verify by someone else)
  failed=false; try{ postRequest(db, sc, id2); }catch(e){ failed=true; } assert(failed, 'SC cannot post a request they created unless Developer override');

  // 5. Maker cannot verify own
  failed=false; try{ verifyRequest(db, maker, id1); }catch(e){ failed=true; } assert(failed, 'maker cannot verify own');

  // 6. Independent SC verifies
  verifyRequest(db, sc, id1, [{ code:'IT-1', qty:2, costCode:'CC1' }]);
  assert(db.requests.find(r=>r.id===id1).status==='Verified', 'verified by independent SC');

  // 7. Post requires Verified
  failed=false; try{ postRequest(db, sc, id2); }catch(e){ failed=true; } assert(failed, 'post requires verified status');

  // 8. Successful post
  postRequest(db, sc, id1);
  assert(db.requests.find(r=>r.id===id1).status==='Posted', 'posted');
  assert(db.state.stock['S1']['IT-1']===8, 'stock updated once');

  // 9. Duplicate post rejected
  failed=false; try{ postRequest(db, sc, id1); }catch(e){ failed=true; } assert(failed, 'duplicate post prevented');

  // 10. Insufficient on-hand blocks
  const id3 = createRequest(db, maker, { site:'S1', rows:[{code:'IT-1', qty:1000}], draft:false });
  verifyRequest(db, sc, id3, [{ code:'IT-1', qty:1000, costCode:'CC1' }]);
  failed=false; try{ postRequest(db, sc, id3); }catch(e){ failed=true; } assert(failed, 'insufficient on-hand blocks');

  console.log('STOCK OUT P1 TESTS: PASS');
})();
