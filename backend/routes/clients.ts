import { Hono } from 'hono';
import { getAuthenticatedDb } from '../src/db/index.ts';
import { clients } from '../src/db/schema.ts';
import { zValidator } from '@hono/zod-validator';
import { createInsertSchema } from 'drizzle-zod';
import type { AppVariables } from '../src/types.ts';

const createClientSchema = createInsertSchema(clients).pick({
  name: true,
});

export const clientsRoute = new Hono<{ Variables: AppVariables }>()
.get('/', async(c) => {
  const userId = c.get('userId');
  const allClients = await getAuthenticatedDb(userId, async (tx) => {
    const result = await tx.select().from(clients);
    return result;
  });

  return c.json({ data: allClients }, 200)
})

.post('/', zValidator('json', createClientSchema), async(c) => {
  const userId = c.get('userId');
  const userRoles = c.get('userRoles');
  if (!userRoles?.includes('admin')) {
    return c.json({ message: "Not Allowed" }, 403);
  }

  const body = c.req.valid('json');

  await getAuthenticatedDb(userId, async (tx) => {
    await tx.insert(clients).values(body);
  });

  return c.json({ message: "Uploaded" }, 201);
})

