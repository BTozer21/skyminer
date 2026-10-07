import { pgTable, pgEnum, foreignKey, text, timestamp, unique, boolean, uniqueIndex, bigint, date } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { user } from "./auth"

export const customerTypeEnum = pgEnum('customer_type', ['school', 'industrial']);

export const customers = pgTable("customers", {
  // no maxValue here: as a JS number 9223372036854775807 rounds out of bigint range; drizzle's default is correct
  id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "customers_id_seq" }),
  name: text().notNull(),
  type: customerTypeEnum().notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const statusEnum = pgEnum('status', ['complete', 'planned', 'planning']);

export const jobColours = ['red', 'orange', 'amber', 'lime', 'green', 'teal', 'cyan', 'blue', 'indigo', 'violet', 'fuchsia', 'pink'] as const;

export const jobs = pgTable("jobs", {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "jobs_id_seq", startWith: 1, increment: 1, minValue: 1, cache: 1 }),
  startDate: date().notNull(),
  endDate: date().notNull(),
  status: statusEnum().notNull().default('planning'),
  quote: boolean().default(false),
  rams: boolean().default(false),
  po: boolean().default(false),
  report: boolean().default(false),
  invoice: boolean().default(false),
  hotel: boolean().default(false),
  colour: text({ enum: jobColours }).notNull(),
  customerId: bigint("customer_id", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.customerId],
    foreignColumns: [customers.id],
    name: "jobs_customer_id_customers_id_fk"
  }),
]);

export const jobAssignments = pgTable("job_assignments", {
  id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "job_assignments_id_seq" }),
  userId: text("user_id").notNull(),
  jobId: bigint({ mode: "number" }).notNull(),
  role: text().notNull().default('member'),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [user.id],
    name: "job_assignments_user_id_user_id_fk"
  }),
  foreignKey({
    columns: [table.jobId],
    foreignColumns: [jobs.id],
    name: "job_assignments_job_id_job_id_fk"
  }).onDelete("cascade"),
  unique("job_assignments_user_id_job_id_unique").on(table.userId, table.jobId),
  uniqueIndex("job_assignments_one_lead_per_job").on(table.jobId).where(sql`role = 'lead'`),
]);

export const machines = pgTable("machines", {
  id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "machines_id_seq" }),
  type: text().notNull(),
  location: text(),
  customerId: bigint("customer_id", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().$onUpdate(() => new Date().toISOString()).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.customerId],
    foreignColumns: [customers.id],
    name: "machines_customer_id_fk"
  }),
]);

export const jobMachines = pgTable("job_machines", {
  id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "job_machines_id_seq" }),
  jobId: bigint("job_id", { mode: "number" }).notNull(),
  machineId: bigint("machine_id", { mode: "number" }).notNull(),
}, (table) => [
  foreignKey({
    columns: [table.jobId],
    foreignColumns: [jobs.id],
    name: "job_machines_job_id_fk"
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.machineId],
    foreignColumns: [machines.id],
    name: "job_machines_machine_id_fk"
  }).onDelete("cascade"),
  unique("job_machines_job_id_machine_id_unique").on(table.jobId, table.machineId),
]);

export const leaveStatusEnum = pgEnum('leave_status', ['submitted', 'approved', 'denied']);

export const leaveRequests = pgTable("leave_requests", {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "leave_requests_id_seq", startWith: 1, increment: 1, minValue: 1, cache: 1 }),
  userId: text("user_id").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  comment: text(),
  status: leaveStatusEnum().notNull().default('submitted'),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
  foreignKey({
    columns: [table.userId],
    foreignColumns: [user.id],
    name: "leave_requests_user_id_user_id_fk"
  }),
]);
