'use server'

import prisma from '@/lib/db'
import { getAuthContext } from '@/lib/auth-utils'
import { checkWorkerPermissions } from './staff-actions'

const VACCINE_CATEGORIES = ['VACCINE', 'VACCINATION', 'VACCINES']
const MEDICINE_CATEGORIES = ['MEDICINE', 'MEDICATION', 'MEDICATIONS', 'VETERINARY', 'HEALTH']
const ALL_HEALTH_CATEGORIES = [...VACCINE_CATEGORIES, ...MEDICINE_CATEGORIES]
const FEED_CATEGORIES = ['FEED', 'FEEDS', 'FEED_RAW', 'FEED_FINISHED']

function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
}

function dayKey(date: Date) {
  return date.toISOString().split('T')[0]
}

function dayLabel(key: string) {
  return new Date(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * Deep-dive payload for the in-depth livestock management page: base batch info,
 * all logs, plus pre-computed finance / egg / mortality / sales time-series so
 * the client stays light. Finance data is permission-gated.
 */
export async function getFlockDeepDive(id: string) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return null

  const [canViewFinance, canEditFinance, canEditHealth] = await Promise.all([
    checkWorkerPermissions('finance', 'view'),
    checkWorkerPermissions('finance', 'edit'),
    checkWorkerPermissions('mortality', 'edit'),
  ])

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    const batch = await tx.livestock.findUnique({
      where: { id, farmId: activeFarmId },
      include: {
        house: true,
        feedingLogs: { include: { inventory: true, user: true }, orderBy: { logDate: 'desc' } },
        mortalityRecords: { include: { user: true }, orderBy: { logDate: 'desc' } },
        eggProduction: { include: { user: true }, orderBy: { logDate: 'desc' } },
        weightRecords: { include: { user: true }, orderBy: { logDate: 'desc' } },
        vaccinations: { orderBy: { scheduledDate: 'asc' } },
        medications: { orderBy: { scheduledDate: 'asc' } },
      },
    })

    if (!batch) return null

    // ---- Finance ----------------------------------------------------------
    let directExpenses: any[] = []
    let allocations: any[] = []
    let revenueItems: any[] = []
    // "General" expenses: farm-level costs not tied to a single batch and not
    // explicitly allocated. These get spread across batches by headcount share.
    let generalExpenses: any[] = []
    let activeBatchesForAlloc: any[] = []

    if (canViewFinance) {
      ;[directExpenses, allocations, revenueItems, generalExpenses, activeBatchesForAlloc] = await Promise.all([
        tx.expense.findMany({
          where: { batch_id: id, farmId: activeFarmId, isDeleted: false },
          orderBy: { expenseDate: 'desc' },
        }),
        tx.expenseAllocation.findMany({
          where: { batchId: id, farmId: activeFarmId },
          include: { expense: true },
          orderBy: { createdAt: 'desc' },
        }),
        tx.orderItem.findMany({
          where: { livestockId: id, order: { farmId: activeFarmId, isDeleted: false } },
          include: { order: { select: { orderDate: true, status: true } } },
        }),
        tx.expense.findMany({
          where: { farmId: activeFarmId, isDeleted: false, batch_id: null, allocations: { none: {} } },
          orderBy: { expenseDate: 'desc' },
        }),
        tx.livestock.findMany({
          where: { farmId: activeFarmId, status: 'active', isDeleted: false },
          select: { id: true, batchName: true, currentCount: true, localBatchId: true },
          orderBy: { batchName: 'asc' },
        }),
      ])
    }

    const allocationBatches = canEditFinance ? activeBatchesForAlloc : []

    // This batch's proportional share of total active livestock headcount.
    const headcountMap = new Map<string, number>(
      activeBatchesForAlloc.map((b: any) => [b.id, b.currentCount || 0])
    )
    if (!headcountMap.has(batch.id)) headcountMap.set(batch.id, batch.currentCount || 0)
    const totalHeadcount = Array.from(headcountMap.values()).reduce((s, v) => s + v, 0)
    const headcountShare = totalHeadcount > 0 ? (batch.currentCount || 0) / totalHeadcount : 0

    // Health inventory options for the schedule form (only if user can edit)
    let vaccineInventory: any[] = []
    let medicineInventory: any[] = []
    let feedInventory: any[] = []
    if (canEditHealth) {
      const healthItems = await tx.inventory.findMany({
        where: { farmId: activeFarmId, isDeleted: false, category: { in: ALL_HEALTH_CATEGORIES } },
        select: { id: true, itemName: true, stockLevel: true, unit: true, category: true, usageType: true },
        orderBy: { itemName: 'asc' },
      })
      for (const item of healthItems) {
        const opt = {
          id: item.id,
          itemName: item.itemName,
          stockLevel: Number(item.stockLevel),
          unit: item.unit,
          usageType: item.usageType ?? null,
        }
        if (VACCINE_CATEGORIES.includes(String(item.category).toUpperCase())) vaccineInventory.push(opt)
        else medicineInventory.push(opt)
      }
    }

    feedInventory = await tx.inventory
      .findMany({
        where: { farmId: activeFarmId, isDeleted: false, category: { in: FEED_CATEGORIES } },
        select: { id: true, itemName: true, stockLevel: true, unit: true },
        orderBy: { itemName: 'asc' },
      })
      .then((rows: any[]) =>
        rows.map((r) => ({ id: r.id, itemName: r.itemName, stockLevel: Number(r.stockLevel), unit: r.unit }))
      )
      .catch(() => [])

    // ---- Derived metrics --------------------------------------------------
    const arrivalDate = new Date(batch.arrivalDate)
    const ageInDays = Math.max(0, Math.floor((Date.now() - arrivalDate.getTime()) / 86_400_000))
    const totalFeed = batch.feedingLogs.reduce((s: number, l: any) => s + Number(l.amountConsumed || 0), 0)
    const totalEggs = batch.eggProduction.reduce((s: number, e: any) => s + Number(e.eggsCollected || 0), 0)
    const deadRecords = batch.mortalityRecords.filter((m: any) => m.type === 'DEAD')
    const totalMortality = deadRecords.reduce((s: number, m: any) => s + Number(m.count || 0), 0)
    const mortalityRate = batch.initialCount > 0 ? (totalMortality / batch.initialCount) * 100 : 0
    const latestWeight = Number(batch.weightRecords[0]?.averageWeight || 0)
    const fcr = latestWeight > 0 ? totalFeed / (batch.currentCount * latestWeight) : 0

    const validRevenueItems = revenueItems.filter(
      (item: any) => String(item.order?.status || '').toUpperCase() !== 'CANCELLED'
    )
    const totalRevenue = validRevenueItems.reduce((s: number, i: any) => s + Number(i.totalPrice || 0), 0)
    const directExpenseTotal = directExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
    const allocatedList = allocations.filter((a: any) => !a.expense?.isDeleted)
    const allocatedExpenseTotal = allocatedList.reduce((s: number, a: any) => s + Number(a.allocatedAmount || 0), 0)
    const generalPoolTotal = generalExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
    const generalAllocatedTotal = generalPoolTotal * headcountShare
    const totalExpenses = directExpenseTotal + allocatedExpenseTotal + generalAllocatedTotal
    const netProfit = totalRevenue - totalExpenses

    // ---- Finance monthly series (Expenses vs Revenue) ---------------------
    const financeMap = new Map<string, { revenue: number; expenses: number }>()
    const bump = (key: string, field: 'revenue' | 'expenses', value: number) => {
      const row = financeMap.get(key) || { revenue: 0, expenses: 0 }
      row[field] += value
      financeMap.set(key, row)
    }
    validRevenueItems.forEach((i: any) => bump(monthKey(new Date(i.order.orderDate)), 'revenue', Number(i.totalPrice || 0)))
    directExpenses.forEach((e: any) => bump(monthKey(new Date(e.expenseDate)), 'expenses', Number(e.amount || 0)))
    allocatedList.forEach((a: any) =>
      bump(monthKey(new Date(a.expense.expenseDate)), 'expenses', Number(a.allocatedAmount || 0))
    )
    generalExpenses.forEach((e: any) =>
      bump(monthKey(new Date(e.expenseDate)), 'expenses', Number(e.amount || 0) * headcountShare)
    )
    const financeMonthly = Array.from(financeMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({
        label: monthLabel(key),
        revenue: Math.round(v.revenue * 100) / 100,
        expenses: Math.round(v.expenses * 100) / 100,
        profit: Math.round((v.revenue - v.expenses) * 100) / 100,
      }))

    // ---- Egg daily series -------------------------------------------------
    const eggMap = new Map<string, number>()
    batch.eggProduction.forEach((e: any) =>
      eggMap.set(dayKey(new Date(e.logDate)), (eggMap.get(dayKey(new Date(e.logDate))) || 0) + Number(e.eggsCollected || 0))
    )
    const eggDaily = Array.from(eggMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([key, eggs]) => ({ label: dayLabel(key), eggs }))

    // ---- Mortality daily series (deaths + cumulative rate) ----------------
    const mortMap = new Map<string, number>()
    deadRecords.forEach((m: any) =>
      mortMap.set(dayKey(new Date(m.logDate)), (mortMap.get(dayKey(new Date(m.logDate))) || 0) + Number(m.count || 0))
    )
    let cumulative = 0
    const mortalityDaily = Array.from(mortMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([key, deaths]) => {
        cumulative += deaths
        return {
          label: dayLabel(key),
          deaths,
          rate: batch.initialCount > 0 ? Math.round((cumulative / batch.initialCount) * 10000) / 100 : 0,
        }
      })

    // ---- Sales daily series ----------------------------------------------
    const salesMap = new Map<string, { revenue: number; units: number }>()
    validRevenueItems.forEach((i: any) => {
      const key = dayKey(new Date(i.order.orderDate))
      const row = salesMap.get(key) || { revenue: 0, units: 0 }
      row.revenue += Number(i.totalPrice || 0)
      row.units += Number(i.quantity || 0)
      salesMap.set(key, row)
    })
    const salesDaily = Array.from(salesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([key, v]) => ({ label: dayLabel(key), revenue: Math.round(v.revenue * 100) / 100, units: v.units }))

    // ---- Expense breakdown (combined direct + allocated) ------------------
    const expenseBreakdown = [
      ...directExpenses.map((e: any) => ({
        id: e.id,
        date: e.expenseDate,
        category: e.category,
        description: e.description || '—',
        amount: Number(e.amount || 0),
        kind: 'Direct' as const,
        percentage: null as number | null,
      })),
      ...allocatedList.map((a: any) => ({
        id: a.id,
        date: a.expense.expenseDate,
        category: a.expense.category,
        description: a.expense.description || '—',
        amount: Number(a.allocatedAmount || 0),
        kind: 'Allocated' as const,
        percentage: a.allocationPercentage != null ? Number(a.allocationPercentage) : null,
      })),
      ...generalExpenses.map((e: any) => ({
        id: e.id,
        date: e.expenseDate,
        category: e.category,
        description: e.description || '—',
        amount: Number(e.amount || 0) * headcountShare,
        kind: 'General' as const,
        percentage: Math.round(headcountShare * 10000) / 100,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 25)

    const isLayer = batch.type === 'POULTRY_LAYER'

    return serialize({
      batch: {
        id: batch.id,
        batchName: batch.batchName,
        breedType: batch.breedType,
        type: batch.type,
        status: batch.status,
        arrivalDate: batch.arrivalDate,
        initialCount: batch.initialCount,
        currentCount: batch.currentCount,
        isolationCount: batch.isolationCount,
        localBatchId: batch.localBatchId,
        house: batch.house ? { id: batch.house.id, name: batch.house.name } : null,
        initialCostActual: batch.initialCostActual ? Number(batch.initialCostActual) : 0,
        initialCostCarriage: batch.initialCostCarriage ? Number(batch.initialCostCarriage) : 0,
        initialCostOther: (batch.initialCostOther as any) || [],
      },
      logs: {
        weightRecords: batch.weightRecords.map((r: any) => ({ ...r, averageWeight: Number(r.averageWeight) })),
        feedingLogs: batch.feedingLogs.map((l: any) => ({ ...l, amountConsumed: Number(l.amountConsumed) })),
        eggProduction: batch.eggProduction,
        mortalityRecords: batch.mortalityRecords,
        vaccinations: batch.vaccinations,
        medications: batch.medications,
      },
      metrics: {
        ageInDays,
        totalFeed,
        totalEggs,
        totalMortality,
        mortalityRate: Math.round(mortalityRate * 100) / 100,
        latestWeight,
        fcr: Math.round(fcr * 100) / 100,
        isLayer,
      },
      finance: {
        canViewFinance,
        canEditFinance,
        directExpenseTotal,
        allocatedExpenseTotal,
        generalAllocatedTotal,
        generalPoolTotal,
        headcountSharePct: Math.round(headcountShare * 10000) / 100,
        totalExpenses,
        totalRevenue,
        netProfit,
        expenseBreakdown,
      },
      series: { financeMonthly, eggDaily, mortalityDaily, salesDaily },
      forms: {
        canEditHealth,
        vaccineInventory,
        medicineInventory,
        feedInventory,
        allocationBatches: allocationBatches.map((b: any) => ({
          id: b.id,
          name: b.batchName || `Batch ${b.localBatchId || b.id}`,
          currentCount: b.currentCount,
        })),
      },
    })
  }).catch((error: any) => {
    console.error('Error fetching flock deep dive:', error)
    return null
  })
}
