'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'

export async function createBatch(data: {
  houseId: number
  breedType: string
  initialCount: number
  arrivalDate: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const batch = await tx.batch.create({
      data: {
        houseId: data.houseId,
        farmId: activeFarmId,
        breedType: data.breedType,
        initialCount: data.initialCount,
        currentCount: data.initialCount,
        arrivalDate: new Date(data.arrivalDate),
        status: 'active',
        userId: userId
      }
    })
    revalidatePath('/dashboard/flocks')
    return { success: true, batch }
  }).catch((error: any) => {
    console.error('Error creating batch:', error)
    return { success: false, error: 'Failed to create batch' }
  })
}

export async function updateBatch(id: number, data: {
  houseId?: number
  breedType?: string
  initialCount?: number
  currentCount?: number
  arrivalDate?: string
  status?: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const batch = await tx.batch.update({
      where: { id, farmId: activeFarmId },
      data: {
        ...data,
        arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : undefined,
      }
    })
    revalidatePath('/dashboard/flocks')
    return { success: true, batch }
  }).catch((error: any) => {
    console.error('Error updating batch:', error)
    return { success: false, error: 'Failed to update batch' }
  })
}

export async function deleteBatch(id: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    await tx.batch.delete({
      where: { id, farmId: activeFarmId }
    })
    revalidatePath('/dashboard/flocks')
    return { success: true }
  }).catch((error: any) => {
    console.error('Error deleting batch:', error)
    return { success: false, error: 'Failed to delete batch' }
  })
}

export async function logMortality(data: {
  batchId: number
  count: number
  category: string
  subCategory: string
  reason?: string
  logDate: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const mortality = await tx.mortality.create({
      data: {
        batchId: data.batchId,
        farmId: activeFarmId,
        count: data.count,
        category: data.category,
        subCategory: data.subCategory,
        reason: data.reason,
        logDate: new Date(data.logDate),
        userId: userId
      }
    })
    
    // Update current count in batch
    await tx.batch.update({
      where: { id: data.batchId, farmId: activeFarmId },
      data: {
        currentCount: {
          decrement: data.count
        }
      }
    })

    revalidatePath('/dashboard/flocks')
    return { success: true, mortality }
  }).catch((error: any) => {
    console.error('Error logging mortality:', error)
    return { success: false, error: 'Failed to log mortality' }
  })
}
