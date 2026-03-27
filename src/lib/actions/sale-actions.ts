'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'

export async function createSale(data: {
  customerName?: string
  totalAmount: number
  items: { description: string; quantity: number; unitPrice: number; totalPrice: number }[]
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const sale = await tx.sale.create({
      data: {
        customerName: data.customerName,
        totalAmount: data.totalAmount,
        userId: userId,
        farmId: activeFarmId,
        items: {
          create: data.items.map(item => ({ ...item, farmId: activeFarmId }))
        }
      }
    })
    revalidatePath('/dashboard/sales')
    return { success: true, sale: { ...sale, totalAmount: Number(sale.totalAmount) } }
  }).catch((error: any) => {
    console.error('Error creating sale:', error)
    return { success: false, error: 'Failed to create sale' }
  })
}

export async function deleteSale(id: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    // Delete sale items first if not handled by cascade
    await tx.saleItem.deleteMany({
      where: { saleId: id, farmId: activeFarmId }
    })
    await tx.sale.delete({
      where: { id, farmId: activeFarmId }
    })
    revalidatePath('/dashboard/sales')
    return { success: true }
  }).catch((error: any) => {
    console.error('Error deleting sale:', error)
    return { success: false, error: 'Failed to delete sale' }
  })
}
