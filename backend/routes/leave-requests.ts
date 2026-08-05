import { Hono } from 'hono';
import { getAuthenticatedDb } from '../src/db/index.ts';
import { leaveRequests } from '../src/db/schema.ts';
import type { AppVariables } from '../src/types.ts';

export const leaveRequestsRoute = new Hono<{ Variables: AppVariables }>()
.get('/', async (c) => {
  const userId = c.get('userId');

  const userLeaveRequests = await getAuthenticatedDb(userId, async (tx) => {
    return tx.select().from(leaveRequests);
  });

  return c.json({ data: userLeaveRequests }, 200);
})
