import { z } from 'zod'
import { createAddressSchema } from './addresses'
import { isValidScheduleForAddressType } from '../scheduling'

export const jobItemDraftSchema = z.object({
  title: z.string().min(1),
  attachmentUrls: z.array(z.string()).default([]),
})

export const createJobSchema = z
  .object({
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
    // Address book — set at creation only. Either pick a saved address
    // (addressId) or add a new one on the fly (newAddress), never both.
    addressId: z.number().int().positive().optional(),
    newAddress: createAddressSchema.optional(),
    // ISO datetime string — validated below against the resolved address's
    // type (an office is closed weekends, a home is empty during work
    // hours). Optional: a job can be created without a scheduled visit.
    scheduledAt: z.string().datetime().optional(),
  })
  .refine((data) => !(data.addressId && data.newAddress), {
    message: 'Choose a saved address or add a new one, not both',
    path: ['newAddress'],
  })
  .refine(
    (data) => {
      if (!data.scheduledAt || !data.newAddress) return true
      return isValidScheduleForAddressType(data.newAddress.type, new Date(data.scheduledAt))
    },
    {
      message:
        'Offices are closed on weekends and homes are empty during working hours (9am-6pm) — pick a different time',
      path: ['scheduledAt'],
    },
  )
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
  // Set by the technician-side signature pad; managers still sign off with
  // just a name for now.
  signatureUrl: z.string().min(1).optional(),
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
