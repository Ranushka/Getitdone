import { eq, and, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, authenticatedProcedure } from '../trpc.js'
import { db } from '../db/index.js'
import { jobs, checklistItems, attachments, signOffs } from '@getitdone/db'
import { createJobSchema, addItemSchema, jobIdParamSchema, signOffSchema } from '@getitdone/shared'
import { writeJobPdf } from '../services/pdf/writeJobPdf.js'

async function loadOwnedJob(jobId: number, managerId: number) {
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.managerId, managerId)))
  if (!job) throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' })
  return job
}

export const jobsRouter = router({
  list: authenticatedProcedure.query(async ({ ctx }) => {
    const managerJobs = await db
      .select()
      .from(jobs)
      .where(eq(jobs.managerId, ctx.user.sub))
      .orderBy(desc(jobs.createdAt))

    return Promise.all(
      managerJobs.map(async (job) => {
        const items = await db
          .select()
          .from(checklistItems)
          .where(eq(checklistItems.jobId, job.id))
        return {
          ...job,
          itemCount: items.length,
          doneCount: items.filter((i) => i.status === 'done').length,
        }
      }),
    )
  }),

  get: authenticatedProcedure.input(jobIdParamSchema).query(async ({ input, ctx }) => {
    const job = await loadOwnedJob(input.id, ctx.user.sub)
    const items = await db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.jobId, job.id))
      .orderBy(checklistItems.order, checklistItems.id)

    const itemsWithAttachments = await Promise.all(
      items.map(async (item) => ({
        ...item,
        attachments: await db.select().from(attachments).where(eq(attachments.itemId, item.id)),
      })),
    )

    const jobSignOffs = await db.select().from(signOffs).where(eq(signOffs.jobId, job.id))

    return { ...job, items: itemsWithAttachments, signOffs: jobSignOffs }
  }),

  create: authenticatedProcedure.input(createJobSchema).mutation(async ({ input, ctx }) => {
    const [job] = await db
      .insert(jobs)
      .values({ title: input.title, notes: input.notes, managerId: ctx.user.sub })
      .returning()

    for (const [index, draft] of input.items.entries()) {
      const [item] = await db
        .insert(checklistItems)
        .values({ jobId: job.id, title: draft.title, order: index })
        .returning()

      if (draft.attachmentUrls.length > 0) {
        await db
          .insert(attachments)
          .values(draft.attachmentUrls.map((url) => ({ itemId: item.id, url })))
      }
    }

    return job
  }),

  addItem: authenticatedProcedure.input(addItemSchema).mutation(async ({ input, ctx }) => {
    await loadOwnedJob(input.jobId, ctx.user.sub)
    const [{ maxOrder } = { maxOrder: null }] = await db
      .select({ maxOrder: checklistItems.order })
      .from(checklistItems)
      .where(eq(checklistItems.jobId, input.jobId))
      .orderBy(desc(checklistItems.order))
      .limit(1)

    const [item] = await db
      .insert(checklistItems)
      .values({ jobId: input.jobId, title: input.title, order: (maxOrder ?? -1) + 1 })
      .returning()
    return item
  }),

  signoffManager: authenticatedProcedure
    .input(jobIdParamSchema.merge(signOffSchema))
    .mutation(async ({ input, ctx }) => {
      const job = await loadOwnedJob(input.id, ctx.user.sub)
      if (job.status !== 'tech_signed_off') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Technician must sign off before manager sign-off',
        })
      }

      await db
        .insert(signOffs)
        .values({ jobId: job.id, role: 'manager', name: input.name })
        .onConflictDoUpdate({
          target: [signOffs.jobId, signOffs.role],
          set: { name: input.name, signedAt: new Date() },
        })

      const [updated] = await db
        .update(jobs)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(jobs.id, job.id))
        .returning()
      return updated
    }),

  generatePdf: authenticatedProcedure.input(jobIdParamSchema).mutation(async ({ input, ctx }) => {
    await loadOwnedJob(input.id, ctx.user.sub)
    return writeJobPdf(input.id)
  }),
})
