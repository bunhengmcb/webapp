-- Migration: add stock_out_requests table
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS stock_out_requests (
  id TEXT PRIMARY KEY,
  site TEXT,
  created_at TEXT,
  created_by TEXT,
  created_by_email TEXT,
  status TEXT,
  submitted_at TEXT,
  verified_at TEXT,
  verified_by TEXT,
  posted_at TEXT,
  posted_by TEXT,
  reference TEXT,
  payload TEXT
);
COMMIT;
