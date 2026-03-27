'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'

export async function updateHouse(id: number, data: {
  name?: string
  capacity?: number
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const house = await tx.house.update({
      where: { id, farmId: activeFarmId },
      data
    })
    revalidatePath('/dashboard/climate')
    revalidatePath('/dashboard/settings')
    return { 
      success: true, 
      house: { 
        ...house, 
        currentTemperature: house.currentTemperature ? Number(house.currentTemperature) : null,
        currentHumidity: house.currentHumidity ? Number(house.currentHumidity) : null
      } 
    }
  }).catch((error: any) => {
    console.error('Error updating house:', error)
    return { success: false, error: 'Failed to update house' }
  })
}

export async function deleteHouse(id: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    await tx.house.delete({
      where: { id, farmId: activeFarmId }
    })
    revalidatePath('/dashboard/climate')
    revalidatePath('/dashboard/settings')
    return { success: true }
  }).catch((error: any) => {
    console.error('Error deleting house:', error)
    return { success: false, error: 'Failed to delete house' }
  })
}
