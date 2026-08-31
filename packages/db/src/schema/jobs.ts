import { pgTable, pgEnum, serial, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { nanoid } from 'nanoid'
import { users } from './users'

export const jobStatusEnum = pgEnum('job_status', ['in_progress', 'tech_signed_off', 'completed'])

export const jobs = pgTable('jobs', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  notes: text('notes'),
  // Unguessable token embedded in the technician's share link (/t/:token) — the
  // sole access control for that flow, so it must stay random, not sequential.
  shareToken: varchar('share_token', { length: 24 })
    .notNull()
    .unique()
    .$defaultFn(() => nanoid()),
  status: jobStatusEnum('status').notNull().default('in_progress'),
  managerId: integer('manager_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
