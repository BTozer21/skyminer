import { Hono } from 'hono';
import { getAuthenticatedDb } from '../src/db/index.ts';
import { jobs } from '../src/db/schema.ts';
import { zValidator } from '@hono/zod-validator';
import { createInsertSchema } from 'drizzle-zod';
import type { AppVariables } from '../src/types.ts';

const createJobSchema = createInsertSchema(jobs).pick({
  name: true,
  startDate: true,
  endDate: true,
  clientId: true,
});

export const jobsRoute = new Hono<{ Variables: AppVariables }>()
.get('/', async(c) => {
  const userId = c.get('userId');
  const allJobs = await getAuthenticatedDb(userId, async (tx) => {
    const result = await tx.query.jobs.findMany({
      with: { client: true },
    });
    return result;
  });

  return c.json({ data: allJobs, user: userId }, 200)
})

.post('/', zValidator('json', createJobSchema), async(c) => {
  const userId = c.get('userId');
  const userRoles = c.get('userRoles');
  if (!userRoles?.includes('admin')) {
    return c.json({ message: "Not Allowed" }, 403);
  }

  const body = c.req.valid('json');

  const newJob = await getAuthenticatedDb(userId, async (tx) => {
    const result = await tx.insert(jobs).values(body);

    return result;
  });

  return c.json({ message: "Uploaded" }, 201);
})
