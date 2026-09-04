import { z } from 'zod'

export const addressTypeSchema = z.enum(['home', 'office'])

export const createAddressSchema = z.object({
  label: z.string().min(1),
  line1: z.string().min(1),
  type: addressTypeSchema,
})
export type CreateAddressInput = z.infer<typeof createAddressSchema>

export const addressIdParamSchema = z.object({
  id: z.number().int().positive(),
})

export const updateAddressSchema = addressIdParamSchema.extend({
  label: z.string().min(1).optional(),
  line1: z.string().min(1).optional(),
  type: addressTypeSchema.optional(),
})
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>
