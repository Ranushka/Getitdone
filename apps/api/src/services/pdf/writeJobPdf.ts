import { eq, asc } from 'drizzle-orm'
import path from 'node:path'
import fs from 'node:fs/promises'
import React from 'react'
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer'
import { db } from '../../db/index.js'
import { jobs, checklistItems, attachments, signOffs } from '@getitdone/db'
import { JobPdf, type JobPdfData } from './JobPdf.js'
import { getUploadsDir, saveFile } from '../storage.js'

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic'])
const IMAGE_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
}

async function toDataUri(url: string): Promise<string | null> {
  if (!url.startsWith('/uploads/')) return null
  const ext = path.extname(url).toLowerCase()
  if (!IMAGE_EXT.has(ext)) return null
  try {
    const filePath = path.join(getUploadsDir(), url.slice('/uploads/'.length))
    const buffer = await fs.readFile(filePath)
    return `data:${IMAGE_MIME[ext]};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

export async function writeJobPdf(jobId: number): Promise<{ pdfUrl: string }> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId))
  if (!job) throw new Error('Job not found')

  const items = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.jobId, jobId))
    .orderBy(asc(checklistItems.order), asc(checklistItems.id))

  const signOffRows = await db.select().from(signOffs).where(eq(signOffs.jobId, jobId))

  const pdfItems = await Promise.all(
    items.map(async (item) => {
      const itemAttachments = await db
        .select()
        .from(attachments)
        .where(eq(attachments.itemId, item.id))

      const imageDataUris: string[] = []
      let videoCount = 0
      for (const a of itemAttachments) {
        const dataUri = await toDataUri(a.url)
        if (dataUri) imageDataUris.push(dataUri)
        else videoCount++
      }

      return {
        title: item.title,
        comment: item.comment,
        status: item.status,
        imageDataUris,
        videoCount,
      }
    }),
  )

  const signOffsForPdf = await Promise.all(
    signOffRows.map(async (s) => ({
      role: s.role,
      name: s.name,
      signedAt: s.signedAt,
      signatureDataUri: s.signatureUrl ? await toDataUri(s.signatureUrl) : null,
    })),
  )

  const data: JobPdfData = {
    title: job.title,
    notes: job.notes,
    status: job.status,
    price: job.price,
    items: pdfItems,
    signOffs: signOffsForPdf,
    generatedAt: new Date(),
  }

  const buffer = await renderToBuffer(React.createElement(JobPdf, { data }) as React.ReactElement<DocumentProps>)
  const pdfUrl = await saveFile(`job-${jobId}-report`, 'application/pdf', buffer)
  return { pdfUrl }
}
