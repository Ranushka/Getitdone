import '@fastify/jwt'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { JwtPayload } from '@getitdone/shared'

declare module 'fastify' {
  interface FastifyRequest {
    authUser: JwtPayload | null
  }
}

async function readJwtPayload(req: FastifyRequest): Promise<JwtPayload | null> {
  try {
    const payload = await req.jwtVerify<JwtPayload>()
    req.authUser = payload
    return payload
  } catch {
    req.authUser = null
    return null
  }
}

export async function verifyJWT(req: FastifyRequest) {
  const payload = await req.jwtVerify<JwtPayload>()
  req.authUser = payload
}

// GetItDone has a single manager actor type — no role tiers — so the only
// REST preHandler needed is "must be logged in", unlike GMS's requireRole(...roles).
export function requireAuth() {
  return async function enforceAuth(req: FastifyRequest, reply: FastifyReply) {
    const payload = req.authUser ?? (await readJwtPayload(req))
    if (!payload) {
      return reply.status(401).send({ error: 'Authentication required' })
    }
  }
}

export async function buildContext(req: FastifyRequest, reply: FastifyReply) {
  const user = req.authUser ?? (await readJwtPayload(req))
  return { user, reply }
}

export type Context = Awaited<ReturnType<typeof buildContext>>
