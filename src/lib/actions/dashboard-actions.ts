'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'

export async function getDashboardStats() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const totalBirds = await tx.batch.aggregate({
      where: { status: 'active', farmId: activeFarmId },
      _sum: { currentCount: true }
    })

    const eggsData = await tx.eggProduction.aggregate({
      where: { farmId: activeFarmId },
      _sum: { eggsCollected: true }
    })

    const mortalityData = await tx.mortality.aggregate({
      where: { farmId: activeFarmId },
      _sum: { count: true }
    })

    const totalInitialBirds = await tx.batch.aggregate({
      where: { farmId: activeFarmId },
      _sum: { initialCount: true }
    })

    const mortalityRate = totalInitialBirds._sum.initialCount 
      ? (Number(mortalityData._sum.count || 0) / Number(totalInitialBirds._sum.initialCount)) * 100 
      : 0

    const lowFeedThreshold = 500 // kg
    const lowFeedAlerts = await tx.inventory.findMany({
      where: {
        farmId: activeFarmId,
        category: 'feed',
        stockLevel: {
          lt: lowFeedThreshold
        }
      }
    })

    const activeBatches = await tx.batch.findMany({
      where: { status: 'active', farmId: activeFarmId },
      include: {
        house: true,
        eggProduction: {
          orderBy: { logDate: 'desc' },
          take: 1
        }
      }
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const todayMortality = await tx.mortality.aggregate({
      where: { logDate: { gte: today }, farmId: activeFarmId },
      _sum: { count: true }
    })

    const todayEggs = await tx.eggProduction.aggregate({
      where: { logDate: { gte: today }, farmId: activeFarmId },
      _sum: { eggsCollected: true }
    })

    // Fetch raw data for last 7 days for trends
    const recentEggs = await tx.eggProduction.findMany({
      where: { logDate: { gte: sevenDaysAgo }, farmId: activeFarmId },
      orderBy: { logDate: 'asc' }
    })
    
    const recentFeed = await tx.feedingLog.findMany({
      where: { logDate: { gte: sevenDaysAgo }, farmId: activeFarmId },
      orderBy: { logDate: 'asc' }
    })

    const recentSales = await tx.sale.findMany({
      where: { saleDate: { gte: sevenDaysAgo }, farmId: activeFarmId },
      orderBy: { saleDate: 'asc' }
    })

    const recentMortality = await tx.mortality.findMany({
      where: { logDate: { gte: sevenDaysAgo }, farmId: activeFarmId },
      orderBy: { logDate: 'asc' }
    })

    // Helper to format Date to YYYY-MM-DD
    const formatDate = (date: Date) => date.toISOString().split('T')[0]

    // Generate last 7 days labels
    const trendDates = Array.from({length: 7}).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return formatDate(d)
    })

    const eggTrendData = trendDates.map(date => {
      const dayTotal = recentEggs.filter((e: any) => formatDate(e.logDate) === date).reduce((sum: number, e: any) => sum + e.eggsCollected, 0)
      return { date, count: dayTotal }
    })

    const feedTrendData = trendDates.map(date => {
      const dayTotal = recentFeed.filter((f: any) => formatDate(f.logDate) === date).reduce((sum: number, f: any) => sum + Number(f.amountConsumed), 0)
      return { date, count: dayTotal }
    })

    const revenueTrendData = trendDates.map(date => {
      const dayTotal = recentSales.filter((s: any) => formatDate(s.saleDate) === date).reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0)
      return { date, count: dayTotal }
    })

    const mortalityTrendData = trendDates.map(date => {
      const dayTotal = recentMortality.filter((m: any) => formatDate(m.logDate) === date).reduce((sum: number, m: any) => sum + m.count, 0)
      return { date, count: dayTotal }
    })

    const todayStr = formatDate(new Date())

    const upcomingVaccinations = await tx.vaccinationSchedule.findMany({
      where: {
        farmId: activeFarmId,
        status: 'PENDING',
        scheduledDate: {
          lte: new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000) // Next 3 days
        }
      },
      include: { batch: true }
    })

    const pendingMedications = await tx.medicationSchedule.findMany({
      where: {
        farmId: activeFarmId,
        status: 'PENDING'
      },
      include: { batch: true }
    })

    const batchesNeedingEggs = await tx.batch.findMany({
      where: {
        farmId: activeFarmId,
        status: 'active',
        eggProduction: {
          none: {
            logDate: {
              gte: today
            }
          }
        }
      }
    })

    const dynamicAlerts = [
      ...upcomingVaccinations.map((v: any) => ({
        type: 'VACCINE',
        title: 'Upcoming Vaccination',
        message: `${v.vaccineName} for Flock ${v.batch.id}`,
        severity: 'warning'
      })),
      ...pendingMedications.map((m: any) => ({
        type: 'MEDICATION',
        title: 'Medication Due',
        message: `${m.medicationName} for Flock ${m.batch.id}`,
        severity: 'error'
      })),
      ...batchesNeedingEggs.map((b: any) => ({
        type: 'EGGS',
        title: 'Egg Collection Due',
        message: `Flock ${b.id} needs collection`,
        severity: 'info'
      }))
    ]

    return {
      totalBirds: totalBirds._sum.currentCount || 0,
      mortalityRate: mortalityRate.toFixed(2),
      overallDead: mortalityData._sum.count || 0,
      todayDead: todayMortality._sum.count || 0,
      totalEggs: eggsData._sum.eggsCollected || 0,
      todayEggs: todayEggs._sum.eggsCollected || 0,
      lowFeedAlertsCount: lowFeedAlerts.length,
      lowFeedItems: lowFeedAlerts.map((i: any) => ({ name: i.itemName, stockLevel: Number(i.stockLevel), category: i.category })),
      alerts: dynamicAlerts,
      eggTrendData,
      feedTrendData,
      revenueTrendData,
      mortalityTrendData,
      activeBatches: activeBatches.map((batch: any) => ({
        id: `FLK-${batch.id.toString().padStart(3, '0')}`,
        numericId: batch.id,
        breed: batch.breedType || 'Unknown',
        quantity: batch.currentCount,
        hatchDate: batch.arrivalDate.toISOString(),
        status: batch.status,
        houseNumber: batch.house?.name || 'N/A'
      }))
    }
  }).catch((error: any) => {
    console.error('Error fetching dashboard stats:', error)
    throw new Error('Failed to fetch dashboard stats')
  })
}


