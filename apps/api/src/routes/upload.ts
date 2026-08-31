import type { FastifyInstance } from 'fastify'
import { saveFile } from '../services/storage.js'

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
const VIDEO_MIME = new Set(['video/mp4', 'video/quicktime', 'video/webm'])
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_VIDEO_BYTES = 100 * 1024 * 1024

export function registerUploadRoutes(app: FastifyInstance) {
  // Public — matches the original app's design (no auth on /api/upload itself;
  // the returned URL only becomes reachable data once attached to a job/item
  // via an authenticated or token-scoped follow-up call).
  app.post('/api/upload', async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file uploaded' })

    const isImage = IMAGE_MIME.has(data.mimetype)
    const isVideo = VIDEO_MIME.has(data.mimetype)
    if (!isImage && !isVideo) {
      return reply.code(400).send({ error: 'File type not allowed' })
    }
    const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES

    const chunks: Buffer[] = []
    let total = 0
    let tooLarge = false
    for await (const chunk of data.file as AsyncIterable<Buffer>) {
      total += chunk.length
      if (total > maxBytes) {
        tooLarge = true
        break
      }
      chunks.push(chunk)
    }
    if (tooLarge || data.file.truncated) {
      return reply.code(413).send({
        error: `File too large — max ${Math.round(maxBytes / 1024 / 1024)}MB for ${isImage ? 'images' : 'videos'}`,
      })
    }

    const url = await saveFile('upload', data.mimetype, Buffer.concat(chunks))
    return reply.send({ url })
  })
}
