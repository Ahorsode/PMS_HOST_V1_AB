'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'

export async function getExpenses() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const expenses = await tx.expense.findMany({
      where: { farmId: activeFarmId },
      orderBy: { expenseDate: 'desc' },
      take: 50
    })
    return expenses.map((e: any) => ({
      ...e,
      amount: Number(e.amount)
    }))
  }).catch((error: any) => {
    console.error('Error fetching expenses:', error)
    return []
  })
}

export async function createExpense(data: {
  amount: number
  category: string
  description?: string
  expenseDate: string
  reference?: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const expense = await tx.expense.create({
      data: {
        farmId: activeFarmId,
        userId: userId,
        amount: data.amount,
        category: data.category as any,
        description: data.description,
        expenseDate: new Date(data.expenseDate),
        referenceNumber: data.reference
      }
    })
    revalidatePath('/dashboard/finance')
    revalidatePath('/dashboard')
    return { success: true, expense }
  }).catch((error: any) => {
    console.error('Error creating expense:', error)
    return { success: false, error: 'Failed to create expense' }
  })
}
