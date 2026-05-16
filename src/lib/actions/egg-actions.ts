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
  eggsCollected?: number
  cratesCollected?: number
  categoryId?: number
  unusableCount?: number
  qualityGrade?: string
  isSorted?: boolean
  smallCount?: number
  mediumCount?: number
  largeCount?: number
  logDate: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('batches', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Batches Permission' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    // Fetch farm settings for dynamic crate size
    const settings = await tx.farmSettings.findUnique({
      where: { farmId: activeFarmId },
      select: { eggsPerCrate: true }
    })
    const eggsPerCrate = settings?.eggsPerCrate ?? 30

    // Calculate total eggs from crates if needed
    const calculatedEggs = data.eggsCollected ?? (data.cratesCollected ? Math.round(data.cratesCollected * eggsPerCrate) : 0)
    
    // Ensure "Unsorted" default if no categoryId provided
    let finalCategoryId = data.categoryId
    if (!finalCategoryId) {
      let unsortedCategory = await tx.eggCategory.findFirst({
        where: { farmId: activeFarmId, name: 'Unsorted' }
      })
      
      if (!unsortedCategory) {
        unsortedCategory = await tx.eggCategory.create({
          data: {
            farmId: activeFarmId,
            name: 'Unsorted',
            description: 'Default category for daily collections'
          }
        })
      }
      finalCategoryId = unsortedCategory.id
    }

    const log = await tx.eggProduction.create({
      data: {
        batchId: data.batchId,
        farmId: activeFarmId,
        eggsCollected: calculatedEggs,
        cratesCollected: data.cratesCollected,
        categoryId: finalCategoryId,
        unusableCount: data.unusableCount || 0,
        eggsRemaining: calculatedEggs - (data.unusableCount || 0),
        qualityGrade: data.qualityGrade,
        isSorted: data.isSorted || false,
        smallCount: data.smallCount || 0,
        mediumCount: data.mediumCount || 0,
        largeCount: data.largeCount || 0,
        logDate: new Date(data.logDate),
        userId: userId
      }
    })

    // Auto-sync usable eggs into Inventory based on Category
    const usableEggs = calculatedEggs - (data.unusableCount || 0)
    if (usableEggs > 0) {
      const category = await tx.eggCategory.findUnique({ where: { id: finalCategoryId } })

      const itemName = category ? `Eggs (${category.name})` : 'Eggs (Unsorted)'
      
      const existing = await tx.inventory.findFirst({
        where: { 
          farmId: activeFarmId, 
          category: 'EGGS', 
          eggCategoryId: finalCategoryId
        }
      })

      if (existing) {
        await tx.inventory.update({
          where: { id: existing.id },
          data: { stockLevel: { increment: usableEggs } }
        })
      } else {
        await tx.inventory.create({
          data: { 
            farmId: activeFarmId, 
            userId, 
            itemName: itemName, 
            stockLevel: usableEggs, 
            unit: 'eggs', 
            category: 'EGGS',
            eggCategoryId: finalCategoryId
          }
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
  qualityGrade?: string
  isSorted?: boolean
  smallCount?: number
  mediumCount?: number
  largeCount?: number
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
