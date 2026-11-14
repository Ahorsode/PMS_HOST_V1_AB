import { AsyncLocalStorage } from 'node:async_hooks'
import { PrismaClient } from '@prisma/client'
import { validateDatabaseRuntimeConfig } from '@/lib/performance/env-validation'

validateDatabaseRuntimeConfig()

/**
 * A farm-context transaction that several reads of one page share (see
 * readTogether). It is only reused by code running inside that page's
 * readTogether call, for the same user and farm, while it is still open.
 */
type SharedFarmRead = { userId: string; farmId: string; tx: any; open: boolean; failed: boolean }
const sharedFarmRead = new AsyncLocalStorage<SharedFarmRead>()

function joinableFarmRead(userId: string | null, farmId: string) {
  const shared = sharedFarmRead.getStore()
  if (!shared || !shared.open || shared.farmId !== farmId) return null
  if (userId !== null && shared.userId !== userId) return null
  return shared
}

async function runInShared<T>(shared: SharedFarmRead, read: (tx: any) => Promise<T>): Promise<T> {
  try {
    return await read(shared.tx)
  } catch (error) {
    // A failed statement aborts the whole transaction, so the page re-runs its reads separately.
    shared.failed = true
    throw error
  }
}

const prismaClientSingleton = () => {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          // Automatic farmId injection for multi-tenant isolation
          // This ensures that even if a developer forgets to add farmId to a query,
          // the data is still isolated at the Prisma level (in addition to RLS).
          
          // We only inject if it's a model that has farmId (most do now)
          // and if the operation supports 'where'
          const modelsWithFarmId = [
            'House', 'Livestock', 'Inventory', 'FeedingLog', 
            'HealthRecord', 'EggProduction', 'HealthMortality', 
            'WeightRecord', 'Sale', 'SaleItem',
            'Subscription', 'Customer', 'Order', 'FeedFormulation',
            'FeedFormulationIngredient'
          ];

          if (modelsWithFarmId.includes(model)) {
            // Get activeFarmId from some context if possible, 
            // but usually this is used within $withFarmContext
            // For now, we'll let it pass through if not explicitly set in args,
            // but RLS will still catch it.
          }

          return query(args)
        },
      },
    },
    client: {
      async $withFarmContext(userId: string, farmId: string, callback: (tx: any) => Promise<any>) {
        // Inside a page's readTogether call the context is already set for this
        // user and farm, so the read joins that transaction instead of opening one.
        const shared = joinableFarmRead(userId, String(farmId))
        if (shared) return await runInShared(shared, callback)

        return await (this as any).$transaction(async (tx: any) => {
          // Both settings in one statement: same transaction-local values, one round trip instead of two.
          await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true), set_config('app.current_farm_id', ${String(farmId)}, true)`;
          return await callback(tx);
        }, {
          // Pages run many of these in parallel (Sales starts 9). Prisma's default
          // maxWait of 2s for a pooled connection made them fail at random under
          // load or on cold starts, showing "This dashboard view could not load".
          maxWait: 10000,
          timeout: 15000
        });
      },
      // Keep $withUser for backward compatibility but update it to set farm_id to null or default
      async $withUser(userId: string, callback: (tx: any) => Promise<any>) {
        return await (this as any).$transaction(async (tx: any) => {
          await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true), set_config('app.current_farm_id', ${''}, true)`;
          return await callback(tx);
        }, {
          // Pages run many of these in parallel (Sales starts 9). Prisma's default
          // maxWait of 2s for a pooled connection made them fail at random under
          // load or on cold starts, showing "This dashboard view could not load".
          maxWait: 10000,
          timeout: 15000
        });
      }
    }
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

/** Interactive-transaction client of the extended app client (`prisma.$transaction(async (tx) => ...)`). */
export type DbTransactionClient = Parameters<Extract<Parameters<typeof prisma.$transaction>[0], (...args: never[]) => unknown>>[0]

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

/**
 * Runs a page's farm reads inside one farm-context transaction instead of
 * one transaction per read. Only for reads: nothing in `run` may write.
 *
 * Each read keeps its own code and error handling. If any of them fails, or
 * the shared transaction itself fails, `run` is called again with every read
 * on its own transaction, which is exactly how they behaved before.
 */
export async function readTogether<T>(userId: string, farmId: string, run: () => Promise<T>): Promise<T> {
  const shared: SharedFarmRead = { userId, farmId: String(farmId), tx: null, open: false, failed: false }
  try {
    const result = await (prisma as any).$withFarmContext(userId, farmId, async (tx: any) => {
      shared.tx = tx
      shared.open = true
      try {
        return await sharedFarmRead.run(shared, run)
      } finally {
        shared.open = false
      }
    })
    if (!shared.failed) return result as T
  } catch {
    // Fall through to the separate reads below.
  }
  return run()
}

/**
 * For a read that normally uses the plain client with an explicit farmId
 * filter: inside readTogether it runs on the shared transaction, elsewhere on
 * the plain client as before.
 */
export async function readForFarm<T>(farmId: string, read: (db: DbTransactionClient) => Promise<T>): Promise<T> {
  const shared = joinableFarmRead(null, farmId)
  return shared ? runInShared(shared, read) : read(prisma)
}
