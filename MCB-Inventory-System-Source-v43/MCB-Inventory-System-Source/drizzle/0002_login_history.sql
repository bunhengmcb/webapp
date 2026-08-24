CREATE TABLE IF NOT EXISTS login_history (
  session_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  login_at TEXT NOT NULL,
  user_agent TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_login_history_login_at ON login_history(login_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
