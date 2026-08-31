import { pgTable, pgEnum, serial, varchar, integer, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { jobs } from './jobs'

export const signOffRoleEnum = pgEnum('signoff_role', ['technician', 'manager'])

export const signOffs = pgTable(
  'sign_offs',
  {
    id: serial('id').primaryKey(),
    jobId: integer('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    role: signOffRoleEnum('role').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    signedAt: timestamp('signed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One sign-off per role per job — mirrors the upsert-on-conflict pattern
    // used when a technician or manager signs off.
    uniqueIndex('sign_offs_job_role_idx').on(table.jobId, table.role),
  ],
)
