type NavigationPermissions = Record<string, boolean | null | undefined>

const NAV_PERMISSION_MAP: Record<string, string[]> = {
  'Finance Control': ['canViewFinance', 'canEditFinance'],
  'Finance Hub': ['canViewFinance', 'canEditFinance'],
  Reports: ['canViewFinance', 'canEditFinance'],
  Livestock: ['canViewBatches', 'canEditBatches'],
  Analytics: ['canViewBatches', 'canEditBatches'],
  Inventory: ['canViewInventory', 'canEditInventory'],
  Sales: ['canViewSales', 'canEditSales'],
  Eggs: ['canViewEggs', 'canEditEggs'],
  Feeding: ['canViewFeeding', 'canEditFeeding'],
  Houses: ['canViewHouses', 'canEditHouses'],
  Mortality: ['canViewMortality', 'canEditMortality'],
  Quarantine: ['canViewMortality', 'canEditMortality'],
  Customers: ['canViewCustomers', 'canEditCustomers'],
  Suppliers: ['canViewCustomers', 'canEditCustomers'],
  'Team Management': ['canViewTeam', 'canEditTeam'],
  Team: ['canViewTeam', 'canEditTeam'],
}

export function canShowNavigationItem({
  name,
  role,
  roles,
  permissions,
}: {
  name: string
  role?: string
  roles: string[]
  permissions?: NavigationPermissions | null
}) {
  if (role === 'OWNER' || role === 'MANAGER') return true
  if (!role || !roles.includes(role)) return false

  const permissionKeys = NAV_PERMISSION_MAP[name]
  if (!permissionKeys) return true

  return permissionKeys.some((key) => !!permissions?.[key])
}
