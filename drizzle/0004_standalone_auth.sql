CREATE TABLE registration_profiles_auth (
  user_id TEXT PRIMARY KEY NOT NULL,
  employee_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  site TEXT NOT NULL,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('Admin','Developer','Stock Controller','Stockkeeper','Site Team','QS','PM','Management')),
  note TEXT NOT NULL DEFAULT '',
  submitted_at TEXT NOT NULL,
  approved_at TEXT,
  approved_by TEXT
);
INSERT INTO registration_profiles_auth
  (user_id,employee_id,phone,site,requested_role,note,submitted_at,approved_at,approved_by)
SELECT user_id,employee_id,phone,site,requested_role,note,submitted_at,approved_at,approved_by
FROM registration_profiles;
DROP TABLE registration_profiles;
ALTER TABLE registration_profiles_auth RENAME TO registration_profiles;
CREATE UNIQUE INDEX idx_registration_profiles_employee_id ON registration_profiles(employee_id);
CREATE INDEX idx_registration_profiles_site ON registration_profiles(site);

CREATE TABLE IF NOT EXISTS auth_credentials (
  user_id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_credentials_username ON auth_credentials(username);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY NOT NULL,
  attempt_key TEXT NOT NULL,
  username TEXT NOT NULL,
  success INTEGER NOT NULL CHECK (success IN (0,1)),
  occurred_at TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_key_time ON login_attempts(attempt_key,occurred_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(occurred_at);

CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY NOT NULL,
  occurred_at TEXT NOT NULL,
  action TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  ip_hint TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_security_events_time ON security_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_security_events_action ON security_events(action);

CREATE TABLE IF NOT EXISTS auth_bootstrap (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  user_id TEXT NOT NULL UNIQUE,
  claimed_at TEXT NOT NULL
);
