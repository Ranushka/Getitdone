import { eq, and, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, authenticatedProcedure } from '../trpc.js'
import { db } from '../db/index.js'
import { addresses } from '@getitdone/db'
import { createAddressSchema, updateAddressSchema, addressIdParamSchema } from '@getitdone/shared'

async function loadOwnedAddress(id: number, managerId: number) {
  const [address] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.managerId, managerId)))
  if (!address) throw new TRPCError({ code: 'NOT_FOUND', message: 'Address not found' })
  return address
}

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

  update: authenticatedProcedure.input(updateAddressSchema).mutation(async ({ input, ctx }) => {
    const { id, ...patch } = input
    await loadOwnedAddress(id, ctx.user.sub)
    const [updated] = await db.update(addresses).set(patch).where(eq(addresses.id, id)).returning()
    return updated
  }),

  delete: authenticatedProcedure.input(addressIdParamSchema).mutation(async ({ input, ctx }) => {
    await loadOwnedAddress(input.id, ctx.user.sub)
    try {
      await db.delete(addresses).where(eq(addresses.id, input.id))
    } catch {
      // FK violation — the address is still referenced by one or more jobs
      // (jobs.address_id has no cascade), which is a more useful message
      // than a raw Postgres constraint error.
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This address is still used by one or more jobs — it can’t be deleted',
      })
    }
    return { success: true }
  }),
})
