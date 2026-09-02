import { pgTable, pgEnum, serial, varchar, integer, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

// Drives the scheduling-time validation in @getitdone/shared's scheduling
// helpers: an office site is empty on weekends, a home site is empty during
// the technician's own working hours (the resident is out at their job).
export const addressTypeEnum = pgEnum('address_type', ['home', 'office'])

export const addresses = pgTable('addresses', {
  id: serial('id').primaryKey(),
  managerId: integer('manager_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 100 }).notNull(),
  line1: varchar('line1', { length: 500 }).notNull(),
  type: addressTypeEnum('type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
