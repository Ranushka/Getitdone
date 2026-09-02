import { eq, desc } from 'drizzle-orm'
import { router, authenticatedProcedure } from '../trpc.js'
import { db } from '../db/index.js'
import { addresses } from '@getitdone/db'
import { createAddressSchema } from '@getitdone/shared'

export const addressesRouter = router({
  list: authenticatedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(addresses)
      .where(eq(addresses.managerId, ctx.user.sub))
      .orderBy(desc(addresses.createdAt))
  }),

  create: authenticatedProcedure.input(createAddressSchema).mutation(async ({ input, ctx }) => {
    const [address] = await db
      .insert(addresses)
      .values({ ...input, managerId: ctx.user.sub })
      .returning()
    return address
  }),
})
