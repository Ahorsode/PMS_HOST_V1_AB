'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'
import { checkWorkerPermissions } from './staff-actions'

export async function getExpenses() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  const hasViewAccess = await checkWorkerPermissions('finance', 'view')
  if (!hasViewAccess) return []

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const expenses = await tx.expense.findMany({
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
  supplierId?: number
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  const hasEditAccess = await checkWorkerPermissions('finance', 'edit')
  if (!hasEditAccess) throw new Error('Unauthorized: Missing Edit Finance Permission')

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const expense = await tx.expense.create({
      data: {
        farmId: activeFarmId,
        userId: userId,
        amount: data.amount,
        category: data.category as any,
        description: data.description,
        expenseDate: new Date(data.expenseDate),
        referenceNumber: data.reference,
        supplierId: data.supplierId
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
