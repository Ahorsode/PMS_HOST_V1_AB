import { PrismaClient } from '@prisma/client'
import { validateDatabaseRuntimeConfig } from '@/lib/performance/env-validation'

validateDatabaseRuntimeConfig()

const prismaClientSingleton = () => {
  return new PrismaClient().$extends({
    client: {
      async $withFarmContext(userId: string, farmId: string, callback: (tx: any) => Promise<any>) {
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
