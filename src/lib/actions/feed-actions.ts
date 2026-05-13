'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'
import { FeedType, LivestockType } from '@prisma/client'

export async function createFeedFormulation(data: {
  name: string
  type: FeedType
  targetLivestock?: LivestockType
  ingredients: { inventoryId: number; percentage: number }[]
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  try {
    const formulation = await prisma.feedFormulation.create({
      data: {
        farmId: activeFarmId,
        name: data.name,
        type: data.type,
        targetLivestock: data.targetLivestock,
        ingredients: {
          create: data.ingredients.map(i => ({
            inventoryId: i.inventoryId,
            percentage: i.percentage,
            quantity: 0,
            unit: 'kg'
          }))
        }
      }
    })
    revalidatePath('/dashboard/feed')
    return { success: true, formulation }
  } catch (error: any) {
    console.error('Error creating feed formulation:', error)
    return { success: false, error: 'Failed to create formulation' }
  }
}

export async function getAllFeedFormulations() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

    const formulations = await prisma.feedFormulation.findMany({
    where: { farmId: activeFarmId },
    include: {
      ingredients: {
        include: { inventory: true }
      }
    }
  })

  return formulations.map((f: any) => ({
    ...f,
    ingredients: f.ingredients.map((ing: any) => ({
      ...ing,
      quantity: Number(ing.quantity),
      percentage: Number(ing.percentage),
      inventory: ing.inventory ? {
        ...ing.inventory,
        stockLevel: Number(ing.inventory.stockLevel),
        reorderLevel: ing.inventory.reorderLevel ? Number(ing.inventory.reorderLevel) : null,
        costPerUnit: ing.inventory.costPerUnit ? Number(ing.inventory.costPerUnit) : null
      } : null
    }))
  }))
}

export async function deleteFeedFormulation(id: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  try {
    await prisma.feedFormulation.delete({
      where: { id, farmId: activeFarmId }
    })
    revalidatePath('/dashboard/feed')
    return { success: true }
  } catch (error) {
    console.error('Error deleting formulation:', error)
    return { success: false, error: 'Failed to delete formulation' }
  }
}

export async function getConsumptionEfficiency() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  const result = await prisma.livestock.findMany({
    where: { farmId: activeFarmId, status: 'active' },
    include: {
      feedingLogs: true,
      weightRecords: {
        orderBy: { logDate: 'desc' },
        take: 2
      }
    }
  })

  return result.map(l => {
    const totalFeed = l.feedingLogs.reduce((sum, f) => sum + Number(f.amountConsumed), 0)
    const weights = l.weightRecords
    let weightGain = 0
    if (weights.length >= 2) {
      weightGain = Number(weights[0].averageWeight) - Number(weights[1].averageWeight)
    }
    
    // Feed Conversion Ratio (FCR)
    const fcr = weightGain > 0 ? (totalFeed / (weightGain * l.currentCount)) : 0

    return {
      id: l.id,
      name: l.batchName || `Batch ${l.id}`,
      totalFeed,
      fcr: fcr.toFixed(2),
      currentWeight: weights[0]?.averageWeight ? Number(weights[0].averageWeight) : 0
    }
  })
}

export async function createFeedingLog(data: any) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  try {
    const log = await prisma.feedingLog.create({
      data: {
        batchId: data.batchId,
        feedTypeId: data.feedTypeId,
        amountConsumed: data.amountConsumed,
        logDate: new Date(data.logDate),
        farmId: activeFarmId,
        userId: userId || 'user_placeholder'
      }
    })
    revalidatePath('/dashboard/feed')
    return { success: true, log }
  } catch (error) {
    console.error('Error creating feeding log:', error)
    return { success: false, error: 'Failed to create feeding log' }
  }
}

export async function updateFeedingLog(id: number, data: any) {
  const { activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  try {
    await prisma.feedingLog.update({
      where: { id },
      data: {
        amountConsumed: data.amountConsumed,
        feedTypeId: data.feedTypeId,
      }
    })
    revalidatePath('/dashboard/feed')
    return { success: true }
  } catch (error) {
    console.error('Error updating feeding log:', error)
    return { success: false, error: 'Failed to update feeding log' }
  }
}

export async function deleteFeedingLog(id: number, data?: any) {
  const { activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  try {
    await prisma.feedingLog.delete({
      where: { id }
    })
    revalidatePath('/dashboard/feed')
    return { success: true }
  } catch (error) {
    console.error('Error deleting feeding log:', error)
    return { success: false, error: 'Failed to delete feeding log' }
  }
}
