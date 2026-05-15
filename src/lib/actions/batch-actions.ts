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
    // 1. Fetch existing to handle count synchronization
    const existing = await tx.livestock.findUnique({
      where: { id, farmId: activeFarmId },
      select: { initialCount: true, currentCount: true }
    })

    if (!existing) throw new Error('Batch not found')

    const updateData: any = {
      ...data,
      arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : undefined,
    }

    // 2. If initialCount is being changed, synchronize currentCount
    if (data.initialCount !== undefined && data.initialCount !== existing.initialCount) {
      const diff = data.initialCount - existing.initialCount
      updateData.currentCount = (existing.currentCount || 0) + diff
    }

    const batch = await tx.livestock.update({
      where: { id, farmId: activeFarmId },
      data: updateData
    })
    
    revalidatePath('/dashboard/flocks')
    return { success: true, batch }
  }).catch((error: any) => {
    console.error('Error updating batch:', error)
    return { success: false, error: error.message || 'Failed to update batch' }
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

export async function logHealthEvent(data: {
  batchId: number
  type: 'SICK' | 'DEAD'
  count: number
  isolationRoomId?: number
  reason?: string
  logDate?: string
  category?: string
  subCategory?: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('batches', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    // 1. Create Mortality record (serves as health/mortality log)
    const record = await tx.mortality.create({
      data: {
        batchId: data.batchId,
        farmId: activeFarmId,
        count: data.count,
        type: data.type,
        isolation_room_id: data.type === 'SICK' ? data.isolationRoomId : null,
        reason: data.reason,
        category: data.category,
        subCategory: data.subCategory,
        logDate: new Date(data.logDate || new Date()),
        userId: userId
      }
    })

    // 2. Update Livestock counts
    const updateData: any = {}
    
    if (data.type === 'DEAD') {
      updateData.currentCount = { decrement: data.count }
    } else if (data.type === 'SICK') {
      updateData.currentCount = { decrement: data.count }
      updateData.isolationCount = { increment: data.count }
    }

    await tx.livestock.update({
      where: { id: data.batchId, farmId: activeFarmId },
      data: updateData
    })

    revalidatePath('/dashboard/flocks')
    return { success: true, record }
  }).catch((error: any) => {
    console.error('Error logging health event:', error)
    return { success: false, error: error.message || 'Failed to log health event' }
  })
}

// Backward compatibility wrapper
export async function logMortality(data: any) {
  return logHealthEvent({
    ...data,
    type: 'DEAD'
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
    if ((batch.currentCount || 0) < count + (batch.isolationCount || 0)) {
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
  }).catch((error: any) => {
    console.error('Error transferring to isolation:', error)
    return { success: false, error: error.message || 'Failed to transfer to isolation' }
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
    if ((batch.isolationCount || 0) < count) {
      return { success: false, error: 'Not enough birds in isolation to return' }
    }

    await tx.livestock.update({
      where: { id, farmId: activeFarmId },
      data: {
        isolationCount: { decrement: count },
        currentCount: { increment: count }
      }
    })

    revalidatePath('/dashboard/flocks')
    return { success: true }
  }).catch((error: any) => {
    console.error('Error returning from isolation:', error)
    return { success: false, error: error.message || 'Failed to return from isolation' }
  })
}

export async function logMortalityInIsolation(data: {
  batchId: number,
  count: number,
  reason?: string,
  category?: string,
  subCategory?: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('batches', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const batch = await tx.livestock.findUnique({
      where: { id: data.batchId, farmId: activeFarmId }
    })

    if (!batch) throw new Error('Batch not found')
    if ((batch.isolationCount || 0) < data.count) {
      throw new Error('Not enough birds in isolation')
    }

    await tx.mortality.create({
      data: {
        batchId: data.batchId,
        farmId: activeFarmId,
        count: data.count,
        type: 'DEAD',
        reason: data.reason || 'Mortality while in isolation',
        category: data.category || 'Health',
        subCategory: data.subCategory || 'Isolation Mortality',
        logDate: new Date(),
        userId: userId
      }
    })

    await tx.livestock.update({
      where: { id: data.batchId, farmId: activeFarmId },
      data: {
        isolationCount: { decrement: data.count }
      }
    })

    revalidatePath('/dashboard/flocks')
    return { success: true }
  }).catch((error: any) => {
    console.error('Error logging mortality in isolation:', error)
    return { success: false, error: error.message || 'Failed to log mortality' }
  })
}
