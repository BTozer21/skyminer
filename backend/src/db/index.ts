import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import * as schema from './schema.ts';
import * as relations from './relations.ts';

// Passing schema + relations is what powers the relational query API (db.query.*).
// It's additive: existing db.select()/transaction() calls are unaffected.
const fullSchema = { ...schema, ...relations };

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle(pool, { schema: fullSchema });

const authenticatedPool = new Pool({ connectionString: process.env.DATABASE_AUTHENTICATED_BACKEND_URL! });
const authenticatedDb = drizzle(authenticatedPool, { schema: fullSchema });

// the tx type drizzle hands to transaction(), derived so we don't hand-write its generics
type Tx = Parameters<Parameters<typeof authenticatedDb.transaction>[0]>[0];

export const getAuthenticatedDb = async <T>(
  userId: string,
  callback: (tx: Tx) => Promise<T>
): Promise<T> => {
  const claims = JSON.stringify({ sub: userId });
  return authenticatedDb.transaction(async (tx) => {
    const configResult = await tx.execute(
      sql`select set_config('request.jwt.claims', ${claims}, true)`
    );
    const verifyResult = await tx.execute(
      sql`select current_setting('request.jwt.claims', true) as claims`
    );
    return callback(tx);
  });
};
