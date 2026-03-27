'use server'

import prisma from '@/lib/db'
import { getAuthContext } from '@/lib/auth-utils'

export async function getBatchAnalytics(batchId: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')
  
  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const batch = await tx.batch.findUnique({
      where: { id: batchId, farmId: activeFarmId },
      include: {
        feedingLogs: true,
        weightRecords: {
          orderBy: { logDate: 'desc' },
          take: 1
        },
        mortalityRecords: true
      }
    })

    if (!batch) throw new Error('Batch not found')

    // FCR Calculation
    const totalFeed = batch.feedingLogs.reduce((acc: number, log: any) => acc + Number(log.amountConsumed), 0)
    const currentWeight = batch.weightRecords[0]?.averageWeight || 0
    const currentBirds = batch.currentCount
    
    // FCR = Total Feed / (Current Birds * Average Weight)
    const fcr = (currentWeight > 0 && currentBirds > 0) 
      ? (totalFeed / (currentBirds * Number(currentWeight))) 
      : 0

    return {
      fcr: fcr.toFixed(2),
      totalFeed: totalFeed.toFixed(2),
      currentWeight: Number(currentWeight).toFixed(3),
      mortalityRate: ((batch.initialCount - batch.currentCount) / batch.initialCount * 100).toFixed(2)
    }
  })
}

export async function getMortalityTrends(farmId: number) {
  const { userId, activeFarmId } = await getAuthContext()
  const targetFarmId = farmId || activeFarmId
  if (!targetFarmId) throw new Error('No farm ID provided')
  
  return await (prisma as any).$withFarmContext(userId, targetFarmId, async (tx: any) => {
    const mortalityData = await tx.mortality.findMany({
      where: {
        farmId: targetFarmId
      },
      orderBy: { logDate: 'asc' }
    })

    // Group by date
    const trends = mortalityData.reduce((acc: any, log: any) => {
      const date = log.logDate.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + log.count
      return acc
    }, {})

    return Object.entries(trends).map(([date, count]) => ({ date, count }))
  })
}
