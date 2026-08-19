import { Hono } from 'hono';
import { getAuthenticatedDb } from '../src/db/index.ts';
import { locations } from '../src/db/schema.ts';
import { zValidator } from '@hono/zod-validator';
import { createInsertSchema } from 'drizzle-zod';
import type { AppVariables } from '../src/types.ts';

const createLocationSchema = createInsertSchema(locations).pick({
  customerId: true,
  name: true,
  postCode: true,
});

export const locationsRoute = new Hono<{ Variables: AppVariables }>()
  .post('/', zValidator('json', createLocationSchema), async (c) => {
    const userId = c.get('userId');
    const userRoles = c.get('userRoles');
    if (!userRoles?.includes('admin')) {
      return c.json({ message: "Not Allowed" }, 403);
    }

    const body = c.req.valid('json');

    await getAuthenticatedDb(userId, async (tx) => {
      await tx.insert(locations).values(body);
    });

    return c.json({ message: "Uploaded" }, 201);
  })
