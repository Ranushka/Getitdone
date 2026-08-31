import { pgTable, pgEnum, serial, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { jobs } from './jobs'

export const itemStatusEnum = pgEnum('item_status', ['pending', 'done'])

export const checklistItems = pgTable('checklist_items', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  comment: text('comment'),
  status: itemStatusEnum('status').notNull().default('pending'),
  order: integer('order').notNull().default(0),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
