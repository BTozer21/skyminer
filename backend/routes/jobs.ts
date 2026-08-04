import { Hono } from 'hono';
import { getAuthenticatedDb } from '../src/db/index.ts';
import { jobs } from '../src/db/schema.ts';

export const jobsRoute = new Hono()
.get('/', async(c) => {
  const userId = c.get('userId');
  const allJobs = await getAuthenticatedDb(userId, async (tx) => {
    const result = await tx.select().from(jobs);
    return result;
  });

  return c.json({ data: allJobs, user: userId }, 200)
})

.post('/', async(c) => {
  const userId = c.get('userId');
  const userRoles = c.get('userRoles');
  if (!userRoles?.includes('admin')) {
    return c.json({ message: "Not Allowed" }, 403);
  }

  const body: typeof jobs.$inferInsert = await c.req.json();

  const newJob = await getAuthenticatedDb(userId, async (tx) => {
    const result = await tx.insert(jobs).values(body);

    return result;
  });

  return c.json({ message: "Uploaded" }, 201);
})
