import { router, authenticatedProcedure } from '../trpc.js'
import { getWhatsAppStatus, resetWhatsAppSession } from '../services/whatsapp.js'

export const whatsappRouter = router({
  status: authenticatedProcedure.query(() => getWhatsAppStatus()),

  // Logs out the current session so a different number can be paired —
  // the next status poll opens a fresh socket and returns a new QR code.
  reset: authenticatedProcedure.mutation(async () => {
    await resetWhatsAppSession()
    return { success: true }
  }),
})
