/**
 * Allocates feed & medication inventory costs to batches by recorded usage,
 * not by headcount. If a batch consumed 100% of an item, it gets 100% of that cost.
 */

import type { ExpenseLike, HeadcountBatch } from './batch-finance'
import { computeHeadcountShare } from './batch-finance'

export type FeedingLogLike = {
  batchId?: string | null
  feedTypeId?: string | null
  amountConsumed: number | string
}

export type HealthScheduleLike = {
  batchId: string
  name: string
  quantity?: number | string | null
  status?: string | null
}

export type InventoryItemLike = {
  id: string
  itemName: string
}

type UsageTotals = {
  total: number
  byBatch: Map<string, number>
}

export type ConsumptionContext = {
  feedByInventoryId: Map<string, UsageTotals>
  healthByItemName: Map<string, UsageTotals>
  inventoryIdByName: Map<string, string>
}

function normalizeName(value: string) {
  return value.trim().toLowerCase()
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function addUsage(map: Map<string, UsageTotals>, key: string, batchId: string, qty: number) {
  if (!batchId || qty <= 0) return
  const row = map.get(key) || { total: 0, byBatch: new Map<string, number>() }
  row.total += qty
  row.byBatch.set(batchId, (row.byBatch.get(batchId) || 0) + qty)
  map.set(key, row)
}

export function buildConsumptionContext(input: {
  feedingLogs: FeedingLogLike[]
  vaccinations: HealthScheduleLike[]
  medications: HealthScheduleLike[]
  inventoryItems: InventoryItemLike[]
}): ConsumptionContext {
  const feedByInventoryId = new Map<string, UsageTotals>()
  const healthByItemName = new Map<string, UsageTotals>()
  const inventoryIdByName = new Map<string, string>()

  for (const item of input.inventoryItems) {
    inventoryIdByName.set(normalizeName(item.itemName), item.id)
  }

  for (const log of input.feedingLogs) {
    const batchId = log.batchId
    const feedTypeId = log.feedTypeId
    const qty = Number(log.amountConsumed || 0)
    if (!batchId || !feedTypeId || qty <= 0) continue
    addUsage(feedByInventoryId, feedTypeId, batchId, qty)
  }

  const healthRows = [...input.vaccinations, ...input.medications]
  for (const row of healthRows) {
    if (String(row.status || '').toUpperCase() !== 'COMPLETED') continue
    const qty = Number(row.quantity || 0)
    if (!row.batchId || qty <= 0 || !row.name) continue
    addUsage(healthByItemName, normalizeName(row.name), row.batchId, qty)
  }

  return { feedByInventoryId, healthByItemName, inventoryIdByName }
}

export function parseInventoryPurchaseExpense(description: string | null | undefined) {
  const match = String(description || '').match(/^Inventory Purchase:\s*(.+?)\s*\(([0-9.]+)\s/i)
  if (!match) return null
  return { itemName: match[1].trim(), purchasedQty: Number(match[2]) }
}

export function parseHealthStockExpense(description: string | null | undefined) {
  const match = String(description || '').match(/^Health stock cost:\s*(.+?)\s*\(([0-9.]+)\s/i)
  if (!match) return null
  return { itemName: match[1].trim(), stockQty: Number(match[2]) }
}

/** Feed / medication inventory costs — allocated by batch usage, not headcount. */
export function isConsumptionBasedExpense(expense: ExpenseLike) {
  const category = String(expense.category || '').toUpperCase()
  if (parseInventoryPurchaseExpense(expense.description)) {
    return category === 'FEED' || category === 'MEDICATION'
  }
  if (parseHealthStockExpense(expense.description)) {
    return category === 'MEDICATION'
  }
  return false
}

export function filterHeadcountGeneralExpenses<T extends ExpenseLike>(expenses: T[]) {
  return expenses.filter((e) => !isConsumptionBasedExpense(e))
}

export function filterConsumptionExpenses<T extends ExpenseLike>(expenses: T[]) {
  return expenses.filter(isConsumptionBasedExpense)
}

function usageShare(batchId: string, usage: UsageTotals | undefined, headcountShare: number) {
  if (!usage || usage.total <= 0) return { share: headcountShare, basis: 'headcount' as const }
  const batchQty = usage.byBatch.get(batchId) || 0
  if (batchQty <= 0) return { share: 0, basis: 'consumption' as const }
  return { share: batchQty / usage.total, basis: 'consumption' as const }
}

export function allocateConsumptionExpense(
  expense: ExpenseLike,
  batchId: string,
  ctx: ConsumptionContext,
  activeBatches: HeadcountBatch[]
) {
  const amount = Number(expense.amount || 0)
  if (amount <= 0) return { amount: 0, sharePct: 0, basis: 'none' as const, itemName: null as string | null }

  const headcountShare = computeHeadcountShare(batchId, activeBatches)
  const inventoryPurchase = parseInventoryPurchaseExpense(expense.description)
  const healthStock = parseHealthStockExpense(expense.description)
  const itemName = inventoryPurchase?.itemName || healthStock?.itemName || null

  if (inventoryPurchase && itemName) {
    const inventoryId = ctx.inventoryIdByName.get(normalizeName(itemName))
    const usage = inventoryId ? ctx.feedByInventoryId.get(inventoryId) : undefined
    const category = String(expense.category || '').toUpperCase()

    if (category === 'FEED') {
      const { share, basis } = usageShare(batchId, usage, headcountShare)
      return { amount: roundMoney(amount * share), sharePct: roundMoney(share * 100), basis, itemName }
    }

    if (category === 'MEDICATION') {
      const medUsage = ctx.healthByItemName.get(normalizeName(itemName))
      const { share, basis } = usageShare(batchId, medUsage, headcountShare)
      return { amount: roundMoney(amount * share), sharePct: roundMoney(share * 100), basis, itemName }
    }
  }

  if (healthStock && itemName) {
    const medUsage = ctx.healthByItemName.get(normalizeName(itemName))
    const { share, basis } = usageShare(batchId, medUsage, headcountShare)
    return { amount: roundMoney(amount * share), sharePct: roundMoney(share * 100), basis, itemName }
  }

  return { amount: roundMoney(amount * headcountShare), sharePct: roundMoney(headcountShare * 100), basis: 'headcount' as const, itemName }
}
