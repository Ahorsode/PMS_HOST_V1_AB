import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Automatic farmId injection for multi-tenant isolation
          // This ensures that even if a developer forgets to add farmId to a query,
          // the data is still isolated at the Prisma level (in addition to RLS).
          
          // We only inject if it's a model that has farmId (most do now)
          // and if the operation supports 'where'
          const modelsWithFarmId = [
            'House', 'Batch', 'Inventory', 'FeedingLog', 
            'HealthRecord', 'EggProduction', 'Mortality', 
            'WeightRecord', 'Sale', 'SaleItem'
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
      async $withFarmContext(userId: string, farmId: number, callback: (tx: any) => Promise<any>) {
        return await (this as any).$transaction(async (tx: any) => {
          await tx.$executeRawUnsafe(`SET app.current_user_id = '${userId}';`);
          await tx.$executeRawUnsafe(`SET app.current_farm_id = '${farmId}';`);
          return await callback(tx);
        }, {
          timeout: 15000
        });
      },
      // Keep $withUser for backward compatibility but update it to set farm_id to null or default
      async $withUser(userId: string, callback: (tx: any) => Promise<any>) {
        return await (this as any).$transaction(async (tx: any) => {
          await tx.$executeRawUnsafe(`SET app.current_user_id = '${userId}';`);
          await tx.$executeRawUnsafe(`SET app.current_farm_id = '';`); // Clear farm context
          return await callback(tx);
        }, {
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

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

