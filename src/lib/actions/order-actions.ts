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
          customerId: data.customerId || undefined,
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
    revalidatePath('/dashboard')
    return { success: true, order: result }
  } catch (error) {
    console.error('Error creating order:', error)
    return { success: false, error: 'Failed to create order' }
  }
}


export async function getAllOrders() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  const orders = await prisma.order.findMany({
    where: { farmId: activeFarmId },
    include: {
      customer: true,
      items: true,
      user: {
        select: {
          firstname: true,
          surname: true,
          role: true
        }
      }
    },
    orderBy: { orderDate: 'desc' },
    take: 50 // Limit to avoid massive payloads
  })

  return orders.map(order => ({
    ...order,
    totalAmount: Number(order.totalAmount),
    discountAmount: Number(order.discountAmount),
    customer: order.customer ? {
      ...order.customer,
      balanceOwed: Number(order.customer.balanceOwed)
    } : null,
    items: order.items.map(item => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice)
    }))
  }))
}

export async function updateOrderStatus(id: number, status: string) {
  const { userId, role, activeFarmId, permissions } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  try {
    const order = await prisma.order.findUnique({
      where: { id, farmId: activeFarmId },
      include: { items: { include: { inventory: true } } }
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

            // FIFO for Eggs: Deduct from oldest production logs first
            if (item.inventory?.category === 'EGGS') {
              let qtyToDeduct = item.quantity
              const productions = await tx.eggProduction.findMany({
                where: { farmId: activeFarmId, eggsRemaining: { gt: 0 } },
                orderBy: { logDate: 'asc' }
              })
              for (const prod of productions) {
                if (qtyToDeduct <= 0) break
                const take = Math.min(prod.eggsRemaining, qtyToDeduct)
                await tx.eggProduction.update({
                  where: { id: prod.id },
                  data: { eggsRemaining: { decrement: take } }
                })
                qtyToDeduct -= take
              }
            }
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

            // LIFO Restoration for Eggs: Add back to newest production logs
            if (item.inventory?.category === 'EGGS') {
              let qtyToRestore = item.quantity
              const productions = await tx.eggProduction.findMany({
                where: { farmId: activeFarmId },
                orderBy: { logDate: 'desc' }
              })
              for (const prod of productions) {
                if (qtyToRestore <= 0) break
                const maxHold = prod.eggsCollected - prod.unusableCount
                const canAdd = maxHold - prod.eggsRemaining
                if (canAdd <= 0) continue
                const add = Math.min(canAdd, qtyToRestore)
                await tx.eggProduction.update({
                  where: { id: prod.id },
                  data: { eggsRemaining: { increment: add } }
                })
                qtyToRestore -= add
              }
            }
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
      include: { items: { include: { inventory: true } } }
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

            // LIFO Restoration for Eggs
            if (item.inventory?.category === 'EGGS') {
              let qtyToRestore = item.quantity
              const productions = await tx.eggProduction.findMany({
                where: { farmId: activeFarmId },
                orderBy: { logDate: 'desc' }
              })
              for (const prod of productions) {
                if (qtyToRestore <= 0) break
                const maxHold = prod.eggsCollected - prod.unusableCount
                const canAdd = maxHold - prod.eggsRemaining
                if (canAdd <= 0) continue
                const add = Math.min(canAdd, qtyToRestore)
                await tx.eggProduction.update({
                  where: { id: prod.id },
                  data: { eggsRemaining: { increment: add } }
                })
                qtyToRestore -= add
              }
            }
          }
          if (item.livestockId) {
            await tx.livestock.update({
              where: { id: item.livestockId },
              data: { currentCount: { increment: item.quantity } }
            })
          }
        }
      }

      // 2. Reduce Customer Balance if exists
      if (order.customerId) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            balanceOwed: { decrement: Number(order.totalAmount) }
          }
        })
      }

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
