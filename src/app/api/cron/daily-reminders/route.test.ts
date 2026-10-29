import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ farmFindMany: vi.fn() }))

vi.mock('@/lib/db', () => ({ default: { farm: { findMany: mocks.farmFindMany } } }))
vi.mock('@/lib/reminders/farm-reminders', () => ({ buildDailyReminderAlerts: vi.fn(() => []) }))

import { GET } from './route'

function call(authorization?: string) {
  return GET(new Request('http://localhost/api/cron/daily-reminders', {
    headers: authorization ? { authorization } : {},
  }))
}

describe('daily reminders cron', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllEnvs())

  it('rejects every request when CRON_SECRET is not configured', async () => {
    vi.stubEnv('CRON_SECRET', '')
    const response = await call('Bearer anything')
    expect(response.status).toBe(401)
    expect(mocks.farmFindMany).not.toHaveBeenCalled()
  })

  it('rejects a wrong secret', async () => {
    vi.stubEnv('CRON_SECRET', 'correct-secret')
    const response = await call('Bearer wrong')
    expect(response.status).toBe(401)
    expect(mocks.farmFindMany).not.toHaveBeenCalled()
  })

  it('returns only aggregate counts for the right secret', async () => {
    vi.stubEnv('CRON_SECRET', 'correct-secret')
    mocks.farmFindMany.mockResolvedValue([])
    const response = await call('Bearer correct-secret')
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).not.toHaveProperty('results')
    expect(body.farmsEvaluated).toBe(0)
  })
})
