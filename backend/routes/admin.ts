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

      const created = await db.transaction(async (tx) => {
        const team = await tx.query.jobAssignments.findMany({
          where: (assignment, { eq }) => eq(assignment.jobId, jobId),
        });

        if (team.some((member) => member.userId === userId)) {
          return { conflict: true as const };
        }

        const leading = team.some((member) => member.role === 'lead')
          ? role === 'lead'
          : true;

        // One lead per job is a unique index, so the sitting lead has to step
        // down before the new one is inserted.
        if (leading) {
          await tx
            .update(jobAssignments)
            .set({ role: 'member' })
            .where(and(eq(jobAssignments.jobId, jobId), eq(jobAssignments.role, 'lead')));
        }

        const [result] = await tx
          .insert(jobAssignments)
          .values({ jobId, userId, role: leading ? 'lead' : 'member' })
          .returning();

        return { conflict: false as const, assignment: result };
      });

      if (created.conflict) {
        return c.json({ message: 'Already assigned to this job' }, 409);
      }

      return c.json({ data: created.assignment }, 201);
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
        if (!assignment) return { missing: true as const };

        if (role === 'member' && assignment.role === 'lead') {
          return { needsLead: true as const };
        }

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

        return { assignment: result };
      });

      if ('missing' in updated) {
        return c.json({ message: 'Assignment not found' }, 404);
      }

      if ('needsLead' in updated) {
        return c.json({ message: 'Crown someone else instead — a job needs a team leader' }, 400);
      }

      return c.json({ data: updated.assignment }, 200);
    }
  )

  .delete(
    '/job-assignments/:id',
    zValidator('param', z.object({ id: z.coerce.number().int().positive() })),
    async (c) => {
      const { id } = c.req.valid('param');

      const deleted = await db.transaction(async (tx) => {
        const assignment = await tx.query.jobAssignments.findFirst({
          where: (member, { eq }) => eq(member.id, id),
        });

        // Distinguishes "already gone" from a successful removal, so a stale grid
        // clicking remove twice doesn't look like it worked the second time.
        if (!assignment) return { missing: true as const };

        if (assignment.role === 'lead') {
          const rest = await tx.query.jobAssignments.findMany({
            where: (member, { and, eq, ne }) =>
              and(eq(member.jobId, assignment.jobId), ne(member.id, id)),
            columns: { id: true },
          });
          if (rest.length) return { needsLead: true as const };
        }

        const [result] = await tx
          .delete(jobAssignments)
          .where(eq(jobAssignments.id, id))
          .returning();

        return { assignment: result };
      });

      if ('missing' in deleted) {
        return c.json({ message: 'Assignment not found' }, 404);
      }

      if ('needsLead' in deleted) {
        return c.json({ message: 'Crown someone else before taking the team leader off this job' }, 400);
      }

      return c.json({ data: deleted.assignment }, 200);
    }
  )
