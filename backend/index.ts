import { serve } from '@hono/node-server';
import { Hono, type Context, type Next } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { eq, desc } from 'drizzle-orm';
import * as jose from 'jose';
import 'dotenv/config';

import { db } from './src/db/index.ts';
import { userInNeonAuth } from './src/db/schema.ts';
import { jobsRoute } from './routes/jobs.ts';
import { leaveRequestsRoute } from './routes/leave-requests.ts';

type AppVariables = { userId: string; userRoles: string[] };

const app = new Hono()

const JWKS = jose.createRemoteJWKSet(
  new URL(`${process.env.NEON_AUTH_URL}/.well-known/jwks.json`)
);

const authMiddleware = async (c: Context<{ Variables: AppVariables }>, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.split(' ')[1];

  try {
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: new URL(process.env.NEON_AUTH_URL!).origin,
    });
    if (!payload.sub) {
      return c.json({ error: 'Invalid Token' }, 401);
    }
    // The JWT's own `role` claim is the Postgres/RLS role ("authenticated"),
    // not the admin-plugin role, so look the real role up in neon_auth.user.
    const [user] = await db
      .select({ role: userInNeonAuth.role, banned: userInNeonAuth.banned })
      .from(userInNeonAuth)
      .where(eq(userInNeonAuth.id, payload.sub))
      .limit(1);
    if (!user || user.banned) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    c.set('userId', payload.sub);
    c.set('userRoles', user.role?.split(',') ?? []);
    await next();
  } catch (err) {
    console.error('Verification failed:', err);
    return c.json({ error: 'Invalid Token' }, 401);
  }
};

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
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

const apiRoutes = app.basePath('/api').use(authMiddleware).route("/jobs", jobsRoute).route("/leave-requests", leaveRequestsRoute)

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
