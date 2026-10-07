import { Hono } from 'hono';
import { db } from '../src/db/index.ts';
import { leaveRequests } from '../src/db/schema/public.ts';
import { zValidator } from '@hono/zod-validator';
import { createInsertSchema } from 'drizzle-orm/zod';
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

    const userLeaveRequests = await db.query.leaveRequests.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' },
    });

    return c.json({ data: userLeaveRequests }, 200);
  })

  .post('/', zValidator('json', createLeaveRequestSchema), async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    const [newLeaveRequest] = await db
      .insert(leaveRequests)
      .values({ ...body, userId })
      .returning();

    return c.json({ data: newLeaveRequest }, 201);
  })