export async function createBatch(data: {
  houseId: number
  breedType: string
  initialCount: number
  arrivalDate: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const batch = await tx.batch.create({
      data: {
        houseId: data.houseId,
        farmId: activeFarmId,
        breedType: data.breedType,
        initialCount: data.initialCount,
        currentCount: data.initialCount,
        arrivalDate: new Date(data.arrivalDate),
        status: 'active',
        userId: userId
      }
    })
    revalidatePath('/dashboard')
    return { success: true, batch }
  }).catch((error: any) => {
    console.error('Error creating batch:', error)
    return { success: false, error: 'Failed to create batch' }
  })
}


export async function logFeeding(data: {
  batchId: number
  feedTypeId: number
  amountConsumed: number
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  try {
    const result = await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
      const log = await tx.feedingLog.create({
        data: {
          batchId: data.batchId,
          farmId: activeFarmId,
          feedTypeId: data.feedTypeId,
          amountConsumed: data.amountConsumed
        }
      })

      await tx.inventory.update({
        where: { id: data.feedTypeId, farmId: activeFarmId },
        data: {
          stockLevel: {
            decrement: data.amountConsumed
          }
        }
      })

      return log
    })
    revalidatePath('/dashboard')
    return { success: true, log: { ...result, amountConsumed: Number(result.amountConsumed) } }
  } catch (error) {
    console.error('Error logging feeding:', error)
    return { success: false, error: 'Failed to log feeding' }
  }
}

