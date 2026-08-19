import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { eq } from 'drizzle-orm';
import { db } from '../src/db/index.ts';
import { jobAssignments, userInNeonAuth } from '../src/db/schema.ts';
import type { AppVariables } from '../src/types.ts';

const createJobAssignmentSchema = createInsertSchema(jobAssignments).pick({
  jobId: true,
  userId: true,
});

export const adminRoute = new Hono<{ Variables: AppVariables }>()
  .get('/users', async (c) => {
    const users = await db.select().from(userInNeonAuth);

    return c.json({ data: users }, 200);
  })

  .get(
    '/job-assignments',
    zValidator('query', z.object({ from: z.string(), to: z.string() })),
    async (c) => {
      const { from, to } = c.req.valid('query');

      // Jobs on top so the date window filters the top-level table; assigned users
      // come nested via job_assignments. Overlap semantics: a job appears if any
      // part of its span falls inside [from, to] (date columns are 'yyyy-MM-dd'
      // strings, so lexical comparison is correct).
      const data = await db.query.jobs.findMany({
        where: (jobs, { and, lte, gte }) =>
          and(lte(jobs.startDate, to), gte(jobs.endDate, from)),
        with: {
          customer: { columns: { id: true, name: true } },
          jobAssignments: {
            with: {
              userInNeonAuth: { columns: { id: true, name: true, email: true } },
            },
          },
        },
      });

      return c.json({ data }, 200);
    }
  )

  .post(
    '/job-assignments',
    zValidator('json', createJobAssignmentSchema),
    async (c) => {
      const { jobId, userId } = c.req.valid('json');

      // The table has no unique constraint on (job_id, user_id), so the same
      // person could be added to a job twice and show up twice in the grid.
      const existing = await db.query.jobAssignments.findFirst({
        where: (assignment, { and, eq }) =>
          and(eq(assignment.jobId, jobId), eq(assignment.userId, userId)),
      });
      if (existing) {
        return c.json({ message: 'Already assigned to this job' }, 409);
      }

      const [created] = await db
        .insert(jobAssignments)
        .values({ jobId, userId })
        .returning();

      return c.json({ data: created }, 201);
    }
  )

  .delete(
    '/job-assignments/:id',
    zValidator('param', z.object({ id: z.coerce.number().int().positive() })),
    async (c) => {
      const { id } = c.req.valid('param');

      const [deleted] = await db
        .delete(jobAssignments)
        .where(eq(jobAssignments.id, id))
        .returning();

      // Distinguishes "already gone" from a successful removal, so a stale grid
      // clicking remove twice doesn't look like it worked the second time.
      if (!deleted) {
        return c.json({ message: 'Assignment not found' }, 404);
      }

      return c.json({ data: deleted }, 200);
    }
  )
