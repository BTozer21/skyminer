import { Hono } from 'hono';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../src/db/index.ts';
import { jobAssignments, jobMachines, jobs, machines } from '../src/db/schema/public.ts';
import { zValidator } from '@hono/zod-validator';
import { createInsertSchema } from 'drizzle-orm/zod';
import type { AppVariables } from '../src/types.ts';

const createJobSchema = createInsertSchema(jobs).pick({
  startDate: true,
  endDate: true,
  customerId: true,
  colour: true,
  type: true,
  hotel: true,
}).extend({
  machineIds: z.array(z.coerce.number().int().positive()),
  assignees: z
    .array(z.object({ userId: z.string().min(1), role: z.enum(['member', 'lead']) }))
    .default([])
    .refine(
      (assignees) => new Set(assignees.map((assignee) => assignee.userId)).size === assignees.length,
      'Someone is on this job twice',
    )
    .refine(
      (assignees) =>
        assignees.length === 0 ||
        assignees.filter((assignee) => assignee.role === 'lead').length === 1,
      'A job with a team needs exactly one team leader',
    ),
});

const updateJobSchema = createInsertSchema(jobs).pick({
  startDate: true,
  endDate: true,
  customerId: true,
  status: true,
  quote: true,
  rams: true,
  po: true,
  report: true,
  invoice: true,
  hotel: true,
  colour: true,
  type: true,
}).partial();

export const jobsRoute = new Hono<{ Variables: AppVariables }>()
  .get('/', async (c) => {
    const userId = c.get('userId');
    const userRoles = c.get('userRoles');
    if (!userRoles?.includes('admin')) {
      return c.json({ message: "Not Allowed" }, 403);
    }

    const allJobs = await db.query.jobs.findMany({
      with: { customer: true, jobMachines: { with: { machine: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return c.json({ data: allJobs, user: userId }, 200)
  })

  .get('/mine', async (c) => {
    const userId = c.get('userId');
    const myJobs = await db.query.jobs.findMany({
      where: { status: { ne: 'planning' }, jobAssignments: { userId } },
      with: { customer: true, jobMachines: { with: { machine: true } } },
      orderBy: { startDate: 'asc' },
    });

    return c.json({ data: myJobs }, 200);
  })

  .get('/:id', zValidator('param', z.object({ id: z.coerce.number().int().positive() })), async (c) => {
    const userId = c.get('userId');
    const userRoles = c.get('userRoles');
    const { id } = c.req.valid('param');

    const job = await db.query.jobs.findFirst({
      where: { id },
      with: { customer: true, jobMachines: { with: { machine: true } } },
    });

    // there; both are a 404 as far as the caller is concerned.
    if (!job) {
      return c.json({ message: "Job not found" }, 404);
    }

    const team = await db.query.jobAssignments.findMany({
      where: { jobId: id },
      orderBy: { role: 'asc', id: 'asc' },
      with: {
        user: { columns: { id: true, name: true, email: true } },
      },
    });

    const isAdmin = userRoles?.includes('admin');
    const isOnJob = team.some((member) => member.userId === userId);
    if (!isAdmin && !(isOnJob && job.status !== 'planning')) {
      return c.json({ message: "Job not found" }, 404);
    }

    const isLead = team.some((member) => member.userId === userId && member.role === 'lead');
    const contacts = isAdmin || isLead
      ? await db.query.customerContacts.findMany({
          where: { customerId: job.customerId },
          orderBy: { name: 'asc' },
        })
      : [];

    return c.json({ data: { ...job, jobAssignments: team, contacts } }, 200);
  })

  .post('/', zValidator('json', createJobSchema), async (c) => {
    const userRoles = c.get('userRoles');
    if (!userRoles?.includes('admin')) {
      return c.json({ message: "Not Allowed" }, 403);
    }

    const { machineIds, assignees, ...body } = c.req.valid('json');

    const customer = await db.query.customers.findFirst({
      where: { id: body.customerId },
      columns: { type: true },
    });
    if (!customer) {
      return c.json({ message: "Customer not found" }, 400);
    }
    if (customer.type === 'school' && (!body.type || machineIds.length)) {
      return c.json({ message: "A school job needs a job type and no machines" }, 400);
    }
    if (customer.type === 'industrial' && (body.type || !machineIds.length)) {
      return c.json({ message: "An industrial job needs at least one machine and no job type" }, 400);
    }

    const created = await db.transaction(async (tx) => {
      if (machineIds.length) {
        const owned = await tx
          .select({ id: machines.id })
          .from(machines)
          .where(and(eq(machines.customerId, body.customerId), inArray(machines.id, machineIds)));
        if (owned.length !== new Set(machineIds).size) {
          return { mismatch: true as const };
        }
      }

      const [job] = await tx.insert(jobs).values(body).returning();

      if (job) {
        if (machineIds.length) {
          await tx
            .insert(jobMachines)
            .values(machineIds.map((machineId) => ({ jobId: job.id, machineId })));
        }
        if (assignees.length) {
          await tx
            .insert(jobAssignments)
            .values(
              assignees.map((assignee) => ({
                jobId: job.id,
                userId: assignee.userId,
                role: assignee.role,
              })),
            );
        }
      }

      return { mismatch: false as const, job };
    });

    if (created.mismatch) {
      return c.json({ message: "Those machines don't belong to this customer" }, 400);
    }

    return c.json({ data: created.job }, 201);
  })

  .patch('/:id',
    zValidator('param', z.object({ id: z.coerce.number().int().positive() })),
    zValidator('json', updateJobSchema),
    async (c) => {
      const userRoles = c.get('userRoles');
      if (!userRoles?.includes('admin')) {
        return c.json({ message: "Not Allowed" }, 403);
      }

      const { id } = c.req.valid('param');
      const body = c.req.valid('json');

      const [updated] = await db.update(jobs).set(body).where(eq(jobs.id, id)).returning();

      if (!updated) {
        return c.json({ message: "Job not found" }, 404);
      }

      return c.json({ data: updated }, 200);
    })

  .delete('/:id', zValidator('param', z.object({ id: z.coerce.number().int().positive() })), async (c) => {
    const userRoles = c.get('userRoles');
    if (!userRoles?.includes('admin')) {
      return c.json({ message: "Not Allowed" }, 403);
    }

    const { id } = c.req.valid('param');

    const [deleted] = await db.delete(jobs).where(eq(jobs.id, id)).returning();

    if (!deleted) {
      return c.json({ message: "Job not found" }, 404);
    }

    return c.json({ data: deleted }, 200);
  })
