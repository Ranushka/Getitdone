import { router, publicProcedure } from '../trpc.js'
import { authRouter } from './auth.js'
import { jobsRouter } from './jobs.js'
import { translateRouter } from './translate.js'
import { photosRouter } from './photos.js'
import { addressesRouter } from './addresses.js'
import { templatesRouter } from './templates.js'
import { whatsappRouter } from './whatsapp.js'

export const appRouter = router({
  ping: publicProcedure.query(() => 'pong'),
  auth: authRouter,
  jobs: jobsRouter,
  translate: translateRouter,
  photos: photosRouter,
  addresses: addressesRouter,
  templates: templatesRouter,
  whatsapp: whatsappRouter,
})

export type AppRouter = typeof appRouter
