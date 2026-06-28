'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'
import { checkWorkerPermissions } from './staff-actions'
import { revalidateFarmPerformanceCaches } from '@/lib/performance/cache-tags'
import { checkRateLimit, rateLimitActionError } from '@/lib/performance/rate-limit'

export async function createInventoryItem(data: {
  itemName: string
  stockLevel: number
  unit: string
  category?: string
  costPerUnit?: number
  supplierId?: string
  paymentPlan?: string
  amountPaid?: number
  usageType?: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('inventory', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Inventory Permission' }

  const limitResult = await checkRateLimit({ policy: 'inventory.write', scope: 'createInventoryItem', farmId: activeFarmId, userId })
  if (!limitResult.ok) return rateLimitActionError(limitResult)

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const item = await tx.inventory.create({
      data: {
        itemName: data.itemName,
        stockLevel: data.stockLevel,
        unit: data.unit,
        category: data.category,
        costPerUnit: data.costPerUnit,
        usageType: data.usageType,
        supplierId: data.supplierId,
        userId: userId,
        farmId: activeFarmId
      }
    })

    const totalCost = data.stockLevel * (data.costPerUnit || 0)
    const amountToLog = data.paymentPlan === 'full' ? totalCost : (data.amountPaid || 0)

    if (amountToLog > 0) {
      await tx.expense.create({
        data: {
          farmId: activeFarmId,
          userId: userId,
          amount: amountToLog,
          category: data.category === 'FEED' ? 'FEED' : 
                    data.category === 'MEDICINE' ? 'MEDICATION' : 'OTHER',
          description: `Inventory Purchase: ${data.itemName} (${data.stockLevel} ${data.unit})`,
          supplierId: data.supplierId,
          expenseDate: new Date()
        }
      })
    }

    if (data.supplierId && (data.paymentPlan === 'installments' || data.paymentPlan === 'none')) {
      const debt = totalCost - (data.amountPaid || 0)
      if (debt > 0) {
        await tx.supplier.update({
          where: { id: data.supplierId },
          data: { balanceOwed: { increment: debt } }
        })
      }
    }
    
    revalidatePath('/dashboard/inventory')
    revalidatePath('/dashboard')
    revalidateFarmPerformanceCaches(activeFarmId)
    return { success: true, item: { ...item, stockLevel: Number(item.stockLevel) } }
  }).catch((error: any) => {
    console.error('Error creating inventory item:', error)
    return { success: false, error: 'Failed to create item' }
  })
}

export async function updateInventoryItem(id: string, data: {
  itemName?: string
  stockLevel?: number
  unit?: string
  category?: string
  costPerUnit?: number
  supplierId?: string
  usageType?: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('inventory', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Inventory Permission' }

  const limitResult = await checkRateLimit({ policy: 'inventory.write', scope: 'updateInventoryItem', farmId: activeFarmId, userId })
  if (!limitResult.ok) return rateLimitActionError(limitResult)

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const item = await tx.inventory.update({
      where: { id, farmId: activeFarmId },
      data
    })
    revalidatePath('/dashboard/inventory')
    revalidatePath('/dashboard')
    revalidateFarmPerformanceCaches(activeFarmId)
    return { success: true, item: { ...item, stockLevel: Number(item.stockLevel) } }
  }).catch((error: any) => {
    console.error('Error updating inventory item:', error)
    return { success: false, error: 'Failed to update item' }
  })
}

export async function deleteInventoryItem(id: string, reason: string) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('inventory', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Inventory Permission' }

  if (!reason || reason.trim().length < 5) return { success: false, error: 'A valid reason is required for deletion' }

  const limitResult = await checkRateLimit({ policy: 'inventory.write', scope: 'deleteInventoryItem', farmId: activeFarmId, userId })
  if (!limitResult.ok) return rateLimitActionError(limitResult)

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const existing = await tx.inventory.findUnique({ where: { id, farmId: activeFarmId } })
    if (existing) {
      await tx.deleteLog.create({
        data: {
          userId,
          farmId: activeFarmId,
          tableName: 'inventory',
          deletedDataCsv: JSON.stringify(existing),
          reason: reason.trim()
        }
      })
    }

    await tx.inventory.update({
      where: { id, farmId: activeFarmId },
      data: { isDeleted: true, deletedAt: new Date() }
    })
    revalidatePath('/dashboard/inventory')
    revalidateFarmPerformanceCaches(activeFarmId)
    return { success: true }
  }).catch((error: any) => {
    console.error('Error deleting inventory item:', error)
    return { success: false, error: 'Failed to delete item' }
  })
}

export async function restoreInventory(id: string) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('inventory', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Inventory Permission' }

  const limitResult = await checkRateLimit({ policy: 'inventory.write', scope: 'restoreInventory', farmId: activeFarmId, userId })
  if (!limitResult.ok) return rateLimitActionError(limitResult)

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    await tx.inventory.update({
      where: { id, farmId: activeFarmId },
      data: { isDeleted: false, deletedAt: null }
    })
    revalidatePath('/dashboard/inventory')
    revalidatePath('/dashboard/settings/trash')
    revalidateFarmPerformanceCaches(activeFarmId)
    return { success: true }
  }).catch((error: any) => {
    console.error('Error restoring inventory item:', error)
    return { success: false, error: 'Failed to restore item' }
  })
}

export async function getAllInventory() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const items = await tx.inventory.findMany({
      where: { farmId: activeFarmId, isDeleted: false },
      include: {
        eggCategory: true,
        user: {
          select: {
            firstname: true,
            surname: true,
            role: true
          }
        }
      },
      orderBy: { itemName: 'asc' }
    })
    return items.map((item: any) => ({
      ...item,
      stockLevel: Number(item.stockLevel),
      reorderLevel: item.reorderLevel ? Number(item.reorderLevel) : null,
      costPerUnit: item.costPerUnit ? Number(item.costPerUnit) : null,
      eggCategory: item.eggCategory ? {
        ...item.eggCategory,
        sellingPrice: Number(item.eggCategory.sellingPrice),
        unitSize: Number(item.eggCategory.unitSize)
      } : null,
      sellingPrice: item.eggCategory?.sellingPrice != null ? Number(item.eggCategory.sellingPrice) : (item.costPerUnit ? Number(item.costPerUnit) : null)
    }))
  })
}

/** Returns the current stock level of the Eggs inventory item for the active farm */
export async function getEggInventoryStock(): Promise<number> {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return 0

  const eggItem = await prisma.inventory.findFirst({
    where: { farmId: activeFarmId, category: 'EGGS', isDeleted: false }
  })
  return eggItem ? Number(eggItem.stockLevel) : 0
}
