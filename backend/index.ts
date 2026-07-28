import { serve } from '@hono/node-server';
import { Hono, type Context, type Next } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { eq, desc } from 'drizzle-orm';
import * as jose from 'jose';
import 'dotenv/config';

import { jobsRoute } from './routes/jobs.ts';
import { leaveRequestsRoute } from './routes/leave-requests.ts';

type AppVariables = { userId: string };

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
    c.set('userId', payload.sub);
    await next();
  } catch (err) {
    console.error('Verification failed:', err);
    return c.json({ error: 'Invalid Token' }, 401);
  }
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
