import { serve } from '@hono/node-server';
import { Hono, type Context, type Next } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import 'dotenv/config';

import { auth, frontendURL } from './lib/auth.ts';
import { sessionMiddleware } from './lib/middleware/session.ts';
import { mcpRoute } from './src/mcp/server.ts';
import { jobsRoute } from './routes/jobs.ts';
import { customersRoute } from './routes/customers.ts';
import { leaveRequestsRoute } from './routes/leave-requests.ts';
import { adminRoute } from './routes/admin.ts';
import type { AppVariables } from './src/types.ts';

const app = new Hono()

const adminOnly = async (c: Context<{ Variables: AppVariables }>, next: Next) => {
  if (!c.get('userRoles')?.includes('admin')) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
};

app.use(logger());
app.use(
  '/*',
  cors({
    origin: frontendURL,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  })
);

app.all('/api/auth/*', (c) => auth.handler(c.req.raw));
app.all('/.well-known/*', (c) => auth.handler(c.req.raw));
app.route('/mcp', mcpRoute);

const apiRoutes = app.basePath('/api').use(sessionMiddleware).use('/admin/*', adminOnly).route("/admin", adminRoute).route("/jobs", jobsRoute).route("/customers", customersRoute).route("/leave-requests", leaveRequestsRoute)

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Backend server running at http://localhost:${info.port}`)
  }
)

export type ApiRoutes = typeof apiRoutes
