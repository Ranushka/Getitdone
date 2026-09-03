import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'

// GetItDone only ever runs against local disk (no R2/S3 tier like GMS) — the
// uploads volume is mounted straight into the container, same as before.
const EXT_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'application/pdf': '.pdf',
  'text/csv': '.csv',
}

function buildKey(prefix: string, mimetype: string): string {
  const ext = EXT_MAP[mimetype] ?? '.bin'
  return `${prefix}-${crypto.randomUUID()}${ext}`
}

export function getUploadsDir(): string {
  return path.resolve(process.env.UPLOADS_DIR ?? './uploads')
}

export async function saveFile(
  prefix: string,
  mimetype: string,
  data: Buffer | NodeJS.ReadableStream,
): Promise<string> {
  const uploadsDir = getUploadsDir()
  const key = buildKey(prefix, mimetype)
  const filePath = path.join(uploadsDir, key)
  await mkdir(path.dirname(filePath), { recursive: true })

  if (Buffer.isBuffer(data)) {
    await writeFile(filePath, data)
  } else {
    await new Promise<void>((resolve, reject) => {
      const out = fs.createWriteStream(filePath)
      data.pipe(out)
      out.on('finish', resolve)
      out.on('error', reject)
    })
  }

  return `/uploads/${key}`
}
