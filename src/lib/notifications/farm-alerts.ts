import prisma, { type DbTransactionClient } from '@/lib/db'
import { getAuthContext } from '@/lib/auth-utils'
import { checkWorkerPermissions } from '@/lib/actions/staff-actions'
import { feedCategoryFilter, isLowStock, type StockItem } from '@/lib/inventory/feed-categories'
import { buildDailyReminderAlerts } from '@/lib/reminders/farm-reminders'

/** How far ahead a pending vaccination or medication counts as due. */
const HEALTH_LOOKAHEAD_DAYS = 3

export type FarmAlert = {
  id: string
  kind: 'EGGS' | 'FEED' | 'VACCINE' | 'MEDICATION' | 'LOW_FEED'
  title: string
  message: string
  severity: 'urgent' | 'warning' | 'info'
  href: string
  actionLabel: string
}

type HealthTask = { id: string; name: string; batchName: string; scheduledDate: Date }

export type FarmAlertInput = {
  now: Date
  /** What this user may see or do; each alert is gated on one of these. */
  can: { logEggs: boolean; logFeed: boolean; viewHealth: boolean; viewInventory: boolean }
  eggRecordReminderTime?: string | null
  feedRecordReminderTime?: string | null
  hasEggLogToday: boolean
  hasFeedLogToday: boolean
  activeLayerBatchCount: number
  vaccinations: HealthTask[]
  medications: HealthTask[]
  feedStock: (StockItem & { id: string; itemName: string; unit?: string | null })[]
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function describeDue(scheduledDate: Date, now: Date): { when: string; overdue: boolean } {
  const days = Math.round((startOfDay(scheduledDate).getTime() - startOfDay(now).getTime()) / 86_400_000)
  if (days < 0) return { when: days === -1 ? 'was due yesterday' : `was due ${-days} days ago`, overdue: true }
  if (days === 0) return { when: 'is due today', overdue: false }
  if (days === 1) return { when: 'is due tomorrow', overdue: false }
  return { when: `is due in ${days} days`, overdue: false }
}

/**
 * Things on this farm that need someone to act: missing daily logs, health
 * tasks due, feed running low. Only alerts the user can act on are returned,
 * most urgent first.
 */
export function buildFarmAlerts(input: FarmAlertInput): FarmAlert[] {
  const { now, can } = input
  const alerts: FarmAlert[] = []

  for (const reminder of buildDailyReminderAlerts({
    eggRecordReminderTime: input.eggRecordReminderTime,
    feedRecordReminderTime: input.feedRecordReminderTime,
    hasEggLogToday: input.hasEggLogToday,
    hasFeedLogToday: input.hasFeedLogToday,
    activeLayerBatchCount: input.activeLayerBatchCount,
    now,
  })) {
    if (reminder.type === 'EGGS' && can.logEggs) {
      alerts.push({
        id: 'reminder:eggs',
        kind: 'EGGS',
        title: 'Eggs not logged today',
        message: reminder.message,
        severity: 'warning',
        href: '/dashboard/eggs',
        actionLabel: 'Log eggs',
      })
    }
    if (reminder.type === 'FEED' && can.logFeed) {
      alerts.push({
        id: 'reminder:feed',
        kind: 'FEED',
        title: 'Feeding not logged today',
        message: reminder.message,
        severity: 'warning',
        href: '/dashboard/feed',
        actionLabel: 'Log feeding',
      })
    }
  }

  if (can.viewHealth) {
    const tasks = [
      ...input.vaccinations.map((task) => ({ task, kind: 'VACCINE' as const, label: 'Vaccination' })),
      ...input.medications.map((task) => ({ task, kind: 'MEDICATION' as const, label: 'Medication' })),
    ]
    for (const { task, kind, label } of tasks) {
      const { when, overdue } = describeDue(task.scheduledDate, now)
      alerts.push({
        id: `${kind.toLowerCase()}:${task.id}`,
        kind,
        title: overdue ? `${label} overdue` : `${label} due`,
        message: `${task.name} for ${task.batchName} ${when}.`,
        severity: overdue ? 'urgent' : 'warning',
        href: '/dashboard/health',
        actionLabel: 'Open health schedule',
      })
    }
  }

  if (can.viewInventory) {
    for (const item of input.feedStock.filter(isLowStock)) {
      const stock = Number(item.stockLevel ?? 0)
      alerts.push({
        id: `low-feed:${item.id}`,
        kind: 'LOW_FEED',
        title: stock <= 0 ? 'Feed out of stock' : 'Feed running low',
        message: `${item.itemName}: ${stock.toLocaleString('en-GB')} ${item.unit || 'units'} left.`,
        severity: stock <= 0 ? 'urgent' : 'info',
        href: '/dashboard/inventory',
        actionLabel: 'Open inventory',
      })
    }
  }

  const rank = { urgent: 0, warning: 1, info: 2 }
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity])
}

