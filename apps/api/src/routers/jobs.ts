import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, authenticatedProcedure } from '../trpc.js'
import { db } from '../db/index.js'
import { jobs, checklistItems, attachments, signOffs, addresses } from '@getitdone/db'
import {
  createJobSchema,
  addItemSchema,
  jobIdParamSchema,
  signOffSchema,
  updateJobDetailsSchema,
  exportJobsCsvSchema,
  isValidScheduleForAddressType,
} from '@getitdone/shared'
import { writeJobPdf } from '../services/pdf/writeJobPdf.js'
import { saveFile } from '../services/storage.js'

async function loadOwnedJob(jobId: number, managerId: number) {
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.managerId, managerId)))
  if (!job) throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' })
  return job
}

// Minimal RFC 4180 quoting — wrap in quotes and escape embedded quotes
// whenever a field could otherwise break the column boundary.
function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
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
    const address = job.addressId
      ? (await db.select().from(addresses).where(eq(addresses.id, job.addressId)))[0]
      : null
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

    return { ...job, address, items: itemsWithAttachments, signOffs: jobSignOffs }
  }),

  create: authenticatedProcedure.input(createJobSchema).mutation(async ({ input, ctx }) => {
    // Resolve the address: either a saved one the manager already owns, or
    // a new one added inline (saved to their address book for next time).
    let addressId: number | undefined
    let addressType: 'home' | 'office' | undefined
    if (input.addressId) {
      const [existing] = await db
        .select()
        .from(addresses)
        .where(and(eq(addresses.id, input.addressId), eq(addresses.managerId, ctx.user.sub)))
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Address not found' })
      addressId = existing.id
      addressType = existing.type
    } else if (input.newAddress) {
      const [created] = await db
        .insert(addresses)
        .values({ ...input.newAddress, managerId: ctx.user.sub })
        .returning()
      addressId = created.id
      addressType = created.type
    }

    if (input.scheduledAt && addressType && !isValidScheduleForAddressType(addressType, new Date(input.scheduledAt))) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message:
          'Offices are closed on weekends and homes are empty during working hours (9am-6pm) — pick a different time',
      })
    }

    const [job] = await db
      .insert(jobs)
      .values({
        title: input.title,
        notes: input.notes,
        price: input.price !== undefined ? String(input.price) : undefined,
        technicianPhone: input.technicianPhone,
        needsToolsAndParts: input.needsToolsAndParts,
        managerId: ctx.user.sub,
        addressId,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
      })
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

  updateDetails: authenticatedProcedure.input(updateJobDetailsSchema).mutation(async ({ input, ctx }) => {
    await loadOwnedJob(input.id, ctx.user.sub)
    const [updated] = await db
      .update(jobs)
      .set({
        ...(input.price !== undefined ? { price: input.price === null ? null : String(input.price) } : {}),
        ...(input.technicianPhone !== undefined ? { technicianPhone: input.technicianPhone } : {}),
        ...(input.needsToolsAndParts !== undefined ? { needsToolsAndParts: input.needsToolsAndParts } : {}),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, input.id))
      .returning()
    return updated
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

  exportCsv: authenticatedProcedure.input(exportJobsCsvSchema).mutation(async ({ input, ctx }) => {
    const conditions = [eq(jobs.managerId, ctx.user.sub)]
    if (input.from) conditions.push(gte(jobs.createdAt, new Date(input.from)))
    if (input.to) conditions.push(lte(jobs.createdAt, new Date(input.to)))

    const rows = await db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.createdAt))

    const header = ['Title', 'Status', 'Price (AED)', 'Technician Phone', 'Scheduled At', 'Created At']
    const lines = [header.join(',')]
    for (const job of rows) {
      lines.push(
        [
          csvField(job.title),
          job.status,
          job.price ?? '',
          job.technicianPhone ?? '',
          job.scheduledAt?.toISOString() ?? '',
          job.createdAt.toISOString(),
        ]
          .map(String)
          .map(csvField)
          .join(','),
      )
    }

    const csvUrl = await saveFile('jobs-report', 'text/csv', Buffer.from(lines.join('\n'), 'utf-8'))
    return { csvUrl }
  }),
})
