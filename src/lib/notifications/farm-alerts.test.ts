import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ default: {} }))
vi.mock('@/lib/auth-utils', () => ({ getAuthContext: vi.fn() }))
vi.mock('@/lib/actions/staff-actions', () => ({ checkWorkerPermissions: vi.fn() }))

import { buildFarmAlerts, type FarmAlertInput } from './farm-alerts'

const now = new Date(2026, 10, 7, 19, 0)
const allowed = { logEggs: true, logFeed: true, viewHealth: true, viewInventory: true }

function input(overrides: Partial<FarmAlertInput> = {}): FarmAlertInput {
  return {
    now,
    can: allowed,
    eggRecordReminderTime: '18:00',
    feedRecordReminderTime: '18:00',
    hasEggLogToday: true,
    hasFeedLogToday: true,
    activeLayerBatchCount: 1,
    vaccinations: [],
    medications: [],
    feedStock: [],
    ...overrides,
  }
}

describe('buildFarmAlerts', () => {
  it('returns nothing when the day is logged and nothing is due', () => {
    expect(buildFarmAlerts(input())).toEqual([])
  })

  it('reminds about missing logs only to people who can log them', () => {
    const missing = { hasEggLogToday: false, hasFeedLogToday: false }
    expect(buildFarmAlerts(input(missing)).map((a) => a.kind)).toEqual(['EGGS', 'FEED'])
    expect(buildFarmAlerts(input({ ...missing, can: { ...allowed, logEggs: false } })).map((a) => a.kind)).toEqual(['FEED'])
  })

  it('marks past health tasks as overdue and ranks them first', () => {
    const alerts = buildFarmAlerts(
      input({
        hasFeedLogToday: false,
        vaccinations: [{ id: 'v1', name: 'Gumboro', batchName: 'Layers A', scheduledDate: new Date(2026, 10, 9) }],
        medications: [{ id: 'm1', name: 'Amprolium', batchName: 'Layers A', scheduledDate: new Date(2026, 10, 5) }],
      }),
    )
    expect(alerts[0]).toMatchObject({ kind: 'MEDICATION', title: 'Medication overdue', severity: 'urgent' })
    expect(alerts[0].message).toBe('Amprolium for Layers A was due 2 days ago.')
    expect(alerts.find((a) => a.kind === 'VACCINE')?.message).toBe('Gumboro for Layers A is due in 2 days.')
  })

  it('hides health and stock alerts from staff without access', () => {
    const alerts = buildFarmAlerts(
      input({
        can: { ...allowed, viewHealth: false, viewInventory: false },
        vaccinations: [{ id: 'v1', name: 'Gumboro', batchName: 'A', scheduledDate: now }],
        feedStock: [{ id: 'f1', itemName: 'Layer mash', stockLevel: 0, unit: 'kg' }],
      }),
    )
    expect(alerts).toEqual([])
  })

  it('flags feed under its reorder level', () => {
    const alerts = buildFarmAlerts(
      input({
        feedStock: [
          { id: 'f1', itemName: 'Layer mash', stockLevel: 40, reorderLevel: 100, unit: 'kg' },
          { id: 'f2', itemName: 'Grower', stockLevel: 0, reorderLevel: 100, unit: 'kg' },
          { id: 'f3', itemName: 'Starter', stockLevel: 900, reorderLevel: 100, unit: 'kg' },
        ],
      }),
    )
    expect(alerts.map((a) => [a.id, a.title])).toEqual([
      ['low-feed:f2', 'Feed out of stock'],
      ['low-feed:f1', 'Feed running low'],
    ])
  })
})