/** Loads {@link buildFarmAlerts} for the signed-in user's active farm. */
export async function getFarmAlerts(now = new Date()): Promise<FarmAlert[]> {
  const { userId, activeFarmId } = await getAuthContext()
  if (!userId || !activeFarmId) return []

  const [logEggs, logFeed, viewHealth, viewInventory] = await Promise.all([
    checkWorkerPermissions('eggs', 'edit'),
    checkWorkerPermissions('feeding', 'edit'),
    checkWorkerPermissions('health', 'view'),
    checkWorkerPermissions('inventory', 'view'),
  ])

  const today = startOfDay(now)
  const dueBy = new Date(today.getTime() + (HEALTH_LOOKAHEAD_DAYS + 1) * 86_400_000)
  const healthWhere = { farmId: activeFarmId, status: 'PENDING', scheduledDate: { lt: dueBy } }
  const batch = { select: { batchName: true, localBatchId: true } }
  const batchName = (b: { batchName: string | null; localBatchId: number | null } | null, id: string) =>
    b?.batchName || (b?.localBatchId != null ? `Batch ${b.localBatchId}` : id)

  try {
    return await prisma.$withFarmContext(userId, activeFarmId, async (tx: DbTransactionClient): Promise<FarmAlert[]> => {
      const [settings, eggsToday, feedLogsToday, layerCount, vaccinations, medications, feedStock] = await Promise.all([
        tx.farmSettings.findUnique({
          where: { farmId: activeFarmId },
          select: { eggRecordReminderTime: true, feedRecordReminderTime: true },
        }),
        logEggs
          ? tx.eggProduction.aggregate({ where: { farmId: activeFarmId, logDate: { gte: today } }, _sum: { eggsCollected: true } })
          : null,
        logFeed ? tx.feedingLog.count({ where: { farmId: activeFarmId, logDate: { gte: today }, isDeleted: false } }) : 0,
        logEggs ? tx.livestock.count({ where: { farmId: activeFarmId, status: 'active', type: 'POULTRY_LAYER' } }) : 0,
        viewHealth
          ? tx.vaccinationSchedule.findMany({ where: healthWhere, orderBy: { scheduledDate: 'asc' }, take: 20, include: { batch } })
          : [],
        viewHealth
          ? tx.medicationSchedule.findMany({ where: healthWhere, orderBy: { scheduledDate: 'asc' }, take: 20, include: { batch } })
          : [],
        viewInventory
          ? tx.inventory.findMany({
              where: { farmId: activeFarmId, isDeleted: false, category: feedCategoryFilter() },
              select: { id: true, itemName: true, stockLevel: true, unit: true, category: true, reorderLevel: true },
            })
          : [],
      ])

      return buildFarmAlerts({
        now,
        can: { logEggs, logFeed, viewHealth, viewInventory },
        eggRecordReminderTime: settings?.eggRecordReminderTime,
        feedRecordReminderTime: settings?.feedRecordReminderTime,
        hasEggLogToday: Number(eggsToday?._sum?.eggsCollected ?? 0) > 0,
        hasFeedLogToday: feedLogsToday > 0,
        activeLayerBatchCount: layerCount,
        vaccinations: vaccinations.map((v) => ({
          id: v.id,
          name: v.vaccineName,
          batchName: batchName(v.batch, v.batchId),
          scheduledDate: v.scheduledDate,
        })),
        medications: medications.map((m) => ({
          id: m.id,
          name: m.medicationName,
          batchName: batchName(m.batch, m.batchId),
          scheduledDate: m.scheduledDate,
        })),
        feedStock: feedStock.map((item) => ({
          ...item,
          stockLevel: Number(item.stockLevel),
          reorderLevel: item.reorderLevel == null ? null : Number(item.reorderLevel),
        })),
      })
    })
  } catch (error) {
    console.error('Failed to load farm alerts:', error)
    return []
  }
}
