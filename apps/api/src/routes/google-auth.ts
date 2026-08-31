import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '@getitdone/db'
import { createState, consumeState, buildAuthUrl, exchangeCodeForProfile } from '../services/google-oauth.js'

// OAuth is redirect-based (302s), which tRPC can't do cleanly — kept as plain
// REST routes, same reasoning GMS uses for its own marketing-platform OAuth callbacks.
export function registerGoogleAuthRoutes(app: FastifyInstance) {
  app.get('/api/auth/google/start', async (_req, reply) => {
    const state = createState()
    return reply.redirect(buildAuthUrl(state))
  })

  app.get('/api/auth/google/callback', async (req, reply) => {
    const webOrigin = (process.env.WEB_ORIGIN ?? 'http://localhost:3658').split(',')[0]
    const { code, state, error } = req.query as { code?: string; state?: string; error?: string }

    if (error) return reply.redirect(`${webOrigin}/login?error=google_denied`)
    if (!code || !state || !consumeState(state)) {
      return reply.redirect(`${webOrigin}/login?error=invalid_state`)
    }

    try {
      const profile = await exchangeCodeForProfile(code)
      const [existing] = await db.select().from(users).where(eq(users.email, profile.email))

      const user =
        existing ??
        (
          await db
            .insert(users)
            .values({ email: profile.email, name: profile.name, image: profile.picture })
            .returning()
        )[0]

      const token = await reply.jwtSign({ sub: user.id }, { expiresIn: '30d' })
      reply.setCookie('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })

      return reply.redirect(`${webOrigin}/dashboard`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      req.log.error({ err: message }, 'Google OAuth callback failed')
      return reply.redirect(`${webOrigin}/login?error=google_failed`)
    }
  })
}
