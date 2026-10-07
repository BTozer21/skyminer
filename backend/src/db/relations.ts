import { defineRelations } from "drizzle-orm";
import * as authSchema from "./schema/auth";
import * as publicSchema from "./schema/public";

export const schema = { ...publicSchema, ...authSchema };

export const relations = defineRelations(schema, (r) => ({
  customers: {
    jobs: r.many.jobs(),
    machines: r.many.machines(),
  },

  jobs: {
    customer: r.one.customers({
      from: r.jobs.customerId,
      to: r.customers.id,
      optional: false,
    }),
    jobAssignments: r.many.jobAssignments(),
    jobMachines: r.many.jobMachines(),
  },

  jobAssignments: {
    user: r.one.user({
      from: r.jobAssignments.userId,
      to: r.user.id,
      optional: false,
    }),
    job: r.one.jobs({
      from: r.jobAssignments.jobId,
      to: r.jobs.id,
      optional: false,
    }),
  },

  machines: {
    customer: r.one.customers({
      from: r.machines.customerId,
      to: r.customers.id,
      optional: false,
    }),
    jobMachines: r.many.jobMachines(),
  },

  jobMachines: {
    job: r.one.jobs({
      from: r.jobMachines.jobId,
      to: r.jobs.id,
      optional: false,
    }),
    machine: r.one.machines({
      from: r.jobMachines.machineId,
      to: r.machines.id,
      optional: false,
    }),
  },

  leaveRequests: {
    user: r.one.user({
      from: r.leaveRequests.userId,
      to: r.user.id,
      optional: false,
    }),
  },

  user: {
    sessions: r.many.session(),
    accounts: r.many.account(),
    jobAssignments: r.many.jobAssignments(),
    leaveRequests: r.many.leaveRequests(),
  },

  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
      optional: false,
    }),
  },

  account: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id,
      optional: false,
    }),
  },
}));
