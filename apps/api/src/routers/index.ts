import { router, publicProcedure } from '../trpc.js'
import { authRouter } from './auth.js'
import { jobsRouter } from './jobs.js'

export const appRouter = router({
  ping: publicProcedure.query(() => 'pong'),
  auth: authRouter,
  jobs: jobsRouter,
})

export type AppRouter = typeof appRouter
