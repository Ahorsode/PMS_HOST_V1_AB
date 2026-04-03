'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext, hasPermission } from '@/lib/auth-utils'

export async function createOrder(data: {
  customerId?: number
  discountAmount?: number
  items: { 
    description: string; 
    quantity: number; 
    unitPrice: number;
    inventoryId?: number;
    livestockId?: number;
  }[]
}) {
  const { userId, role, activeFarmId, permissions } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  const discount = Number(data.discountAmount || 0)
  const subtotal = data.items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0)
  const totalAmount = subtotal - discount

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          farmId: activeFarmId,
          customerId: data.customerId ?? undefined,
          totalAmount,
          discountAmount: discount,
          items: {
            create: data.items.map(i => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.quantity * i.unitPrice,
              inventoryId: i.inventoryId,
              livestockId: i.livestockId
            }))
          }
        } as any
      })


      // Only update customer balance if a customer is linked
      if (data.customerId) {
        await tx.customer.update({
          where: { id: data.customerId, farmId: activeFarmId },
          data: {
            balanceOwed: { increment: totalAmount }
          }
        })
      }

      return order
    })

    revalidatePath('/dashboard/orders')
    revalidatePath('/dashboard/sales')
    return { success: true, order: result }
  } catch (error) {
    console.error('Error creating order:', error)
    return { success: false, error: 'Failed to create order' }
  }
}


export async function getAllOrders() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  return await prisma.order.findMany({
    where: { farmId: activeFarmId },
    include: {
      customer: true,
      items: true
    },
    orderBy: { orderDate: 'desc' }
  })
}

export async function updateOrderStatus(id: number, status: string) {
  const { userId, role, activeFarmId, permissions } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  try {
    const order = await prisma.order.findUnique({
      where: { id, farmId: activeFarmId },
      include: { items: true }
    })

    if (!order) throw new Error('Order not found')

    // RBAC Hardening: Cashiers cannot edit order after PAID
    if (role === 'CASHIER' && order.status === 'PAID' && status !== 'PAID') {
      return { success: false, error: 'Cashiers cannot modify paid orders' }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Order Status
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status }
      })

      // 2. Inventory Sync
      // Case A: Marking as COMPLETED (Decrement)
      if (status === 'COMPLETED' && order.status !== 'COMPLETED') {
        for (const item of order.items) {
          if (item.inventoryId) {
            await tx.inventory.update({
              where: { id: item.inventoryId },
              data: { stockLevel: { decrement: item.quantity } }
            })
          }
          if (item.livestockId) {
            await tx.livestock.update({
              where: { id: item.livestockId },
              data: { currentCount: { decrement: item.quantity } }
            })
          }
        }
      }

      // Case B: Moving AWAY from COMPLETED (Restore/Increment)
      if (order.status === 'COMPLETED' && status !== 'COMPLETED') {
        for (const item of order.items) {
          if (item.inventoryId) {
            await tx.inventory.update({
              where: { id: item.inventoryId },
              data: { stockLevel: { increment: item.quantity } }
            })
          }
          if (item.livestockId) {
            await tx.livestock.update({
              where: { id: item.livestockId },
              data: { currentCount: { increment: item.quantity } }
            })
          }
        }
      }

      return updatedOrder
    })

    revalidatePath('/dashboard/orders')
    revalidatePath('/dashboard/sales')
    revalidatePath('/dashboard/inventory')
    return { success: true, order: result }
  } catch (error) {
    console.error('Error updating order status:', error)
    return { success: false, error: 'Failed to update status' }
  }
}

export async function deleteOrder(id: number) {
  const { userId, role, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')
  
  // Only Admin/Owner or Accountant can delete orders
  const authorizedRoles = ['OWNER', 'MANAGER', 'ACCOUNTANT']
  if (!authorizedRoles.includes(role)) {
    return { success: false, error: 'Unauthorized: Only Managers can delete orders' }
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id, farmId: activeFarmId },
      include: { items: true }
    })

    if (!order) throw new Error('Order not found')

    await prisma.$transaction(async (tx) => {
      // 1. Restore Stock if it was completed
      if (order.status === 'COMPLETED') {
        for (const item of order.items) {
          if (item.inventoryId) {
            await tx.inventory.update({
              where: { id: item.inventoryId },
              data: { stockLevel: { increment: item.quantity } }
            })
          }
          if (item.livestockId) {
            await tx.livestock.update({
              where: { id: item.livestockId },
              data: { currentCount: { increment: item.quantity } }
            })
          }
        }
      }

      // 2. Reduce Customer Balance (only if it hasn't been PAID yet, or always if we want to reverse the whole liability)
      // If the order was PENDING/PAID, it contributed to total spent or balance.
      // For now, reverse the debt if it's not fully processed.
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          balanceOwed: { decrement: Number(order.totalAmount) }
        }
      })

      // 3. Delete Order Items then Order
      await tx.orderItem.deleteMany({ where: { orderId: id } })
      await tx.order.delete({ where: { id } })
    })

    revalidatePath('/dashboard/sales')
    revalidatePath('/dashboard/orders')
    return { success: true, message: 'Order deleted and stock restored' }
  } catch (error) {
    console.error('Error deleting order:', error)
    return { success: false, error: 'Failed to delete order' }
  }
}
