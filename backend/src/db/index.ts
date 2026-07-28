import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle(pool);

const authenticatedPool = new Pool({ connectionString: process.env.DATABASE_AUTHENTICATED_BACKEND_URL! });
const authenticatedDb = drizzle(authenticatedPool);

export const getAuthenticatedDb = async <T>(
  userId: string,
  callback: (tx: any) => Promise<T>
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
