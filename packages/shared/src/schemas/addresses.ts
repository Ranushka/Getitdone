import { z } from 'zod'

export const addressTypeSchema = z.enum(['home', 'office'])

export const createAddressSchema = z.object({
  label: z.string().min(1),
  line1: z.string().min(1),
  type: addressTypeSchema,
})
export type CreateAddressInput = z.infer<typeof createAddressSchema>
