import { relations } from "drizzle-orm/relations";
import { organizationInNeonAuth, invitationInNeonAuth, userInNeonAuth, sessionInNeonAuth, accountInNeonAuth, memberInNeonAuth, leaveRequests, jobs, customers, locations, jobAssignments, machines, jobMachines } from "./schema";

export const invitationInNeonAuthRelations = relations(invitationInNeonAuth, ({ one }) => ({
  organizationInNeonAuth: one(organizationInNeonAuth, {
    fields: [invitationInNeonAuth.organizationId],
    references: [organizationInNeonAuth.id]
  }),
  userInNeonAuth: one(userInNeonAuth, {
    fields: [invitationInNeonAuth.inviterId],
    references: [userInNeonAuth.id]
  }),
}));

export const organizationInNeonAuthRelations = relations(organizationInNeonAuth, ({ many }) => ({
  invitationInNeonAuths: many(invitationInNeonAuth),
  memberInNeonAuths: many(memberInNeonAuth),
}));

export const userInNeonAuthRelations = relations(userInNeonAuth, ({ many }) => ({
  invitationInNeonAuths: many(invitationInNeonAuth),
  sessionInNeonAuths: many(sessionInNeonAuth),
  accountInNeonAuths: many(accountInNeonAuth),
  memberInNeonAuths: many(memberInNeonAuth),
  leaveRequests: many(leaveRequests),
  jobAssignments: many(jobAssignments),
}));

export const sessionInNeonAuthRelations = relations(sessionInNeonAuth, ({ one }) => ({
  userInNeonAuth: one(userInNeonAuth, {
    fields: [sessionInNeonAuth.userId],
    references: [userInNeonAuth.id]
  }),
}));

export const accountInNeonAuthRelations = relations(accountInNeonAuth, ({ one }) => ({
  userInNeonAuth: one(userInNeonAuth, {
    fields: [accountInNeonAuth.userId],
    references: [userInNeonAuth.id]
  }),
}));

export const memberInNeonAuthRelations = relations(memberInNeonAuth, ({ one }) => ({
  organizationInNeonAuth: one(organizationInNeonAuth, {
    fields: [memberInNeonAuth.organizationId],
    references: [organizationInNeonAuth.id]
  }),
  userInNeonAuth: one(userInNeonAuth, {
    fields: [memberInNeonAuth.userId],
    references: [userInNeonAuth.id]
  }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  userInNeonAuth: one(userInNeonAuth, {
    fields: [leaveRequests.userId],
    references: [userInNeonAuth.id]
  }),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  customer: one(customers, {
    fields: [jobs.customerId],
    references: [customers.id]
  }),
  jobAssignments: many(jobAssignments),
  jobMachines: many(jobMachines),
}));

export const jobAssignmentsRelations = relations(jobAssignments, ({ one }) => ({
  userInNeonAuth: one(userInNeonAuth, {
    fields: [jobAssignments.userId],
    references: [userInNeonAuth.id]
  }),
  job: one(jobs, {
    fields: [jobAssignments.jobId],
    references: [jobs.id]
  }),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  customer: one(customers, {
    fields: [locations.customerId],
    references: [customers.id]
  }),
  machines: many(machines),
}));

export const machinesRelations = relations(machines, ({ one, many }) => ({
  location: one(locations, {
    fields: [machines.locationId],
    references: [locations.id]
  }),
  jobMachines: many(jobMachines),
}));

export const jobMachinesRelations = relations(jobMachines, ({ one }) => ({
  job: one(jobs, {
    fields: [jobMachines.jobId],
    references: [jobs.id]
  }),
  machine: one(machines, {
    fields: [jobMachines.machineId],
    references: [machines.id]
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  jobs: many(jobs),
  locations: many(locations)
}));
