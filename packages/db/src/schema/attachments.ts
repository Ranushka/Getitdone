import { pgTable, serial, varchar, integer, timestamp } from 'drizzle-orm/pg-core'
import { checklistItems } from './checklist-items'

export const attachments = pgTable('attachments', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id')
    .notNull()
    .references(() => checklistItems.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 500 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
