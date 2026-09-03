import { z } from 'zod'

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  // Titles only — a template is just the reusable checklist shape.
  items: z.array(z.string().min(1)).min(1),
})
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>

export const templateIdParamSchema = z.object({
  id: z.number().int().positive(),
})
