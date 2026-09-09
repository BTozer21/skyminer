import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import { and, eq } from 'drizzle-orm';
import { db } from '../src/db/index.ts';
import { jobAssignments, leaveRequests, leaveStatusEnum, userInNeonAuth } from '../src/db/schema.ts';
import type { AppVariables } from '../src/types.ts';

const createJobAssignmentSchema = createInsertSchema(jobAssignments).pick({
  jobId: true,
  userId: true,
  role: true,
});

const updateJobAssignmentSchema = z.object({ role: z.enum(['member', 'lead']) });

const updateLeaveRequestSchema = z.object({
  status: z.enum(leaveStatusEnum.enumValues),
});

export const adminRoute = new Hono<{ Variables: AppVariables }>()
  .get('/users', async (c) => {
    const users = await db.select().from(userInNeonAuth);

    return c.json({ data: users }, 200);
  })

  .get(
    '/users/:id',
    zValidator('param', z.object({ id: z.uuid() })),
    async (c) => {
      const { id } = c.req.valid('param');

      const user = await db.query.userInNeonAuth.findFirst({
        where: (user, { eq }) => eq(user.id, id),
        columns: { id: true, name: true, email: true, role: true },
        with: {
          leaveRequests: {
            orderBy: (leave, { desc }) => [desc(leave.startDate)],
          },
        },
      });

      if (!user) {
        return c.json({ message: 'User not found' }, 404);
      }

      return c.json({ data: user }, 200);
    }
  )

  .patch(
    '/leave-requests/:id',
    zValidator('param', z.object({ id: z.coerce.number().int().positive() })),
    zValidator('json', updateLeaveRequestSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { status } = c.req.valid('json');

      const [updated] = await db
        .update(leaveRequests)
        .set({ status })
        .where(eq(leaveRequests.id, id))
        .returning();

      if (!updated) {
        return c.json({ message: 'Leave request not found' }, 404);
      }

      return c.json({ data: updated }, 200);
    }
  )

  .get(
    '/job-assignments',
    zValidator('query', z.object({ from: z.string(), to: z.string() })),
    async (c) => {
      const { from, to } = c.req.valid('query');

      const data = await db.query.jobs.findMany({
        where: (jobs, { and, lte, gte }) =>
          and(lte(jobs.startDate, to), gte(jobs.endDate, from)),
        with: {
          customer: { columns: { id: true, name: true } },
          jobMachines: { with: { machine: { columns: { id: true, type: true, location: true } } } },
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
      const { jobId, userId, role } = c.req.valid('json');

      // The table has no unique constraint on (job_id, user_id), so the same
      // person could be added to a job twice and show up twice in the grid.
      const existing = await db.query.jobAssignments.findFirst({
        where: (assignment, { and, eq }) =>
          and(eq(assignment.jobId, jobId), eq(assignment.userId, userId)),
      });
      if (existing) {
        return c.json({ message: 'Already assigned to this job' }, 409);
      }

      const created = await db.transaction(async (tx) => {
        // One lead per job is a unique index, so the sitting lead has to step
        // down before the new one is inserted.
        if (role === 'lead') {
          await tx
            .update(jobAssignments)
            .set({ role: 'member' })
            .where(and(eq(jobAssignments.jobId, jobId), eq(jobAssignments.role, 'lead')));
        }

        const [result] = await tx
          .insert(jobAssignments)
          .values({ jobId, userId, role })
          .returning();

        return result;
      });

      return c.json({ data: created }, 201);
    }
  )

  .patch(
    '/job-assignments/:id',
    zValidator('param', z.object({ id: z.coerce.number().int().positive() })),
    zValidator('json', updateJobAssignmentSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { role } = c.req.valid('json');

      const updated = await db.transaction(async (tx) => {
        const assignment = await tx.query.jobAssignments.findFirst({
          where: (assignment, { eq }) => eq(assignment.id, id),
        });
        if (!assignment) return undefined;

        // Demote before promote, in one transaction: the partial unique index
        // is never transiently violated and the job never has two leads.
        if (role === 'lead') {
          await tx
            .update(jobAssignments)
            .set({ role: 'member' })
            .where(
              and(eq(jobAssignments.jobId, assignment.jobId), eq(jobAssignments.role, 'lead')),
            );
        }

        const [result] = await tx
          .update(jobAssignments)
          .set({ role })
          .where(eq(jobAssignments.id, id))
          .returning();

        return result;
      });

      if (!updated) {
        return c.json({ message: 'Assignment not found' }, 404);
      }

      return c.json({ data: updated }, 200);
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
