'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'
import { checkWorkerPermissions } from './staff-actions'

export async function createInventoryItem(data: {
  itemName: string
  stockLevel: number
  unit: string
  category?: string
  costPerUnit?: number
  supplierId?: string
  paymentPlan?: string
  amountPaid?: number
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('inventory', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Inventory Permission' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const item = await tx.inventory.create({
      data: {
        itemName: data.itemName,
        stockLevel: data.stockLevel,
        unit: data.unit,
        category: data.category,
        costPerUnit: data.costPerUnit,
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
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('inventory', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Inventory Permission' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const item = await tx.inventory.update({
      where: { id, farmId: activeFarmId },
      data
    })
    revalidatePath('/dashboard/inventory')
    revalidatePath('/dashboard')
    return { success: true, item: { ...item, stockLevel: Number(item.stockLevel) } }
  }).catch((error: any) => {
    console.error('Error updating inventory item:', error)
    return { success: false, error: 'Failed to update item' }
  })
}

export async function deleteInventoryItem(id: string) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('inventory', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Inventory Permission' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    await tx.inventory.delete({
      where: { id, farmId: activeFarmId }
    })
    revalidatePath('/dashboard/inventory')
    return { success: true }
  }).catch((error: any) => {
    console.error('Error deleting inventory item:', error)
    return { success: false, error: 'Failed to delete item' }
  })
}

export async function getAllInventory() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const items = await tx.inventory.findMany({
      where: { farmId: activeFarmId },
      include: {
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
      costPerUnit: item.costPerUnit ? Number(item.costPerUnit) : null
    }))
  })
}

/** Returns the current stock level of the Eggs inventory item for the active farm */
export async function getEggInventoryStock(): Promise<number> {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return 0

  const eggItem = await prisma.inventory.findFirst({
    where: { farmId: activeFarmId, category: 'EGGS' }
  })
  return eggItem ? Number(eggItem.stockLevel) : 0
}
