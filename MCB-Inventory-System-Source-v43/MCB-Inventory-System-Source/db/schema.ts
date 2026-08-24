import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const appState = sqliteTable("app_state", {
  id: integer("id").primaryKey(),
  revision: integer("revision").notNull().default(1),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by").notNull(),
});

export const users = sqliteTable("users", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["Admin", "Storekeeper", "QS", "Management"] }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  occurredAt: text("occurred_at").notNull(),
  actorId: text("actor_id").notNull(),
  actorEmail: text("actor_email").notNull(),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(),
  fromRevision: integer("from_revision").notNull(),
  toRevision: integer("to_revision").notNull(),
  summary: text("summary").notNull(),
});

export const registrationProfiles = sqliteTable("registration_profiles", {
  userId: text("user_id").primaryKey(),
  employeeId: text("employee_id").notNull().unique(),
  phone: text("phone").notNull(),
  site: text("site").notNull(),
  requestedRole: text("requested_role").notNull(),
  note: text("note").notNull().default(""),
  submittedAt: text("submitted_at").notNull(),
  approvedAt: text("approved_at"),
  approvedBy: text("approved_by"),
});

export const loginHistory = sqliteTable("login_history", {
  sessionId: text("session_id").primaryKey(),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  loginAt: text("login_at").notNull(),
  userAgent: text("user_agent").notNull(),
});