export async function getHouses() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    return await tx.house.findMany({
      where: { farmId: activeFarmId }
    })
  }).catch((error: any) => {
    console.error('Error fetching houses:', error)
    return []
  })
}

export async function getAllBatches() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const batches = await tx.batch.findMany({
      where: { farmId: activeFarmId },
      include: {
        house: true,
      },
      orderBy: {
        arrivalDate: 'desc',
      },
    })
    return batches.map((batch: any) => ({
      ...batch,
      house: batch.house ? {
        ...batch.house,
        currentTemperature: batch.house.currentTemperature ? Number(batch.house.currentTemperature) : null,
        currentHumidity: batch.house.currentHumidity ? Number(batch.house.currentHumidity) : null,
      } : null
    }))
  }).catch((error: any) => {
    console.error('Error fetching all batches:', error)
    return []
  })
}


export async function updateBatchStatus(id: number, status: string) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const batch = await tx.batch.update({
      where: { id, farmId: activeFarmId },
      data: { status },
    })
    revalidatePath('/dashboard/flocks')
    revalidatePath('/dashboard')
    return { success: true, batch }
  }).catch((error: any) => {
    console.error('Error updating batch status:', error)
    return { success: false, error: 'Failed to update batch status' }
  })
}

export async function logProduction(data: {
  batchId: number
  eggsCollected: number
  damagedEggs: number
  birdWeight?: number
  mortalityCount: number
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    // Log eggs if collected
    if (data.eggsCollected > 0 || data.damagedEggs > 0) {
      await tx.eggProduction.create({
        data: {
          batchId: data.batchId,
          farmId: activeFarmId,
          eggsCollected: data.eggsCollected,
          damagedEggs: data.damagedEggs,
          logDate: new Date(),
          userId: userId
        }
      })
    }

    // Log mortality if occurred
    if (data.mortalityCount > 0) {
      await tx.mortality.create({
        data: {
          batchId: data.batchId,
          farmId: activeFarmId,
          count: data.mortalityCount,
          logDate: new Date(),
          userId: userId
        }
      })

      // Update current count in batch
      await tx.batch.update({
        where: { id: data.batchId, farmId: activeFarmId },
        data: {
          currentCount: {
            decrement: data.mortalityCount
          }
        }
      })
    }

    revalidatePath('/dashboard/eggs')
    revalidatePath('/dashboard')
    return { success: true }
  }).catch((error: any) => {
    console.error('Error logging production:', error)
    return { success: false, error: 'Failed to log production' }
  })
}

export async function updateFarmInfo(data: { name: string, location?: string, capacity: number }) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const updatedFarm = await tx.farm.update({
      where: { id: activeFarmId },
      data: {
        name: data.name,
        location: data.location,
        capacity: data.capacity
      }
    })
    revalidatePath('/dashboard/settings')
    return { success: true, farm: updatedFarm }
  }).catch((error: any) => {
    console.error('Error updating farm info:', error)
    return { success: false, error: 'Failed to update farm info' }
  })
}

export async function createHouse(data: { houseNumber: string, capacity: number } | FormData) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  let houseName: string;
  let houseCapacity: number;

  if (data instanceof FormData) {
    houseName = (data.get('name') as string) || (data.get('houseNumber') as string);
    houseCapacity = parseInt(data.get('capacity') as string);
  } else {
    houseName = data.houseNumber;
    houseCapacity = data.capacity;
  }

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const house = await tx.house.create({
      data: {
        name: houseName,
        capacity: houseCapacity,
        farmId: activeFarmId,
        userId: userId
      }
    })
    revalidatePath('/dashboard/settings')
    revalidatePath('/dashboard/houses')
    revalidatePath('/dashboard')
    return { success: true, house }
  }).catch((error: any) => {
    console.error('Error creating house:', error)
    return { success: false, error: 'Failed to create house' }
  })
}

