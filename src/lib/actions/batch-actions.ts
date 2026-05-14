'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'
import { checkWorkerPermissions } from './staff-actions'

export async function createBatch(data: {
  houseId: number
  breedType: string
  initialCount: number
  arrivalDate: string
  batchName?: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('batches', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Batches Permission' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const batch = await tx.livestock.create({
      data: {
        houseId: data.houseId,
        farmId: activeFarmId,
        breedType: data.breedType,
        batchName: data.batchName || `Unit ${new Date().getTime()}`,
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
  batchName?: string
  growthTargetOverride?: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('batches', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Batches Permission' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const batch = await tx.livestock.update({
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

  const hasEditAccess = await checkWorkerPermissions('batches', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Batches Permission' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    await tx.livestock.delete({
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

  const hasEditAccess = await checkWorkerPermissions('batches', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Batches Permission' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const batch = await tx.livestock.findUnique({
      where: { id: data.batchId, farmId: activeFarmId },
      select: { currentCount: true }
    })

    if (!batch) return { success: false, error: 'Batch not found' }
    if (data.count > batch.currentCount) {
      return { success: false, error: `Insufficient livestock. Only ${batch.currentCount} birds remaining.` }
    }

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
    await tx.livestock.update({
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

export async function transferToIsolation(id: number, count: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('batches', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const batch = await tx.livestock.findUnique({
      where: { id, farmId: activeFarmId }
    })

    if (!batch) return { success: false, error: 'Batch not found' }
    if (batch.currentCount < count + batch.isolationCount) {
       return { success: false, error: 'Not enough birds in main house to isolate' }
    }

    await tx.livestock.update({
      where: { id, farmId: activeFarmId },
      data: {
        isolationCount: {
          increment: count
        }
      }
    })

    revalidatePath('/dashboard/flocks')
    return { success: true }
  })
}

export async function returnFromIsolation(id: number, count: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('batches', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const batch = await tx.livestock.findUnique({
      where: { id, farmId: activeFarmId }
    })

    if (!batch) return { success: false, error: 'Batch not found' }
    if (batch.isolationCount < count) {
      return { success: false, error: 'Not enough birds in isolation to return' }
    }

    await tx.livestock.update({
      where: { id, farmId: activeFarmId },
      data: {
        isolationCount: {
          decrement: count
        }
      }
    })

    revalidatePath('/dashboard/flocks')
    return { success: true }
  })
}
