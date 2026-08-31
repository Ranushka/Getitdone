import { z } from 'zod'
import { router, publicProcedure } from '../trpc.js'
import { describePhoto, suggestChecklistItem } from '../services/vision.js'

const photoInput = z.object({ imageDataUrl: z.string().min(1) })

export const photosRouter = router({
  // Public — the technician checklist page has no session.
  describe: publicProcedure.input(photoInput).mutation(async ({ input }) => {
    const description = await describePhoto(input.imageDataUrl)
    return { description }
  }),

  suggestItem: publicProcedure.input(photoInput).mutation(async ({ input }) => {
    const title = await suggestChecklistItem(input.imageDataUrl)
    return { title }
  }),
})
