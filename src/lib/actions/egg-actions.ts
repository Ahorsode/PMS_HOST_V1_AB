'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'

async function getUserId() {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  return session.user.id
}

export async function createEggProduction(data: {
  batchId: number
  eggsCollected: number
  damagedEggs?: number
  crackedEggs?: number
  logDate: string
}) {
  const userId = await getUserId()
  return await (prisma as any).$withUser(userId, async (tx: any) => {
    const log = await tx.eggProduction.create({
      data: {
        batchId: data.batchId,
        eggsCollected: data.eggsCollected,
        damagedEggs: data.damagedEggs || 0,
        crackedEggs: data.crackedEggs || 0,
        logDate: new Date(data.logDate),
        userId: userId
      }
    })
    revalidatePath('/dashboard/eggs')
    return { success: true, log }
  }).catch((error: any) => {
    console.error('Error creating egg production log:', error)
    return { success: false, error: 'Failed to create log' }
  })
}

export async function updateEggProduction(id: number, data: {
  eggsCollected?: number
  damagedEggs?: number
  crackedEggs?: number
  logDate?: string
}) {
  const userId = await getUserId()
  return await (prisma as any).$withUser(userId, async (tx: any) => {
    const log = await tx.eggProduction.update({
      where: { id },
      data: {
        ...data,
        logDate: data.logDate ? new Date(data.logDate) : undefined,
      }
    })
    revalidatePath('/dashboard/eggs')
    return { success: true, log }
  }).catch((error: any) => {
    console.error('Error updating egg production log:', error)
    return { success: false, error: 'Failed to update log' }
  })
}

export async function deleteEggProduction(id: number) {
  const userId = await getUserId()
  return await (prisma as any).$withUser(userId, async (tx: any) => {
    await tx.eggProduction.delete({
      where: { id }
    })
    revalidatePath('/dashboard/eggs')
    return { success: true }
  }).catch((error: any) => {
    console.error('Error deleting egg production log:', error)
    return { success: false, error: 'Failed to delete log' }
  })
}
