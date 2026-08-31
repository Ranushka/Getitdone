import { z } from 'zod'

export const jobItemDraftSchema = z.object({
  title: z.string().min(1),
  attachmentUrls: z.array(z.string()).default([]),
})

export const createJobSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  // Flat AED price for the whole job — jobs are the pricing unit, not
  // individual checklist items (categorize different scopes of work into
  // separate jobs instead).
  price: z.number().nonnegative().optional(),
  // E.164-ish, digits/plus only — used to open a WhatsApp chat with this
  // technician directly instead of a blank compose screen.
  technicianPhone: z.string().min(6).max(20).optional(),
  items: z.array(jobItemDraftSchema).default([]),
})
export type CreateJobInput = z.infer<typeof createJobSchema>

export const jobIdParamSchema = z.object({
  id: z.number().int().positive(),
})

export const updateJobDetailsSchema = jobIdParamSchema.extend({
  price: z.number().nonnegative().nullable().optional(),
  technicianPhone: z.string().min(6).max(20).nullable().optional(),
})
export type UpdateJobDetailsInput = z.infer<typeof updateJobDetailsSchema>

export const addItemSchema = z.object({
  jobId: z.number().int().positive(),
  title: z.string().min(1),
})
export type AddItemInput = z.infer<typeof addItemSchema>

export const signOffSchema = z.object({
  name: z.string().min(1),
})
export type SignOffInput = z.infer<typeof signOffSchema>

// ── Technician-side (token-scoped, no auth) ────────────────────────────────
export const updateChecklistItemSchema = z.object({
  comment: z.string().optional(),
  status: z.enum(['pending', 'done']).optional(),
})
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>

export const addAttachmentSchema = z.object({
  url: z.string().min(1),
})
export type AddAttachmentInput = z.infer<typeof addAttachmentSchema>