export async function onboardFarmer(data: { name: string, location: string, capacity: number }) {
  const { userId } = await getAuthContext()
  try {
    const result = await prisma.$transaction(async (tx) => {
      const farm = await tx.farm.create({
        data: {
          name: data.name,
          location: data.location,
          capacity: data.capacity,
          userId: userId
        }
      })

      // Assign the user as OWNER of this farm
      await tx.farmMember.create({
        data: {
          farmId: farm.id,
          userId: userId,
          role: 'OWNER'
        }
      })

      return farm
    })

    revalidatePath('/dashboard')
    return { success: true, farm: result }
  } catch (error) {
    console.error('Error onboarding farmer:', error)
    return { success: false, error: 'Failed to onboard farmer' }
  }
}

export async function checkOnboardingStatus() {
  const { userId } = await getAuthContext()
  if (!userId) return { isOnboarded: false, error: 'Unauthorized' }
  
  const membership = await prisma.farmMember.findFirst({
    where: { userId: userId }
  })
  
  return { isOnboarded: !!membership }
}

export async function registerUser(data: { emailOrPhone: string, password: string, name: string }) {
  try {
    const isEmail = data.emailOrPhone.includes('@');
    const email = isEmail ? data.emailOrPhone.toLowerCase().trim() : null;
    const phone = isEmail ? null : data.emailOrPhone.trim();

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { phoneNumber: phone || undefined }
        ].filter(Boolean) as any
      }
    }) as any;

    if (existingUser) {
      if (existingUser.password) {
        return { success: false, error: 'User already exists and has a password set' };
      }
      // If user exists but has no password (e.g. created via invitation or OAuth before)
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const { firstname, surname, middleName } = splitName(data.name);
      
      await (prisma.user as any).update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          firstname,
          surname,
          middleName,
          name: data.name
        }
      });
      return { success: true, userId: existingUser.id };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const { firstname, surname, middleName } = splitName(data.name);

    // Create user
    const newUser = await (prisma.user as any).create({
      data: {
        email,
        phoneNumber: phone,
        password: hashedPassword,
        name: data.name,
        firstname,
        surname,
        middleName,
        role: 'OWNER' // Default role for self-signup
      }
    });

    // Check for pending invitations
    const invitation = await (prisma.invitation as any).findFirst({
      where: {
        OR: [
          { email: email || undefined },
          { phoneNumber: phone || undefined }
        ].filter(Boolean) as any,
        status: 'PENDING'
      }
    });

    if (invitation) {
      // Auto-accept invitation
      await prisma.$transaction([
        (prisma.farmMember as any).create({
          data: {
            farmId: invitation.farmId,
            userId: (newUser as any).id,
            role: (invitation as any).role
          }
        }),
        (prisma.invitation as any).update({
          where: { id: (invitation as any).id },
          data: { status: 'ACCEPTED' }
        }),
        (prisma.user as any).update({
          where: { id: (newUser as any).id },
          data: { role: (invitation as any).role }
        })
      ]);
    }

    return { success: true, userId: (newUser as any).id };
  } catch (error: any) {
    console.error('Error registering user:', error);
    return { success: false, error: 'Failed to register user' };
  }
}

function splitName(name: string) {
  if (!name) return { firstname: '', surname: '', middleName: '' };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { firstname: parts[0], surname: '', middleName: '' };
  if (parts.length === 2) return { firstname: parts[0], surname: parts[1], middleName: '' };
  return {
    firstname: parts[0],
    surname: parts[parts.length - 1],
    middleName: parts.slice(1, -1).join(' ')
  };
}

export async function updateProfile(data: { firstname: string; surname: string }) {
  const { userId } = await getAuthContext()
  if (!userId) return { success: false, error: 'Unauthorized' }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        firstname: data.firstname.trim(),
        surname: data.surname.trim(),
        middleName: (data as any).middleName?.trim(),
        name: `${data.firstname.trim()} ${(data as any).middleName ? (data as any).middleName.trim() + ' ' : ''}${data.surname.trim()}`,
      }
    })
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error updating profile:', error)
    return { success: false, error: 'Failed to update profile' }
  }
}


