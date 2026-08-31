import { z } from 'zod'
import { router, publicProcedure } from '../trpc.js'
import { describePhoto } from '../services/vision.js'

export const photosRouter = router({
  // Public — the technician checklist page has no session.
  describe: publicProcedure
    .input(z.object({ imageDataUrl: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const description = await describePhoto(input.imageDataUrl)
      return { description }
    }),
})
