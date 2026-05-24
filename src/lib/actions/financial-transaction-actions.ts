'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'
import { checkWorkerPermissions } from './staff-actions'
import { checkRateLimit } from '@/lib/performance/rate-limit'
import { revalidateFarmPerformanceCaches } from '@/lib/performance/cache-tags'

export async function getFinancialTransactions() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  const hasViewAccess = await checkWorkerPermissions('finance', 'view')
  if (!hasViewAccess) return []

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const transactions = await tx.financialTransaction.findMany({
      where: {
        farmId: activeFarmId,
        isDeleted: false,
        deletedAt: null
      },
      include: {
        user: {
          select: {
            firstname: true,
            surname: true,
            role: true
          }
        }
      },
      orderBy: { transactionDate: 'desc' }
    })

    return transactions.map((t: any) => ({
      ...t,
      amount: Number(t.amount)
    }))
  }).catch((error: any) => {
    console.error('Error fetching financial transactions:', error)
    return []
  })
}

export async function createFinancialTransaction(data: {
  type: 'REVENUE' | 'EXPENSE'
  category: string
  amount: number
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIALLY_PAID'
  paymentMethod: string
  referenceNum?: string
  transactionDate: string
  description?: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('finance', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Finance Permission' }

  if (!data.amount || data.amount <= 0) {
    return { success: false, error: 'Amount must be a positive number' }
  }

  const limitResult = await checkRateLimit({
    scope: 'createFinancialTransaction',
    farmId: activeFarmId,
    userId,
    limit: 12,
    windowSec: 60,
  })
  if (!limitResult.ok) {
    return { success: false, error: 'Too many requests. Please wait and try again.', code: 429, retryAfterSec: limitResult.retryAfterSec }
  }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const transaction = await tx.financialTransaction.create({
      data: {
        farmId: activeFarmId,
        userId: userId,
        type: data.type,
        category: data.category,
        amount: parseFloat(String(data.amount)),
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod,
        referenceNum: data.referenceNum || null,
        transactionDate: new Date(data.transactionDate),
        description: data.description || null,
        isDeleted: false,
        deletedAt: null
      }
    })

    // Log to AuditLog table
    await tx.auditLog.create({
      data: {
        tableName: 'financial_transactions',
        recordId: transaction.id,
        attributeName: 'all',
        newValue: JSON.stringify(transaction),
        actionType: 'FINANCIAL_TRANSACTION_CREATED',
        description: `Logged ${data.type.toLowerCase()} of GH₵ ${data.amount} under ${data.category}`,
        userId: userId,
        farmId: activeFarmId
      }
    })

    revalidatePath('/dashboard/finance')
    revalidatePath('/dashboard/reports')
    revalidatePath('/dashboard')
    revalidateFarmPerformanceCaches(activeFarmId)
    
    return { success: true, transaction: { ...transaction, amount: Number(transaction.amount) } }
  }).catch((error: any) => {
    console.error('Error creating transaction:', error)
    return { success: false, error: 'Failed to create transaction' }
  })
}

export async function settleTransaction(id: string, referenceNum?: string) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('finance', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Finance Permission' }

  const limitResult = await checkRateLimit({
    scope: 'settleFinancialTransaction',
    farmId: activeFarmId,
    userId,
    limit: 20,
    windowSec: 60,
  })
  if (!limitResult.ok) {
    return { success: false, error: 'Too many requests. Please wait and try again.', code: 429, retryAfterSec: limitResult.retryAfterSec }
  }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const existing = await tx.financialTransaction.findUnique({
      where: { id, farmId: activeFarmId }
    })

    if (!existing) {
      return { success: false, error: 'Transaction not found' }
    }

    const baseDesc = existing.description || ''
    const settledSuffix = `Fully settled on ${new Date().toLocaleDateString()}${referenceNum ? ` (ref: ${referenceNum})` : ''}`
    const updatedDesc = baseDesc 
      ? `${baseDesc} | ${settledSuffix}`
      : settledSuffix;

    const transaction = await tx.financialTransaction.update({
      where: { id, farmId: activeFarmId },
      data: {
        paymentStatus: 'PAID',
        referenceNum: referenceNum || existing.referenceNum,
        description: updatedDesc,
        settledAt: new Date()
      }
    })

    // Log to AuditLog table
    await tx.auditLog.create({
      data: {
        tableName: 'financial_transactions',
        recordId: id,
        attributeName: 'paymentStatus',
        oldValue: existing.paymentStatus,
        newValue: 'PAID',
        actionType: 'FINANCIAL_TRANSACTION_SETTLED',
        description: `Settled outstanding transaction #${id} of GH₵ ${existing.amount}`,
        userId: userId,
        farmId: activeFarmId
      }
    })

    revalidatePath('/dashboard/finance')
    revalidatePath('/dashboard/reports')
    revalidatePath('/dashboard')
    revalidateFarmPerformanceCaches(activeFarmId)

    return { success: true }
  }).catch((error: any) => {
    console.error('Error settling transaction:', error)
    return { success: false, error: 'Failed to settle transaction' }
  })
}

export async function deleteFinancialTransaction(id: string, reason: string) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('finance', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Finance Permission' }

  if (!reason || reason.trim().length < 5) {
    return { success: false, error: 'A valid reason (minimum 5 characters) is required for deletion' }
  }

  const limitResult = await checkRateLimit({
    scope: 'deleteFinancialTransaction',
    farmId: activeFarmId,
    userId,
    limit: 10,
    windowSec: 60,
  })
  if (!limitResult.ok) {
    return { success: false, error: 'Too many requests. Please wait and try again.', code: 429, retryAfterSec: limitResult.retryAfterSec }
  }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const existing = await tx.financialTransaction.findUnique({
      where: { id, farmId: activeFarmId }
    })

    if (!existing) {
      return { success: false, error: 'Transaction not found' }
    }

    // Log to DeleteLog table
    await tx.deleteLog.create({
      data: {
        userId,
        farmId: activeFarmId,
        tableName: 'financial_transactions',
        deletedDataCsv: JSON.stringify(existing),
        reason: reason.trim()
      }
    })

    // Soft delete transaction: set both isDeleted: true and deletedAt: new Date()
    await tx.financialTransaction.update({
      where: { id, farmId: activeFarmId },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    })

    // Log to AuditLog table
    await tx.auditLog.create({
      data: {
        tableName: 'financial_transactions',
        recordId: id,
        attributeName: 'isDeleted',
        oldValue: 'false',
        newValue: 'true',
        actionType: 'FINANCIAL_TRANSACTION_DELETED',
        description: `Deleted financial transaction #${id}. Reason: ${reason}`,
        userId: userId,
        farmId: activeFarmId
      }
    })

    revalidatePath('/dashboard/finance')
    revalidatePath('/dashboard/reports')
    revalidatePath('/dashboard')
    revalidateFarmPerformanceCaches(activeFarmId)

    return { success: true }
  }).catch((error: any) => {
    console.error('Error deleting transaction:', error)
    return { success: false, error: 'Failed to delete transaction' }
  })
}
