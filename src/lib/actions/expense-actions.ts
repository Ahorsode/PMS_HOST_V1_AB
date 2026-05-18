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
      where: { farmId: activeFarmId, isDeleted: false },
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
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('finance', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: You do not have permission to log expenses' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    // Map LABOR to SALARY to match database enum
    const dbCategory = data.category === 'LABOR' ? 'SALARY' : data.category;

    // Store reference inside description since database model doesn't have referenceNumber field
    const dbDescription = data.reference
      ? `[Ref: ${data.reference}] ${data.description || ''}`.trim()
      : data.description;

    const expense = await tx.expense.create({
      data: {
        farmId: activeFarmId,
        userId: userId,
        amount: data.amount,
        category: dbCategory as any,
        description: dbDescription,
        expenseDate: new Date(data.expenseDate),
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

export async function deleteExpense(id: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('finance', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: You do not have permission to delete expenses' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    await tx.expense.update({
      where: { id, farmId: activeFarmId },
      data: { isDeleted: true }
    })
    revalidatePath('/dashboard/finance')
    return { success: true }
  }).catch((error: any) => {
    console.error('Error deleting expense:', error)
    return { success: false, error: 'Failed to delete expense' }
  })
}

export async function restoreExpense(id: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('finance', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: You do not have permission to restore expenses' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    await tx.expense.update({
      where: { id, farmId: activeFarmId },
      data: { isDeleted: false }
    })
    revalidatePath('/dashboard/finance')
    revalidatePath('/dashboard/settings/trash')
    return { success: true }
  }).catch((error: any) => {
    console.error('Error restoring expense:', error)
    return { success: false, error: 'Failed to restore expense' }
  })
}
