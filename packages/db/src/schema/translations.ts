import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core'

// Cache of on-demand LLM translations for user-typed content (job titles,
// notes, checklist comments) — UI chrome strings are handled by the
// frontend's static locale files instead, this table is only for content
// that can't be known ahead of time. Keyed by a hash of (sourceText,
// targetLang) rather than the raw text so long/duplicate text stays a
// cheap unique index.
export const translations = pgTable('translations', {
  id: serial('id').primaryKey(),
  sourceHash: varchar('source_hash', { length: 64 }).notNull().unique(),
  sourceText: text('source_text').notNull(),
  targetLang: varchar('target_lang', { length: 8 }).notNull(),
  translatedText: text('translated_text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
