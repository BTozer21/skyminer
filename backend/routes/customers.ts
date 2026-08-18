import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getAuthenticatedDb } from '../src/db/index.ts';
import { customers, jobs } from '../src/db/schema.ts';
import { zValidator } from '@hono/zod-validator';
import { createInsertSchema } from 'drizzle-zod';
import type { AppVariables } from '../src/types.ts';

const createCustomerSchema = createInsertSchema(customers).pick({
  name: true,
});

export const customersRoute = new Hono<{ Variables: AppVariables }>()
.get('/', async(c) => {
  const userId = c.get('userId');
  const allCustomers = await getAuthenticatedDb(userId, async (tx) => {
    const result = await tx.select().from(customers);
    return result;
  });

  return c.json({ data: allCustomers }, 200)
})

.post('/', zValidator('json', createCustomerSchema), async(c) => {
  const userId = c.get('userId');
  const userRoles = c.get('userRoles');
  if (!userRoles?.includes('admin')) {
    return c.json({ message: "Not Allowed" }, 403);
  }

  const body = c.req.valid('json');

  await getAuthenticatedDb(userId, async (tx) => {
    await tx.insert(customers).values(body);
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
    // jobs.customer_id doesn't cascade, and shouldn't: taking a customer out
    // would silently take its jobs and everyone scheduled on them. Say so
    // instead and let the admin clear the jobs first.
    const [job] = await tx
      .select({ id: jobs.id })
      .from(jobs)
      .where(eq(jobs.customerId, id))
      .limit(1);
    if (job) return { blocked: true as const };

    const [deleted] = await tx.delete(customers).where(eq(customers.id, id)).returning();

    return { blocked: false as const, deleted };
  });

  if (result.blocked) {
    return c.json({ message: "This customer still has jobs" }, 409);
  }

  // RLS makes a customer someone can't touch look identical to one that isn't
  // there; both are a 404 as far as the caller is concerned.
  if (!result.deleted) {
    return c.json({ message: "Customer not found" }, 404);
  }

  return c.json({ data: result.deleted }, 200);
})

