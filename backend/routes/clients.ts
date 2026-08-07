import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getAuthenticatedDb } from '../src/db/index.ts';
import { clients, jobs } from '../src/db/schema.ts';
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

.delete('/:id', zValidator('param', z.object({ id: z.coerce.number().int().positive() })), async(c) => {
  const userId = c.get('userId');
  const userRoles = c.get('userRoles');
  if (!userRoles?.includes('admin')) {
    return c.json({ message: "Not Allowed" }, 403);
  }

  const { id } = c.req.valid('param');

  const result = await getAuthenticatedDb(userId, async (tx) => {
    // jobs.client_id doesn't cascade, and shouldn't: taking a client out
    // would silently take its jobs and everyone scheduled on them. Say so
    // instead and let the admin clear the jobs first.
    const [job] = await tx
      .select({ id: jobs.id })
      .from(jobs)
      .where(eq(jobs.clientId, id))
      .limit(1);
    if (job) return { blocked: true as const };

    const [deleted] = await tx.delete(clients).where(eq(clients.id, id)).returning();

    return { blocked: false as const, deleted };
  });

  if (result.blocked) {
    return c.json({ message: "This client still has jobs" }, 409);
  }

  // RLS makes a client someone can't touch look identical to one that isn't
  // there; both are a 404 as far as the caller is concerned.
  if (!result.deleted) {
    return c.json({ message: "Client not found" }, 404);
  }

  return c.json({ data: result.deleted }, 200);
})

