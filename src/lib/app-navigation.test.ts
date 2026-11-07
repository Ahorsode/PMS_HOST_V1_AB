import { describe, expect, it } from 'vitest'
import {
  APP_NAV_CATEGORIES,
  DASHBOARD_NAV_ITEM,
  canShowDashboardNavItem,
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

const hrefsFor = (role?: string, permissions?: Record<string, boolean> | null) => [
  ...(canShowDashboardNavItem(role, permissions) ? [DASHBOARD_NAV_ITEM.href] : []),
  ...getVisibleNavCategories(role, permissions).flatMap((category) => category.items.map((item) => item.href)),
]

describe('APP_NAV_CATEGORIES', () => {
  it('has exactly three groups after the Dashboard link', () => {
    expect(APP_NAV_CATEGORIES.map((category) => category.name)).toEqual(['Farm', 'Business', 'Governance'])
  })

  it('keeps Dashboard as its own link rather than inside a group', () => {
    const groupedHrefs = APP_NAV_CATEGORIES.flatMap((category) => category.items.map((item) => item.href))
    expect(groupedHrefs).not.toContain(DASHBOARD_NAV_ITEM.href)
  })

  it('keeps every legacy sidebar destination reachable for owners', () => {
    expect(hrefsFor('OWNER').sort()).toEqual([...LEGACY_SIDEBAR_HREFS].sort())
  })
})

describe('getVisibleNavCategories', () => {
  it('drops groups with no visible items', () => {
    const groups = getVisibleNavCategories('CASHIER', { canViewSales: true })
    expect(groups.map((group) => group.id)).toEqual(['business', 'governance'])
  })

  it('still applies per-item permissions for workers', () => {
    const hrefs = hrefsFor('WORKER', { canViewEggs: true })
    expect(hrefs).toContain('/dashboard/eggs')
    expect(hrefs).not.toContain('/dashboard/flocks')
    expect(hrefs).not.toContain('/dashboard/settings')
  })

  it('always leaves workers the governance group for profile and sign-out', () => {
    const governance = getVisibleNavCategories('WORKER', null).find((group) => group.id === 'governance')
    expect(governance?.items.map((item) => item.href)).toEqual(['/dashboard/profile'])
  })

  it('keeps the Dashboard link role rules (hidden for cashiers)', () => {
    expect(canShowDashboardNavItem('WORKER', null)).toBe(true)
    expect(canShowDashboardNavItem('CASHIER', { canViewSales: true })).toBe(false)
  })
})

describe('getActiveNavCategoryId', () => {
  const groups = getVisibleNavCategories('OWNER')

  it('highlights the group holding the current page or its subpages', () => {
    expect(getActiveNavCategoryId('/dashboard/flocks/abc', groups)).toBe('farm')
    expect(getActiveNavCategoryId('/dashboard/sales/customers/1/statement', groups)).toBe('business')
    expect(getActiveNavCategoryId('/dashboard/settings', groups)).toBe('governance')
  })

  it('returns null for the Dashboard and pages outside the groups', () => {
    expect(getActiveNavCategoryId('/dashboard', groups)).toBeNull()
    expect(getActiveNavCategoryId('/dashboard/climate', groups)).toBeNull()
  })
})
