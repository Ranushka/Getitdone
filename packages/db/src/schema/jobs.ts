import { pgTable, pgEnum, serial, varchar, text, integer, numeric, timestamp, boolean } from 'drizzle-orm/pg-core'
import { customAlphabet } from 'nanoid'
import { users } from './users'
import { addresses } from './addresses'

export const jobStatusEnum = pgEnum('job_status', ['in_progress', 'tech_signed_off', 'completed'])

// Short, spoken/typed-friendly share code — excludes characters that are
// easy to mix up when read aloud or handwritten (I, L, O, 0, 1). 6 chars
// from this 31-symbol alphabet is ~30 bits of entropy, far weaker than a
// full nanoid, so the technician lookup route rate-limits guessing
// (see apps/api/src/routes/technician.ts) to keep brute-forcing impractical.
const SHARE_TOKEN_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const generateShareToken = customAlphabet(SHARE_TOKEN_ALPHABET, 6)

export const jobs = pgTable('jobs', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  notes: text('notes'),
  // Optional — lets the share-link's WhatsApp button open a chat with this
  // technician directly instead of a blank "pick a contact" compose screen.
  technicianPhone: varchar('technician_phone', { length: 32 }),
  // Flat AED price for the whole job — the manager categorizes work into
  // separate jobs (e.g. "plumbing" vs "cleaning") rather than pricing
  // individual checklist items within one job.
  price: numeric('price', { precision: 10, scale: 2 }),
  // Flags this job as requiring tools/parts to be brought along — surfaced
  // to the manager at creation and to the technician on the share page, so
  // it's not something either party has to remember from the notes field.
  needsToolsAndParts: boolean('needs_tools_and_parts').notNull().default(false),
  // Sole access control for the technician's share link (/t/:token) — see
  // the alphabet comment above for the entropy/rate-limit tradeoff.
  shareToken: varchar('share_token', { length: 24 })
    .notNull()
    .unique()
    .$defaultFn(() => generateShareToken()),
  status: jobStatusEnum('status').notNull().default('in_progress'),
  managerId: integer('manager_id')
    .notNull()
    .references(() => users.id),
  // Both set at job creation only (see NewJobPage) — chosen from the
  // manager's saved address book, or a new one added on the fly. Nullable
  // since neither existed before this and older jobs won't have them.
  addressId: integer('address_id').references(() => addresses.id),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
