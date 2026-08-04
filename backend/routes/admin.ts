import { Hono } from 'hono';
import { db } from '../src/db/index.ts';
import { leaveRequests } from '../src/db/schema.ts';

export const adminRoute = new Hono()
.get('/users', async (c) => {

  return c.json({ data: { user: hello }  }, 200);
})
