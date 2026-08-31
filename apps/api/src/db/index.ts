import '../lib/load-env.js'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { schema } from '@getitdone/db'

export const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? 'postgresql://getitdone:getitdone@localhost:5433/getitdone',
})

export const db = drizzle(pool, { schema })
export type DB = typeof db
