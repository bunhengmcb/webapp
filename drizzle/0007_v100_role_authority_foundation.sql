-- V100 organization / role authority foundation.
-- Legacy Management accounts are suspended for explicit reassignment because the old generic
-- role cannot be safely inferred as MD/PD/FM/PM/QSM/technical management.
PRAGMA foreign_keys=OFF;

CREATE TABLE users_v100_roles (
  user_id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('Developer','Admin','MD','PD','FM','PM','TMS','SRA','TMMEP','QSM','Site Engineer','Stock Controller','Stockkeeper','QS')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  modules TEXT
);

INSERT INTO users_v100_roles (user_id,email,name,display_name,role,active,created_at,updated_at,modules)
SELECT user_id,email,name,display_name,
  CASE
    WHEN role='Site Team' THEN 'Site Engineer'
    WHEN role='Management' THEN 'PM'
    ELSE role
  END,
  CASE WHEN role='Management' THEN 0 ELSE active END,
  created_at,updated_at,modules
FROM users;

DROP TABLE users;
ALTER TABLE users_v100_roles RENAME TO users;

CREATE TABLE registration_profiles_v100_roles (
  user_id TEXT PRIMARY KEY NOT NULL,
  employee_id TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  site TEXT NOT NULL DEFAULT '[]',
  requested_role TEXT NOT NULL CHECK (requested_role IN ('Developer','Admin','MD','PD','FM','PM','TMS','SRA','TMMEP','QSM','Site Engineer','Stock Controller','Stockkeeper','QS')),
  note TEXT NOT NULL DEFAULT '',
  submitted_at TEXT NOT NULL,
  approved_at TEXT,
  approved_by TEXT
);

INSERT INTO registration_profiles_v100_roles (user_id,employee_id,phone,site,requested_role,note,submitted_at,approved_at,approved_by)
SELECT user_id,employee_id,phone,site,
  CASE
    WHEN requested_role='Site Team' THEN 'Site Engineer'
    WHEN requested_role='Management' THEN 'PM'
    ELSE requested_role
  END,
  CASE WHEN requested_role='Management' THEN trim(COALESCE(note,'') || ' [V100 migration: legacy Management role suspended; reassign exact management position.]') ELSE note END,
  submitted_at,approved_at,approved_by
FROM registration_profiles;

DROP TABLE registration_profiles;
ALTER TABLE registration_profiles_v100_roles RENAME TO registration_profiles;

CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role,active);
PRAGMA foreign_keys=ON;
CREATE UNIQUE INDEX IF NOT EXISTS idx_registration_profiles_employee_id ON registration_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_registration_profiles_site ON registration_profiles(site);
