import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

// ── table + enum re-exports ────────────────────────────────────────────────
export * from './schema/users.js'
export * from './schema/jobs.js'
export * from './schema/checklist-items.js'
export * from './schema/attachments.js'
export * from './schema/sign-offs.js'
export * from './schema/translations.js'

// ── combined schema object (pass to drizzle()) ────────────────────────────
import * as usersSchema from './schema/users.js'
import * as jobsSchema from './schema/jobs.js'
import * as checklistItemsSchema from './schema/checklist-items.js'
import * as attachmentsSchema from './schema/attachments.js'
import * as signOffsSchema from './schema/sign-offs.js'
import * as translationsSchema from './schema/translations.js'

export const schema = {
  ...usersSchema,
  ...jobsSchema,
  ...checklistItemsSchema,
  ...attachmentsSchema,
  ...signOffsSchema,
  ...translationsSchema,
}

// ── drizzle-zod generated schemas ─────────────────────────────────────────
export const insertUserSchema = createInsertSchema(usersSchema.users)
export const selectUserSchema = createSelectSchema(usersSchema.users)

export const insertJobSchema = createInsertSchema(jobsSchema.jobs)
export const selectJobSchema = createSelectSchema(jobsSchema.jobs)

export const insertChecklistItemSchema = createInsertSchema(checklistItemsSchema.checklistItems)
export const selectChecklistItemSchema = createSelectSchema(checklistItemsSchema.checklistItems)

export const insertAttachmentSchema = createInsertSchema(attachmentsSchema.attachments)
export const selectAttachmentSchema = createSelectSchema(attachmentsSchema.attachments)

export const insertSignOffSchema = createInsertSchema(signOffsSchema.signOffs)
export const selectSignOffSchema = createSelectSchema(signOffsSchema.signOffs)

export const insertTranslationSchema = createInsertSchema(translationsSchema.translations)
export const selectTranslationSchema = createSelectSchema(translationsSchema.translations)
