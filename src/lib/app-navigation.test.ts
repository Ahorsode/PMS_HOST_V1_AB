import { describe, expect, it } from 'vitest'
import {
  APP_NAV_CATEGORIES,
  getActiveNavCategoryId,
  getVisibleNavCategories,
} from './app-navigation'

// Every destination the sidebar linked to before it was grouped into three icons.
const LEGACY_SIDEBAR_HREFS = [
  '/dashboard',
  '/dashboard/flocks',
  '/dashboard/analytics/compare',
  '/dashboard/houses',
  '/dashboard/eggs',
  '/dashboard/feed',
  '/dashboard/mortality',
  '/dashboard/quarantine',
  '/dashboard/health',
  '/dashboard/sales',
  '/dashboard/sales/customers',
  '/dashboard/suppliers',
  '/dashboard/finance',
  '/dashboard/reports',
  '/dashboard/inventory',
  '/dashboard/admin/logs',
  '/dashboard/team',
  '/dashboard/license-upgrade',
  '/dashboard/settings',
  '/dashboard/profile',
]

const hrefsFor = (role?: string, permissions?: Record<string, boolean> | null) =>
  getVisibleNavCategories(role, permissions).flatMap((category) => category.items.map((item) => item.href))

describe('APP_NAV_CATEGORIES', () => {
  it('has exactly three top-level groups', () => {
    expect(APP_NAV_CATEGORIES.map((category) => category.id)).toEqual(['farm', 'business', 'account'])
  })

  it('keeps every legacy sidebar destination reachable for owners', () => {
    expect(hrefsFor('OWNER').sort()).toEqual([...LEGACY_SIDEBAR_HREFS].sort())
  })
})

describe('getVisibleNavCategories', () => {
  it('drops groups with no visible items', () => {
    const groups = getVisibleNavCategories('CASHIER', { canViewSales: true })
    expect(groups.map((group) => group.id)).toEqual(['business', 'account'])
  })

  it('still applies per-item permissions for workers', () => {
    const hrefs = hrefsFor('WORKER', { canViewEggs: true })
    expect(hrefs).toContain('/dashboard/eggs')
    expect(hrefs).not.toContain('/dashboard/flocks')
    expect(hrefs).not.toContain('/dashboard/settings')
  })

  it('always leaves workers the account group for profile and sign-out', () => {
    const account = getVisibleNavCategories('WORKER', null).find((group) => group.id === 'account')
    expect(account?.items.map((item) => item.href)).toEqual(['/dashboard/profile'])
  })
})

describe('getActiveNavCategoryId', () => {
  const groups = getVisibleNavCategories('OWNER')

  it('highlights the group holding the current page or its subpages', () => {
    expect(getActiveNavCategoryId('/dashboard', groups)).toBe('farm')
    expect(getActiveNavCategoryId('/dashboard/flocks/abc', groups)).toBe('farm')
    expect(getActiveNavCategoryId('/dashboard/sales/customers/1/statement', groups)).toBe('business')
    expect(getActiveNavCategoryId('/dashboard/settings', groups)).toBe('account')
  })

  it('returns null for pages outside the menu', () => {
    expect(getActiveNavCategoryId('/dashboard/climate', groups)).toBeNull()
  })
})