export async function getAllEggProduction() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    return await tx.eggProduction.findMany({
      where: { farmId: activeFarmId },
      include: {
        batch: true,
      },
      orderBy: {
        logDate: 'desc',
      },
      take: 50,
    })
  }).catch((error: any) => {
    console.error('Error fetching egg production:', error)
    return []
  })
}

export async function getAllFeedingLogs() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const logs = await tx.feedingLog.findMany({
      where: { farmId: activeFarmId },
      include: {
        batch: true,
        inventory: true,
      },
      orderBy: {
        logDate: 'desc',
      },
      take: 50,
    })
    return logs.map((log: any) => ({
      ...log,
      amountConsumed: Number(log.amountConsumed),
      inventory: log.inventory ? {
         ...log.inventory,
         stockLevel: Number(log.inventory.stockLevel),
         reorderLevel: log.inventory.reorderLevel ? Number(log.inventory.reorderLevel) : null
      } : null
    }))
  }).catch((error: any) => {
    console.error('Error fetching feeding logs:', error)
    return []
  })
}

export async function getAllInventory() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const items = await tx.inventory.findMany({
      where: { farmId: activeFarmId },
      orderBy: {
        itemName: 'asc',
      },
    })
    return items.map((item: any) => ({
      ...item,
      stockLevel: Number(item.stockLevel),
      reorderLevel: item.reorderLevel ? Number(item.reorderLevel) : null
    }))
  }).catch((error: any) => {
    console.error('Error fetching inventory:', error)
    return []
  })
}

export async function getAllSales() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const sales = await tx.sale.findMany({
      where: { farmId: activeFarmId },
      include: {
        items: true,
      },
      orderBy: {
        saleDate: 'desc',
      },
      take: 50,
    })
    return sales.map((sale: any) => ({
      ...sale,
      totalAmount: Number(sale.totalAmount),
      items: sale.items.map((item: any) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice)
      }))
    }))
  }).catch((error: any) => {
    console.error('Error fetching sales:', error)
    return []
  })
}

export async function getAllMortalityLogs() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    return await tx.mortality.findMany({
      where: { farmId: activeFarmId },
      include: {
        batch: true,
      },
      orderBy: {
        logDate: 'desc',
      },
      take: 50,
    })
  }).catch((error: any) => {
    console.error('Error fetching mortality logs:', error)
    return []
  })
}

export async function getBatchDetails(id: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return null

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const batch = await tx.batch.findUnique({
      where: { id, farmId: activeFarmId },
      include: {
        house: true,
        feedingLogs: {
          include: { inventory: true },
          orderBy: { logDate: 'desc' }
        },
        mortalityRecords: {
          orderBy: { logDate: 'desc' }
        },
        eggProduction: {
          orderBy: { logDate: 'desc' }
        },
        weightRecords: {
          orderBy: { logDate: 'desc' }
        },
        vaccinations: {
          orderBy: { scheduledDate: 'asc' }
        }
      }
    })

    if (!batch) return null

    // Serialize Decimals for Client Components
    return {
      ...batch,
      house: batch.house ? {
        ...batch.house,
        currentTemperature: batch.house.currentTemperature ? Number(batch.house.currentTemperature) : null,
        currentHumidity: batch.house.currentHumidity ? Number(batch.house.currentHumidity) : null,
      } : null,
      feedingLogs: batch.feedingLogs.map((log: any) => ({
        ...log,
        amountConsumed: Number(log.amountConsumed),
        inventory: log.inventory ? {
          ...log.inventory,
          stockLevel: Number(log.inventory.stockLevel)
        } : null
      })),
      weightRecords: batch.weightRecords.map((rec: any) => ({
        ...rec,
        averageWeight: Number(rec.averageWeight)
      })),
      vaccinations: (batch as any).vaccinations || []
    }
  }).catch((error: any) => {
    console.error('Error fetching batch details:', error)
    return null
  })
}

