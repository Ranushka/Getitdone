import { z } from 'zod'
import { router, publicProcedure } from '../trpc.js'
import { translateText } from '../services/translate.js'

const SUPPORTED_LANGS = ['en', 'ar', 'si', 'ur', 'hi'] as const

export const translateRouter = router({
  // Public — the technician checklist page has no session and still needs
  // to translate job titles/notes/comments.
  text: publicProcedure
    .input(z.object({ text: z.string().min(1).max(2000), targetLang: z.enum(SUPPORTED_LANGS) }))
    .query(async ({ input }) => {
      const translated = await translateText(input.text, input.targetLang)
      return { translated }
    }),
})
