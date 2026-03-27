'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'

export async function createInventoryItem(data: {
  itemName: string
  stockLevel: number
  unit: string
  category?: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const item = await tx.inventory.create({
      data: {
        ...data,
        userId: userId,
        farmId: activeFarmId
      }
    })
    revalidatePath('/dashboard/feed')
    return { success: true, item: { ...item, stockLevel: Number(item.stockLevel) } }
  }).catch((error: any) => {
    console.error('Error creating inventory item:', error)
    return { success: false, error: 'Failed to create item' }
  })
}

export async function updateInventoryItem(id: number, data: {
  itemName?: string
  stockLevel?: number
  unit?: string
  category?: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const item = await tx.inventory.update({
      where: { id, farmId: activeFarmId },
      data
    })
    revalidatePath('/dashboard/feed')
    return { success: true, item: { ...item, stockLevel: Number(item.stockLevel) } }
  }).catch((error: any) => {
    console.error('Error updating inventory item:', error)
    return { success: false, error: 'Failed to update item' }
  })
}

export async function deleteInventoryItem(id: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    await tx.inventory.delete({
      where: { id, farmId: activeFarmId }
    })
    revalidatePath('/dashboard/feed')
    return { success: true }
  }).catch((error: any) => {
    console.error('Error deleting inventory item:', error)
    return { success: false, error: 'Failed to delete item' }
  })
}
