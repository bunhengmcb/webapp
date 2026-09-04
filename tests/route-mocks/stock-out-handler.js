export async function createStockOut({ db, actor, body }){
  const now = new Date().toISOString();
  const id = `SOREQ-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const payload = JSON.stringify({ rows: body.rows, sheetRef: body.sheetRef || '', transactionDate: body.transactionDate });
  const status = body.draft ? 'Draft' : 'Pending Verification';
  db.stock_out_requests.unshift({ id, site: body.site, created_at: now, created_by: actor.id, created_by_email: actor.email, status, payload, reference: body.sheetRef || '' });
  db.audit_logs.unshift({ id: `AUD-${Math.random().toString(36).slice(2,8)}`, occurred_at: now, actor_id: actor.id, actor_email: actor.email, actor_role: actor.role, action: 'STOCK OUT REQUEST CREATED', summary: JSON.stringify({ requestId: id, status }) });
  return { ok:true, requestId: id, status };
}

export async function verifyStockOut({ db, actor, id, updatedRows }){
  const req = db.stock_out_requests.find(r=>r.id===id);
  if(!req) return { status:404, error:'not found' };
  if(actor.role !== 'Stock Controller' && actor.role !== 'Developer') return { status:403, error:'verifier required' };
  if(req.created_by === actor.id && actor.role !== 'Developer') return { status:403, error:'maker cannot verify own' };
  if(req.status !== 'Pending Verification') return { status:409, error:'not pending' };
  const rows = updatedRows || JSON.parse(req.payload).rows;
  if(rows.some(r=>!(r.costCode && String(r.costCode).trim()))) return { status:400, error:'missing cost code' };
  req.payload = JSON.stringify({ ...JSON.parse(req.payload), rows });
  req.status = 'Verified';
  db.audit_logs.unshift({ id: `AUD-${Math.random().toString(36).slice(2,8)}`, occurred_at: new Date().toISOString(), actor_id: actor.id, actor_email: actor.email, actor_role: actor.role, action: 'STOCK OUT REQUEST VERIFIED', summary: JSON.stringify({ requestId: id }) });
  return { ok:true };
}

export async function postStockOut({ db, actor, id }){
  const req = db.stock_out_requests.find(r=>r.id===id);
  if(!req) return { status:404, error:'not found' };
  if(actor.role !== 'Stock Controller' && actor.role !== 'Developer') return { status:403, error:'poster required' };
  if(req.status !== 'Verified') return { status:409, error:'not verified' };
  if(req.created_by === actor.id && actor.role !== 'Developer') return { status:403, error:'maker cannot post own' };
  const payload = JSON.parse(req.payload);
  const rows = payload.rows || [];
  // check on-hand
  for(const row of rows){
    const onHand = db.app_state.stock?.[req.site]?.[row.code] ?? 0;
    if(Math.abs(row.qty) > onHand) return { status:409, error:'insufficient' };
  }
  // apply once
  if(req.status === 'Posted') return { status:409, error:'already posted' };
  for(const row of rows){
    db.app_state.stock[req.site][row.code] = (db.app_state.stock[req.site][row.code] || 0) - Math.abs(row.qty);
  }
  req.status = 'Posted';
  db.audit_logs.unshift({ id: `AUD-${Math.random().toString(36).slice(2,8)}`, occurred_at: new Date().toISOString(), actor_id: actor.id, actor_email: actor.email, actor_role: actor.role, action: 'STOCK OUT REQUEST POSTED', summary: JSON.stringify({ requestId: id, txCount: rows.length }) });
  return { ok:true, txCount: rows.length };
}
