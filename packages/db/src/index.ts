import { createInsertSchema, createSelectSchema } from 'drizzle-zod'

// ── table + enum re-exports ────────────────────────────────────────────────
export * from './schema/users.js'
export * from './schema/addresses.js'
export * from './schema/jobs.js'
export * from './schema/checklist-items.js'
export * from './schema/attachments.js'
export * from './schema/sign-offs.js'
export * from './schema/translations.js'
export * from './schema/job-templates.js'

// ── combined schema object (pass to drizzle()) ────────────────────────────
import * as usersSchema from './schema/users.js'
import * as addressesSchema from './schema/addresses.js'
import * as jobsSchema from './schema/jobs.js'
import * as checklistItemsSchema from './schema/checklist-items.js'
import * as attachmentsSchema from './schema/attachments.js'
import * as signOffsSchema from './schema/sign-offs.js'
import * as translationsSchema from './schema/translations.js'
import * as jobTemplatesSchema from './schema/job-templates.js'

export const schema = {
  ...usersSchema,
  ...addressesSchema,
  ...jobsSchema,
  ...checklistItemsSchema,
  ...attachmentsSchema,
  ...signOffsSchema,
  ...translationsSchema,
  ...jobTemplatesSchema,
}

// ── drizzle-zod generated schemas ─────────────────────────────────────────
export const insertUserSchema = createInsertSchema(usersSchema.users)
export const selectUserSchema = createSelectSchema(usersSchema.users)

export const insertAddressSchema = createInsertSchema(addressesSchema.addresses)
export const selectAddressSchema = createSelectSchema(addressesSchema.addresses)

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

export const insertJobTemplateSchema = createInsertSchema(jobTemplatesSchema.jobTemplates)
export const selectJobTemplateSchema = createSelectSchema(jobTemplatesSchema.jobTemplates)

export const insertJobTemplateItemSchema = createInsertSchema(jobTemplatesSchema.jobTemplateItems)
export const selectJobTemplateItemSchema = createSelectSchema(jobTemplatesSchema.jobTemplateItems)
