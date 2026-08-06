import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../src/db/index.ts';
import { userInNeonAuth } from '../src/db/schema.ts';
import type { AppVariables } from '../src/types.ts';

export const adminRoute = new Hono<{ Variables: AppVariables }>()
.get('/users', async (c) => {
  const users = await db.select().from(userInNeonAuth);

  return c.json({ data: users }, 200);
})

.get(
  '/job-assignments',
  zValidator('query', z.object({ from: z.string(), to: z.string() })),
  async (c) => {
    const { from, to } = c.req.valid('query');

    // Jobs on top so the date window filters the top-level table; assigned users
    // come nested via job_assignments. Overlap semantics: a job appears if any
    // part of its span falls inside [from, to] (date columns are 'yyyy-MM-dd'
    // strings, so lexical comparison is correct).
    const data = await db.query.jobs.findMany({
      where: (jobs, { and, lte, gte }) =>
        and(lte(jobs.startDate, to), gte(jobs.endDate, from)),
      with: {
        jobAssignments: {
          with: {
            userInNeonAuth: { columns: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return c.json({ data }, 200);
  }
)
