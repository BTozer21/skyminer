import { Hono } from 'hono';
import { getAuthenticatedDb } from '../src/db/index.ts';
import { leaveRequests } from '../src/db/schema.ts';
import { zValidator } from '@hono/zod-validator';
import { createInsertSchema } from 'drizzle-zod';
import type { AppVariables } from '../src/types.ts';

const createLeaveRequestSchema = createInsertSchema(leaveRequests)
  .pick({ startDate: true, endDate: true, comment: true })
  .refine((v) => v.startDate <= v.endDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });

export const leaveRequestsRoute = new Hono<{ Variables: AppVariables }>()
  .get('/', async (c) => {
    const userId = c.get('userId');

    const userLeaveRequests = await getAuthenticatedDb(userId, async (tx) => {
      return tx.query.leaveRequests.findMany({
        orderBy: (leave, { asc }) => [asc(leave.startDate)],
      });
    });

    return c.json({ data: userLeaveRequests }, 200);
  })

  .post('/', zValidator('json', createLeaveRequestSchema), async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    const newLeaveRequest = await getAuthenticatedDb(userId, async (tx) => {
      const [result] = await tx
        .insert(leaveRequests)
        .values({ ...body, userId })
        .returning();

      return result;
    });

    return c.json({ data: newLeaveRequest }, 201);
  })
