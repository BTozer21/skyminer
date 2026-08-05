import { Hono } from 'hono';
import { db } from '../src/db/index.ts';
import { userInNeonAuth } from '../src/db/schema.ts';
import type { AppVariables } from '../src/types.ts';

export const adminRoute = new Hono<{ Variables: AppVariables }>()
.get('/users', async (c) => {
  const users = await db.select().from(userInNeonAuth);

  return c.json({ data: users }, 200);
})
