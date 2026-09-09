import { Hono } from 'hono';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db, getAuthenticatedDb } from '../src/db/index.ts';
import { jobAssignments, jobMachines, jobs, machines } from '../src/db/schema.ts';
import { zValidator } from '@hono/zod-validator';
import { createInsertSchema } from 'drizzle-zod';
import type { AppVariables } from '../src/types.ts';

const createJobSchema = createInsertSchema(jobs).pick({
  startDate: true,
  endDate: true,
  customerId: true,
}).extend({
  machineIds: z.array(z.coerce.number().int().positive()).min(1),
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
}).partial();

export const jobsRoute = new Hono<{ Variables: AppVariables }>()
  .get('/', async (c) => {
    const userId = c.get('userId');
    const allJobs = await getAuthenticatedDb(userId, async (tx) => {
      const result = await tx.query.jobs.findMany({
        with: { customer: true, jobMachines: { with: { machine: true } } },
        orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
      });
      return result;
    });

    return c.json({ data: allJobs, user: userId }, 200)
  })

  .get('/mine', async (c) => {
    const userId = c.get('userId');
    const myJobs = await getAuthenticatedDb(userId, async (tx) => {
      const result = await tx.query.jobs.findMany({
        where: (jobs, { and, ne, inArray }) =>
          and(
            ne(jobs.status, 'planning'),
            inArray(
              jobs.id,
              tx
                .select({ jobId: jobAssignments.jobId })
                .from(jobAssignments)
                .where(eq(jobAssignments.userId, userId)),
            ),
          ),
        with: { customer: true, jobMachines: { with: { machine: true } } },
        orderBy: (jobs, { asc }) => [asc(jobs.startDate)],
      });
      return result;
    });

    return c.json({ data: myJobs }, 200);
  })

  .get('/:id', zValidator('param', z.object({ id: z.coerce.number().int().positive() })), async (c) => {
    const userId = c.get('userId');
    const userRoles = c.get('userRoles');
    const { id } = c.req.valid('param');

    const job = await getAuthenticatedDb(userId, async (tx) => {
      const result = await tx.query.jobs.findFirst({
        where: (jobs, { eq }) => eq(jobs.id, id),
        with: { customer: true, jobMachines: { with: { machine: true } } },
      });
      return result;
    });

    // there; both are a 404 as far as the caller is concerned.
    if (!job) {
      return c.json({ message: "Job not found" }, 404);
    }

    const team = await db.query.jobAssignments.findMany({
      where: (assignment, { eq }) => eq(assignment.jobId, id),
      orderBy: (assignment, { asc }) => [asc(assignment.role), asc(assignment.id)],
      with: {
        userInNeonAuth: { columns: { id: true, name: true, email: true } },
      },
    });

    const isAdmin = userRoles?.includes('admin');
    const isOnJob = team.some((member) => member.userId === userId);
    if (!isAdmin && !(isOnJob && job.status !== 'planning')) {
      return c.json({ message: "Job not found" }, 404);
    }

    return c.json({ data: { ...job, jobAssignments: team } }, 200);
  })

  .post('/', zValidator('json', createJobSchema), async (c) => {
    const userId = c.get('userId');
    const userRoles = c.get('userRoles');
    if (!userRoles?.includes('admin')) {
      return c.json({ message: "Not Allowed" }, 403);
    }

    const { machineIds, ...body } = c.req.valid('json');

    const created = await getAuthenticatedDb(userId, async (tx) => {
      const owned = await tx
        .select({ id: machines.id })
        .from(machines)
        .where(and(eq(machines.customerId, body.customerId), inArray(machines.id, machineIds)));
      if (owned.length !== new Set(machineIds).size) {
        return { mismatch: true as const };
      }

      const [job] = await tx.insert(jobs).values(body).returning();

      if (job) {
        await tx
          .insert(jobMachines)
          .values(machineIds.map((machineId) => ({ jobId: job.id, machineId })));
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
      const userId = c.get('userId');
      const userRoles = c.get('userRoles');
      if (!userRoles?.includes('admin')) {
        return c.json({ message: "Not Allowed" }, 403);
      }

      const { id } = c.req.valid('param');
      const body = c.req.valid('json');

      const updated = await getAuthenticatedDb(userId, async (tx) => {
        const [result] = await tx.update(jobs).set(body).where(eq(jobs.id, id)).returning();

        return result;
      });

      // RLS makes a job someone can't touch look identical to one that isn't
      // there; both are a 404 as far as the caller is concerned.
      if (!updated) {
        return c.json({ message: "Job not found" }, 404);
      }

      return c.json({ data: updated }, 200);
    })

  .delete('/:id', zValidator('param', z.object({ id: z.coerce.number().int().positive() })), async (c) => {
    const userId = c.get('userId');
    const userRoles = c.get('userRoles');
    if (!userRoles?.includes('admin')) {
      return c.json({ message: "Not Allowed" }, 403);
    }

    const { id } = c.req.valid('param');

    const deleted = await getAuthenticatedDb(userId, async (tx) => {
      const [result] = await tx.delete(jobs).where(eq(jobs.id, id)).returning();

      return result;
    });

    // RLS makes a job someone can't touch look identical to one that isn't
    // there; both are a 404 as far as the caller is concerned.
    if (!deleted) {
      return c.json({ message: "Job not found" }, 404);
    }

    return c.json({ data: deleted }, 200);
  })
