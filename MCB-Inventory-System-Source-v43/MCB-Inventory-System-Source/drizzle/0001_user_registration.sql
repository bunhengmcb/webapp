CREATE TABLE IF NOT EXISTS registration_profiles (
  user_id TEXT PRIMARY KEY NOT NULL,
  employee_id TEXT NOT NULL,
  phone TEXT NOT NULL,
  site TEXT NOT NULL,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('Storekeeper','QS','Management')),
  note TEXT NOT NULL DEFAULT '',
  submitted_at TEXT NOT NULL,
  approved_at TEXT,
  approved_by TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS idx_registration_profiles_employee_id ON registration_profiles(employee_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_registration_profiles_site ON registration_profiles(site);
