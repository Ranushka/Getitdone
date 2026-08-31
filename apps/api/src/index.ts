import './lib/load-env.js'
import Fastify from 'fastify'
import type { FastifyReply, FastifyRequest } from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyJwt from '@fastify/jwt'
import fastifyMultipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import fastifyCors from '@fastify/cors'
import fastifyRateLimit from '@fastify/rate-limit'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import path from 'path'
import { appRouter } from './routers/index.js'
import { buildContext } from './middleware/auth.js'
import { registerTechnicianRoutes } from './routes/technician.js'
import { registerUploadRoutes } from './routes/upload.js'
import { registerGoogleAuthRoutes } from './routes/google-auth.js'

const app = Fastify({ logger: process.env.NODE_ENV !== 'production', maxParamLength: 1000 })

app.decorateRequest('authUser', null)

const webOrigins = (process.env.WEB_ORIGIN ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
await app.register(fastifyCors, {
  origin: process.env.NODE_ENV === 'production' ? webOrigins : ['http://localhost:3658'],
  credentials: true,
})

await app.register(fastifyCookie)

await app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  cookie: { cookieName: 'auth_token', signed: false },
})

await app.register(fastifyMultipart, {
  limits: { fileSize: 100 * 1024 * 1024 },
})

const uploadsDir = path.resolve(process.env.UPLOADS_DIR ?? './uploads')
await app.register(fastifyStatic, {
  root: uploadsDir,
  prefix: '/uploads/',
  decorateReply: false,
})

await app.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: {
    router: appRouter,
    createContext: ({ req, res }: { req: FastifyRequest; res: FastifyReply }) => buildContext(req, res),
  },
})

app.get('/health', async () => ({ status: 'ok' }))

// Scoped rate limit — the technician share-token is a short, guessable-ish
// code (see packages/db/src/schema/jobs.ts), so this route group throttles
// per-IP lookups to make brute-forcing valid tokens impractical without
// getting in the way of a real technician's normal usage.
await app.register(async (scope) => {
  await scope.register(fastifyRateLimit, { max: 60, timeWindow: '1 minute' })
  registerTechnicianRoutes(scope)
})
registerUploadRoutes(app)
registerGoogleAuthRoutes(app)

const port = Number(process.env.PORT ?? 3659)
await app.listen({ port, host: '0.0.0.0' })
console.warn(`GetItDone API running on http://localhost:${port}`)
