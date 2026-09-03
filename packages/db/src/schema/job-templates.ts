import { pgTable, serial, varchar, integer, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

// A saved checklist a manager can reuse across jobs (e.g. "AC service")
// instead of retyping the same items every time. Titles only — no
// attachments/comments/status, those only make sense once a job exists.
export const jobTemplates = pgTable('job_templates', {
  id: serial('id').primaryKey(),
  managerId: integer('manager_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const jobTemplateItems = pgTable('job_template_items', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id')
    .notNull()
    .references(() => jobTemplates.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  order: integer('order').notNull().default(0),
})
