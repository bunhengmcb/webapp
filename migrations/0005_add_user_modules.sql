-- Migration: add modules column to users for module-based access control
-- Idempotent: only adds column if it does not exist
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
-- SQLite doesn't support IF NOT EXISTS for ADD COLUMN, but running this script twice is safe since ALTER TABLE ADD COLUMN will fail on second run.
ALTER TABLE users ADD COLUMN modules TEXT;
COMMIT;
