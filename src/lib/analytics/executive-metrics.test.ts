import { describe, expect, it } from 'vitest'
import { computeProfitTrend, sumRevenueBeforeDay } from './executive-metrics'

const day = (date: Date) => date.toISOString().split('T')[0]

describe('sumRevenueBeforeDay', () => {
  it('adds sales and orders dated before the cutoff day only', () => {
    const total = sumRevenueBeforeDay({
      sales: [
        { saleDate: new Date('2026-11-05T09:00:00Z'), totalAmount: '100.50' },
        { saleDate: new Date('2026-11-11T09:00:00Z'), totalAmount: 999 },
      ],
      orders: [
        { orderDate: new Date('2026-11-10T23:00:00Z'), totalAmount: 200 },
        { orderDate: new Date('2026-11-12T08:00:00Z'), totalAmount: 999 },
      ],
      beforeDay: '2026-11-11',
      dayOf: day,
    })
    expect(total).toBe(300.5)
  })

  it('is zero when nothing falls before the cutoff', () => {
    expect(
      sumRevenueBeforeDay({ sales: [], orders: [], beforeDay: '2026-11-11', dayOf: day }),
    ).toBe(0)
  })

  it('skips amounts that are not numbers', () => {
    const total = sumRevenueBeforeDay({
      sales: [{ saleDate: new Date('2026-11-05T09:00:00Z'), totalAmount: null }],
      orders: [{ orderDate: new Date('2026-11-05T09:00:00Z'), totalAmount: 'n/a' }],
      beforeDay: '2026-11-11',
      dayOf: day,
    })
    expect(total).toBe(0)
  })
})

describe('computeProfitTrend', () => {
  it('compares this period with the previous one', () => {
    expect(computeProfitTrend({ currentPeriodRevenue: 150, previousPeriodRevenue: 100 })).toBe(50)
    expect(computeProfitTrend({ currentPeriodRevenue: 50, previousPeriodRevenue: 100 })).toBe(-50)
  })

  it('reports 100% only when there was nothing before', () => {
    expect(computeProfitTrend({ currentPeriodRevenue: 10, previousPeriodRevenue: 0 })).toBe(100)
    expect(computeProfitTrend({ currentPeriodRevenue: 0, previousPeriodRevenue: 0 })).toBe(0)
  })
})
