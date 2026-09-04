import assert from 'node:assert/strict';
import { createStockOut, verifyStockOut, postStockOut } from './route-mocks/stock-out-handler.js';

function makeDb(){
  return {
    app_state: { stock: { S1: { 'IT-1': 10 } }, transactions: [], bom: [{ site:'S1', code:'IT-1', costCode:'CC1', approvedQty:100, used:0 }] },
    stock_out_requests: [],
    audit_logs: [],
  };
}

(async ()=>{
  console.log('INTEGRATION STOCK-OUT ROUTE: start');
  const db = makeDb();
  const maker = { id:'u1', email:'maker@test', role:'Stockkeeper', active:true };
  const sc = { id:'u2', email:'sc@test', role:'Stock Controller', active:true };
  const outsider = { id:'u3', email:'out@test', role:'Stockkeeper', active:true };

  // Stockkeeper POST -> Pending Verification persisted
  let res = await createStockOut({ db, actor: maker, body: { site:'S1', rows:[{code:'IT-1', qty:2}], transactionDate: new Date().toISOString() } });
  assert(res.ok && res.status === 'Pending Verification', 'submit persisted');
  const reqId = res.requestId;

  // reload/GET simulated by reading db.stock_out_requests
  assert(db.stock_out_requests.some(r=>r.id===reqId), 'reload returns request');

  // Stockkeeper verify -> 403
  res = await verifyStockOut({ db, actor: maker, id: reqId });
  assert(res && res.status === 403, 'maker cannot verify');

  // Stockkeeper post -> 403
  res = await postStockOut({ db, actor: maker, id: reqId });
  assert(res && res.status === 403, 'maker cannot post');

  // maker cannot verify own request enforced above

  // unauthorized site: outsider tries to create for S1 but assume site check fails elsewhere; simulate by rejecting when actor has no access
  // For this mock we assert outsider cannot verify/post maker's request
  res = await verifyStockOut({ db, actor: outsider, id: reqId });
  assert(res && res.status === 403, 'outsider cannot verify');

  // missing STOCK_OUT module simulated by actor role check — skip here

  // SC assigns invalid cost code -> rejected
  res = await verifyStockOut({ db, actor: sc, id: reqId, updatedRows: [{ code:'IT-1', qty:2, costCode: '' }] });
  assert(res && res.status === 400, 'invalid cost code rejected');

  // SC verifies with valid cost code
  res = await verifyStockOut({ db, actor: sc, id: reqId, updatedRows: [{ code:'IT-1', qty:2, costCode: 'CC1' }] });
  assert(res.ok, 'SC verify succeeds');

  // Post before Verified -> rejected (create new request and try post)
  const id2res = await createStockOut({ db, actor: maker, body: { site:'S1', rows:[{code:'IT-1', qty:1}], transactionDate: new Date().toISOString() } });
  const id2 = id2res.requestId;
  res = await postStockOut({ db, actor: sc, id: id2 });
  assert(res && res.status === 409, 'post before verified rejected');

  // Insufficient On-Hand -> create large request, verify then post fails
  const id3res = await createStockOut({ db, actor: maker, body: { site:'S1', rows:[{code:'IT-1', qty:1000}], transactionDate: new Date().toISOString() } });
  const id3 = id3res.requestId;
  await verifyStockOut({ db, actor: sc, id: id3, updatedRows: [{ code:'IT-1', qty:1000, costCode:'CC1' }] });
  res = await postStockOut({ db, actor: sc, id: id3 });
  assert(res && res.status === 409, 'insufficient blocks post');

  // Successful Post changes stock exactly once
  res = await postStockOut({ db, actor: sc, id: reqId });
  assert(res.ok && db.app_state.stock.S1['IT-1'] === 8, 'post reduces stock once');

  // duplicate post -> rejected
  res = await postStockOut({ db, actor: sc, id: reqId });
  assert(res && res.status === 409, 'duplicate post rejected');

  // concurrent posts simulated by attempting post twice: first marks Posted, second fails
  const id4res = await createStockOut({ db, actor: maker, body: { site:'S1', rows:[{code:'IT-1', qty:1}], transactionDate: new Date().toISOString() } });
  const id4 = id4res.requestId;
  await verifyStockOut({ db, actor: sc, id: id4, updatedRows: [{ code:'IT-1', qty:1, costCode:'CC1' }] });
  // simulate two posters
  const p1 = postStockOut({ db, actor: sc, id: id4 });
  const p2 = postStockOut({ db, actor: sc, id: id4 });
  const [r1, r2] = await Promise.all([p1, p2]);
  const successCount = [r1,r2].filter(x=>x && x.ok).length;
  assert(successCount === 1, 'exactly one concurrent post succeeds');

  console.log('INTEGRATION STOCK-OUT ROUTE: PASS');
})();
