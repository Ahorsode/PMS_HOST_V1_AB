'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'

export async function recordPayment(data: {
  customerId: string
  amount: number
  orderId?: string
  paymentMethod?: string
}) {
  const { userId, role, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  // RBAC: Only Accountant or Owner/Admin can record payments
  const authorizedRoles = ['ACCOUNTANT', 'OWNER', 'FINANCE_OFFICER']
  if (!authorizedRoles.includes(role)) {
    return { success: false, error: 'Unauthorized: Only Accountants can record payments' }
  }

  const amount = Number(data.amount)
  if (amount <= 0) return { success: false, error: 'Invalid payment amount' }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Reduce Customer Balance
      await tx.customer.update({
        where: { id: data.customerId, farmId: activeFarmId },
        data: {
          balanceOwed: { decrement: amount }
        }
      })

      // 2. If a specific order is being paid, optionally update status
      if (data.orderId) {
        await tx.order.update({
          where: { id: data.orderId, farmId: activeFarmId },
          data: { status: 'PAID' }
        })
      }

      // 3. Create a financial transaction entry (if we had a Ledger table, but for now we'll just log or use what we have)
      // Note: We could add a 'Payment' model later.
    })

    revalidatePath('/dashboard/sales')
    revalidatePath('/dashboard/sales/customers')
    revalidatePath('/dashboard/orders')
    
    return { success: true, message: 'Payment recorded successfully' }
  } catch (error) {
    console.error('Error recording payment:', error)
    return { success: false, error: 'Failed to record payment' }
  }
}
