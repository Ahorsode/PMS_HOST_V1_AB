'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'
import { checkWorkerPermissions } from './staff-actions'

export async function getSuppliers() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  const hasViewAccess = await checkWorkerPermissions('finance', 'view')
  if (!hasViewAccess) return []

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    return await tx.supplier.findMany({
      where: { farmId: activeFarmId },
      orderBy: { name: 'asc' }
    })
  }).catch((error: any) => {
    console.error('Error fetching suppliers:', error)
    return []
  })
}

export async function createSupplier(data: {
  name: string
  phone?: string
  email?: string
  address?: string
  balanceOwed?: number
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('customers', 'edit') // Using customers permission for suppliers/CRM
  if (!hasEditAccess) return { success: false, error: 'Unauthorized' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const supplier = await tx.supplier.create({
      data: {
        ...data,
        farmId: activeFarmId
      }
    })
    revalidatePath('/dashboard/commercial')
    return { success: true, supplier }
  }).catch((error: any) => {
    console.error('Error creating supplier:', error)
    return { success: false, error: 'Failed to create supplier' }
  })
}

export async function updateSupplierBalance(id: number, amount: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    await tx.supplier.update({
      where: { id, farmId: activeFarmId },
      data: {
        balanceOwed: {
          increment: amount
        }
      }
    })
    revalidatePath('/dashboard/commercial')
    return { success: true }
  })
}
