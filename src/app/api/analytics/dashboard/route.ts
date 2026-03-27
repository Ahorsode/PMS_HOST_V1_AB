import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-utils'
import prisma from '@/lib/db'
import { getBatchAnalytics, getMortalityTrends } from '@/lib/actions/analytics-actions'

export async function GET(req: Request) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const farmIdStr = searchParams.get('farmId')
  const farmId = farmIdStr ? parseInt(farmIdStr) : activeFarmId

  if (!farmId) {
    return NextResponse.json({ error: 'farmId is required or no active farm' }, { status: 400 })
  }

  try {
    return await (prisma as any).$withFarmContext(userId, farmId, async (tx: any) => {
      // Get all active batches for the farm
      const activeBatches = await tx.batch.findMany({
        where: { farmId: farmId, status: 'active' },
        select: { id: true, breedType: true }
      })

      // Get analytics for each batch
      const batchStats = await Promise.all(
        activeBatches.map(async (b: any) => {
          const stats = await getBatchAnalytics(b.id)
          return { ...b, ...stats }
        })
      )

      // Get mortality trends
      const mortalityTrends = await getMortalityTrends(farmId)

      // Get low inventory alerts
      const lowInventory = await tx.inventory.findMany({
        where: {
          farmId: farmId,
          stockLevel: { lt: 500 } // Example threshold
        }
      })

      return NextResponse.json({
        batchStats,
        mortalityTrends,
        lowInventory,
        timestamp: new Date().toISOString()
      })
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
