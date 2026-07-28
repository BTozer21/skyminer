import { Hono } from 'hono';
import { getAuthenticatedDb } from '../src/db/index.ts';
import { leaveRequests } from '../src/db/schema.ts';

export const leaveRequestsRoute = new Hono()
.get('/', async (c) => {
  const userId = c.get('userId');

  const userLeaveRequests = await getAuthenticatedDb(userId, async (tx) => {
    return tx.select().from(leaveRequests);
  });

  return c.json({ data: userLeaveRequests }, 200);
})
