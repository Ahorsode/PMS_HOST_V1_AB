'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'

export async function createCustomer(data: {
  name: string
  phone?: string
  email?: string
  address?: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  try {
    const customer = await prisma.customer.create({
      data: {
        farmId: activeFarmId,
        ...data
      }
    })
    revalidatePath('/dashboard/customers')
    return { success: true, customer }
  } catch (error) {
    console.error('Error creating customer:', error)
    return { success: false, error: 'Failed to create customer' }
  }
}

export async function getAllCustomers() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  const customers = await prisma.customer.findMany({
    where: { farmId: activeFarmId },
    orderBy: { name: 'asc' }
  })
  return customers.map(c => ({
    ...c,
    balanceOwed: Number(c.balanceOwed)
  }))
}

export async function getCustomerStats() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return null

  const customers = await prisma.customer.findMany({
    where: { farmId: activeFarmId },
    include: {
      orders: true
    }
  })

  return customers.map(c => ({
    id: c.id,
    name: c.name,
    balanceOwed: Number(c.balanceOwed),
    orderCount: c.orders.length,
    totalSpent: c.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
  }))
}