export async function logWeight(data: {
  batchId: number
  averageWeight: number
  logDate: string
}) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) throw new Error('No active farm selected')

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const record = await tx.weightRecord.create({
      data: {
        batchId: data.batchId,
        farmId: activeFarmId,
        averageWeight: data.averageWeight,
        logDate: new Date(data.logDate),
        userId: userId
      }
    })
    revalidatePath(`/dashboard/flocks/${data.batchId}`)
    return { success: true, record }
  }).catch((error: any) => {
    console.error('Error logging weight:', error)
    return { success: false, error: 'Failed to log weight' }
  })
}

export async function getInventoryDetails(id: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return null

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const item = await tx.inventory.findUnique({
      where: { id, farmId: activeFarmId },
      include: {
        feedingLogs: {
          include: { batch: true },
          orderBy: { logDate: 'desc' }
        }
      }
    })

    if (!item) return null

    return {
      ...item,
      stockLevel: Number(item.stockLevel),
      reorderLevel: item.reorderLevel ? Number(item.reorderLevel) : null,
      feedingLogs: item.feedingLogs.map((log: any) => ({
        ...log,
        amountConsumed: Number(log.amountConsumed)
      }))
    }
  }).catch((error: any) => {
    console.error('Error fetching inventory details:', error)
    return null
  })
}

export async function getSaleDetails(id: number) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return null

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const sale = await tx.sale.findUnique({
      where: { id, farmId: activeFarmId },
      include: {
        items: true
      }
    })

    if (!sale) return null

    return {
      ...sale,
      totalAmount: Number(sale.totalAmount),
      items: sale.items.map((item: any) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice)
      }))
    }
  }).catch((error: any) => {
    console.error('Error fetching sale details:', error)
    return null
  })
}

export async function getGlobalFlockStats() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const batches = await tx.batch.findMany({
      where: { farmId: activeFarmId },
      include: {
        mortalityRecords: true,
        feedingLogs: true,
        eggProduction: true,
      }
    })

    return batches.map((batch: any) => {
      const totalMortality = batch.mortalityRecords.reduce((acc: number, log: any) => acc + log.count, 0)
      const feedConsumed = batch.feedingLogs.reduce((acc: number, log: any) => acc + Number(log.amountConsumed), 0)
      const eggsCollected = batch.eggProduction.reduce((acc: number, log: any) => acc + log.eggsCollected, 0)

      return {
        ...batch,
        totalMortality,
        feedConsumed,
        eggsCollected,
        currentQuantity: batch.initialCount - totalMortality
      }
    })
  }).catch((error: any) => {
    console.error('Error fetching global flock stats:', error)
    return []
  })
}

export async function getGlobalEggStats() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const logs = await tx.eggProduction.findMany({
      where: { farmId: activeFarmId },
      include: { batch: true },
      orderBy: { logDate: 'desc' }
    })
    return logs
  }).catch(() => [])
}

export async function getGlobalSalesStats() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const sales = await tx.sale.findMany({
      where: { farmId: activeFarmId },
      include: { items: true },
      orderBy: { saleDate: 'desc' }
    })
    return sales.map((sale: any) => ({
      ...sale,
      totalAmount: Number(sale.totalAmount),
      items: sale.items.map((item: any) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice)
      }))
    }))
  }).catch(() => [])
}

export async function getGlobalFeedStats() {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return []

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const inventory = await tx.inventory.findMany({
      where: { farmId: activeFarmId },
      include: { feedingLogs: { include: { batch: true } } }
    })
    return inventory.map((item: any) => ({
      ...item,
      stockLevel: Number(item.stockLevel),
      reorderLevel: item.reorderLevel ? Number(item.reorderLevel) : null,
      feedingLogs: item.feedingLogs.map((log: any) => ({
        ...log,
        amountConsumed: Number(log.amountConsumed)
      }))
    }))
  }).catch(() => [])
}
