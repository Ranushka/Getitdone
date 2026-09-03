import { eq, and, asc, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, authenticatedProcedure } from '../trpc.js'
import { db } from '../db/index.js'
import { jobTemplates, jobTemplateItems } from '@getitdone/db'
import { createTemplateSchema, templateIdParamSchema } from '@getitdone/shared'

export const templatesRouter = router({
  list: authenticatedProcedure.query(async ({ ctx }) => {
    const templates = await db
      .select()
      .from(jobTemplates)
      .where(eq(jobTemplates.managerId, ctx.user.sub))
      .orderBy(desc(jobTemplates.createdAt))

    return Promise.all(
      templates.map(async (template) => ({
        ...template,
        items: await db
          .select()
          .from(jobTemplateItems)
          .where(eq(jobTemplateItems.templateId, template.id))
          .orderBy(asc(jobTemplateItems.order)),
      })),
    )
  }),

  create: authenticatedProcedure.input(createTemplateSchema).mutation(async ({ input, ctx }) => {
    const [template] = await db
      .insert(jobTemplates)
      .values({ name: input.name, managerId: ctx.user.sub })
      .returning()

    await db
      .insert(jobTemplateItems)
      .values(input.items.map((title, order) => ({ templateId: template.id, title, order })))

    return template
  }),

  delete: authenticatedProcedure.input(templateIdParamSchema).mutation(async ({ input, ctx }) => {
    const [existing] = await db
      .select()
      .from(jobTemplates)
      .where(and(eq(jobTemplates.id, input.id), eq(jobTemplates.managerId, ctx.user.sub)))
    if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found' })

    await db.delete(jobTemplates).where(eq(jobTemplates.id, input.id))
    return { success: true }
  }),
})
