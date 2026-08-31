import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { jobs, checklistItems, attachments, signOffs } from '@getitdone/db'
import { updateChecklistItemSchema, addAttachmentSchema, signOffSchema } from '@getitdone/shared'

// Technician access has no session/login of its own — the unguessable
// Job.shareToken embedded in the URL is the sole access control, exactly as
// in the original app. Every route re-validates token -> job per request.
async function loadJobByToken(token: string) {
  const [job] = await db.select().from(jobs).where(eq(jobs.shareToken, token))
  return job ?? null
}

export function registerTechnicianRoutes(app: FastifyInstance) {
  app.get('/api/t/:token', async (req, reply) => {
    const { token } = req.params as { token: string }
    const job = await loadJobByToken(token)
    if (!job) return reply.code(404).send({ error: 'Job not found' })

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
    return reply.send({ ...job, items: itemsWithAttachments, signOffs: jobSignOffs })
  })

  app.patch('/api/t/:token/items/:itemId', async (req, reply) => {
    const { token, itemId } = req.params as { token: string; itemId: string }
    const job = await loadJobByToken(token)
    if (!job) return reply.code(404).send({ error: 'Job not found' })

    const parsed = updateChecklistItemSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const id = Number.parseInt(itemId, 10)
    const [existing] = await db
      .select()
      .from(checklistItems)
      .where(and(eq(checklistItems.id, id), eq(checklistItems.jobId, job.id)))
    if (!existing) return reply.code(404).send({ error: 'Item not found' })

    const [updated] = await db
      .update(checklistItems)
      .set({
        ...(parsed.data.comment !== undefined ? { comment: parsed.data.comment } : {}),
        ...(parsed.data.status !== undefined
          ? {
              status: parsed.data.status,
              completedAt: parsed.data.status === 'done' ? new Date() : null,
            }
          : {}),
      })
      .where(eq(checklistItems.id, id))
      .returning()

    return reply.send(updated)
  })

  app.post('/api/t/:token/items/:itemId/attachments', async (req, reply) => {
    const { token, itemId } = req.params as { token: string; itemId: string }
    const job = await loadJobByToken(token)
    if (!job) return reply.code(404).send({ error: 'Job not found' })

    const parsed = addAttachmentSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const id = Number.parseInt(itemId, 10)
    const [existing] = await db
      .select()
      .from(checklistItems)
      .where(and(eq(checklistItems.id, id), eq(checklistItems.jobId, job.id)))
    if (!existing) return reply.code(404).send({ error: 'Item not found' })

    const [attachment] = await db
      .insert(attachments)
      .values({ itemId: id, url: parsed.data.url })
      .returning()
    return reply.send(attachment)
  })

  app.post('/api/t/:token/signoff', async (req, reply) => {
    const { token } = req.params as { token: string }
    const job = await loadJobByToken(token)
    if (!job) return reply.code(404).send({ error: 'Job not found' })

    const parsed = signOffSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() })

    const items = await db.select().from(checklistItems).where(eq(checklistItems.jobId, job.id))
    if (items.length === 0 || items.some((i) => i.status !== 'done')) {
      return reply.code(400).send({ error: 'All checklist items must be done before signing off' })
    }

    await db
      .insert(signOffs)
      .values({ jobId: job.id, role: 'technician', name: parsed.data.name })
      .onConflictDoUpdate({
        target: [signOffs.jobId, signOffs.role],
        set: { name: parsed.data.name, signedAt: new Date() },
      })

    const [updated] = await db
      .update(jobs)
      .set({ status: 'tech_signed_off', updatedAt: new Date() })
      .where(eq(jobs.id, job.id))
      .returning()

    return reply.send(updated)
  })
}
