import { z } from 'zod'

export const jobItemDraftSchema = z.object({
  title: z.string().min(1),
  attachmentUrls: z.array(z.string()).default([]),
})

export const createJobSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(jobItemDraftSchema).default([]),
})
export type CreateJobInput = z.infer<typeof createJobSchema>

export const addItemSchema = z.object({
  jobId: z.number().int().positive(),
  title: z.string().min(1),
})
export type AddItemInput = z.infer<typeof addItemSchema>

export const jobIdParamSchema = z.object({
  id: z.number().int().positive(),
})

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
