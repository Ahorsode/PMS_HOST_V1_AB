'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { getAuthContext } from '@/lib/auth-utils'
import { checkWorkerPermissions } from './staff-actions'

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

export async function createEggProduction(data: {
  batchId: number
  eggsCollected: number
  unusableCount?: number
  logDate: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('batches', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Batches Permission' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const log = await tx.eggProduction.create({
      data: {
        batchId: data.batchId,
        farmId: activeFarmId,
        eggsCollected: data.eggsCollected,
        unusableCount: data.unusableCount || 0,
        logDate: new Date(data.logDate),
        userId: userId
      }
    })

    // Auto-sync usable eggs into Inventory
    const usableEggs = data.eggsCollected - (data.unusableCount || 0)
    if (usableEggs > 0) {
      const existing = await tx.inventory.findFirst({
        where: { farmId: activeFarmId, category: 'EGGS', itemName: 'Eggs' }
      })
      if (existing) {
        await tx.inventory.update({
          where: { id: existing.id },
          data: { stockLevel: { increment: usableEggs } }
        })
      } else {
        await tx.inventory.create({
          data: { farmId: activeFarmId, userId, itemName: 'Eggs', stockLevel: usableEggs, unit: 'eggs', category: 'EGGS' }
        })
      }
    }

    revalidatePath('/dashboard/eggs')
    revalidatePath('/dashboard/inventory')
    return { success: true, log }
  }).catch((error: any) => {
    console.error('Error creating egg production log:', error)
    return { success: false, error: 'Failed to create log' }
  })
}

export async function updateEggProduction(id: number, data: {
  eggsCollected?: number
  unusableCount?: number
  logDate?: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('batches', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Batches Permission' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const log = await tx.eggProduction.update({
      where: { id, farmId: activeFarmId },
      data: {
        ...data,
        logDate: data.logDate ? new Date(data.logDate) : undefined,
      }
    })
    revalidatePath('/dashboard/eggs')
    return { success: true, log }
  }).catch((error: any) => {
    console.error('Error updating egg production log:', error)
    return { success: false, error: 'Failed to update log' }
  })
}

export async function deleteEggProduction(id: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('batches', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Batches Permission' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    await tx.eggProduction.delete({
      where: { id, farmId: activeFarmId }
    })
    revalidatePath('/dashboard/eggs')
    return { success: true }
  }).catch((error: any) => {
    console.error('Error deleting egg production log:', error)
    return { success: false, error: 'Failed to delete log' }
  })
}
