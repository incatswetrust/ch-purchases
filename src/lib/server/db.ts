import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { env } from '$lib/server/env';
import * as schema from '$lib/server/schema';

const globalForDb = globalThis as unknown as {
	pool: Pool | undefined;
};

const pool =
	globalForDb.pool ??
	new Pool({
		connectionString: env.DATABASE_URL
	});

if (!globalForDb.pool) {
	globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });

export type DB = typeof db;
