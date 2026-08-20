import { Hono } from 'hono';
import { getAuthenticatedDb } from '../src/db/index.ts';
import { locations, machines } from '../src/db/schema.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createInsertSchema } from 'drizzle-zod';
import type { AppVariables } from '../src/types.ts';

const createLocationSchema = createInsertSchema(locations).pick({
  customerId: true,
  name: true,
  postCode: true,
});

const createMachineSchema = createInsertSchema(machines).pick({
  name: true,
  type: true,
  locationId: true,
});

export const locationsRoute = new Hono<{ Variables: AppVariables }>()
  .get('/', async (c) => {
    const userId = c.get('userId');
    const allLocations = await getAuthenticatedDb(userId, async (tx) => {
      const result = await tx.query.locations.findMany({
        with: {
          customer: {
            columns: {
              id: true,
              name: true,
            }
          }
        },
      });
      return result;
    });

    return c.json({ data: allLocations }, 200)
  })
  .get('/:id', zValidator('param', z.object({ id: z.coerce.number().int().positive() })), async (c) => {
    const userId = c.get('userId');
    const { id } = c.req.valid('param');

    const location = await getAuthenticatedDb(userId, async (tx) => {
      const result = await tx.query.locations.findFirst({
        where: (locations, { eq }) => eq(locations.id, id),
        with: { machines: true, },
      });
      return result;
    });

    // RLS makes a job someone can't touch look identical to one that isn't
    // there; both are a 404 as far as the caller is concerned.
    if (!location) {
      return c.json({ message: "Location not found" }, 404);
    }

    return c.json({ data: location }, 200);
  })
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
  .post('/machine', zValidator('json', createMachineSchema), async (c) => {
    const userId = c.get('userId');
    const userRoles = c.get('userRoles');
    if (!userRoles?.includes('admin')) {
      return c.json({ message: "Not Allowed" }, 403);
    }

    const body = c.req.valid('json');

    await getAuthenticatedDb(userId, async (tx) => {
      await tx.insert(machines).values(body);
    });

    return c.json({ message: "Uploaded" }, 201);
  })
