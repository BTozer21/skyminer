import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, getAuthenticatedDb } from '../src/db/index.ts';
import { jobs } from '../src/db/schema.ts';
import { zValidator } from '@hono/zod-validator';
import { createInsertSchema } from 'drizzle-zod';
import type { AppVariables } from '../src/types.ts';

const createJobSchema = createInsertSchema(jobs).pick({
  name: true,
  startDate: true,
  endDate: true,
  customerId: true,
});

const updateJobSchema = createInsertSchema(jobs).pick({
  name: true,
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
        with: { customer: true },
        orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
      });
      return result;
    });

    return c.json({ data: allJobs, user: userId }, 200)
  })

  .get('/:id', zValidator('param', z.object({ id: z.coerce.number().int().positive() })), async (c) => {
    const userId = c.get('userId');
    const userRoles = c.get('userRoles');
    const { id } = c.req.valid('param');

    const job = await getAuthenticatedDb(userId, async (tx) => {
      const result = await tx.query.jobs.findFirst({
        where: (jobs, { eq }) => eq(jobs.id, id),
        with: { customer: true },
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
    if (!isAdmin && !(isOnJob && job.status === 'planned')) {
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

    const body = c.req.valid('json');

    const newJob = await getAuthenticatedDb(userId, async (tx) => {
      const [result] = await tx.insert(jobs).values(body).returning();

      return result;
    });

    return c.json({ data: newJob }, 201);
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

    // job_assignments cascades, so the job's team goes with it.
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
