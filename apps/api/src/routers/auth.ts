import '@fastify/cookie'
import '@fastify/jwt'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, authenticatedProcedure } from '../trpc.js'
import { db } from '../db/index.js'
import { users } from '@getitdone/db'
import { loginSchema, registerSchema } from '@getitdone/shared'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 30,
}

export const authRouter = router({
  login: publicProcedure.input(loginSchema).mutation(async ({ input, ctx }) => {
    const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1)

    if (!user || !user.passwordHash) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash)
    if (!valid) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' })
    }

    const token = await ctx.reply.jwtSign({ sub: user.id }, { expiresIn: '30d' })
    ctx.reply.setCookie('auth_token', token, COOKIE_OPTS)

    return { id: user.id, name: user.name, email: user.email }
  }),

  register: publicProcedure.input(registerSchema).mutation(async ({ input }) => {
    const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1)
    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'An account with that email already exists' })
    }

    const passwordHash = await bcrypt.hash(input.password, 10)
    const [user] = await db
      .insert(users)
      .values({ email: input.email, passwordHash })
      .returning()

    return { id: user.id, email: user.email }
  }),

  me: authenticatedProcedure.query(async ({ ctx }) => {
    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.sub))
    if (!user) throw new TRPCError({ code: 'NOT_FOUND' })
    return { id: user.id, name: user.name, email: user.email, image: user.image }
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.reply.clearCookie('auth_token', { path: '/' })
    return { ok: true }
  }),
})
