import pg from 'pg';

const { Pool } = pg;

/**
 * Singleton pg.Pool connecting through Supabase's Transaction Pooler (port 6543).
 *
 * Connection limits:
 *  - max: 10  — well below Supabase free-tier's 60-connection cap
 *  - idleTimeoutMillis: 30 000  — release idle clients after 30 s
 *  - connectionTimeoutMillis: 5 000  — fail fast instead of queuing indefinitely
 *
 * DATABASE_URL must point to the pooler endpoint, e.g.:
 *   postgresql://postgres.xxxx:<password>@aws-0-us-east-1.pooler.supabase.com:6543/postgres
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('pg pool unexpected error:', err.message);
});

/**
 * Closes all pool connections gracefully.
 * Call this on SIGTERM / SIGINT to allow in-flight queries to finish.
 */
export async function closePool() {
  await pool.end();
}

export { pool };
