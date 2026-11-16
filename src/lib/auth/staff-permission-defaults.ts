export type StaffPermissions = {
  canViewFinance?: boolean
  canEditFinance?: boolean
  canViewInventory?: boolean
  canEditInventory?: boolean
  canViewBatches?: boolean
  canEditBatches?: boolean
  canViewSales?: boolean
  canEditSales?: boolean
  canViewEggs?: boolean
  canEditEggs?: boolean
  canViewFeeding?: boolean
  canEditFeeding?: boolean
  canViewHouses?: boolean
  canEditHouses?: boolean
  canViewMortality?: boolean
  canEditMortality?: boolean
  canViewHealth?: boolean
  canEditHealth?: boolean
  canViewCustomers?: boolean
  canEditCustomers?: boolean
  canViewTeam?: boolean
  canEditTeam?: boolean
}

export type StaffPermissionKey = keyof StaffPermissions

/** Roles that can be given to staff (the owner always has full access). */
export const STAFF_ROLES = ['MANAGER', 'WORKER', 'ACCOUNTANT', 'FINANCE_OFFICER', 'CASHIER'] as const
export type ConfigurableStaffRole = (typeof STAFF_ROLES)[number]

/** Admin-set starting permissions per role (from the admin Farm defaults settings). */
export type RolePermissionDefaults = Partial<Record<ConfigurableStaffRole, Required<StaffPermissions>>>

/**
 * Starting permissions for a staff role. `roleDefaults` (admin-set) replaces the
 * built-in defaults for a role when present; explicit `overrides` win over both.
 */
export function getDefaultPermissionsForRole(
  role: string,
  overrides?: StaffPermissions,
  roleDefaults?: RolePermissionDefaults,
): Required<StaffPermissions> {
  const base: Required<StaffPermissions> = {
    canViewFinance: false,
    canEditFinance: false,
    canViewInventory: false,
    canEditInventory: false,
    canViewBatches: false,
    canEditBatches: false,
    canViewSales: false,
    canEditSales: false,
    canViewEggs: false,
    canEditEggs: false,
    canViewFeeding: false,
    canEditFeeding: false,
    canViewHouses: false,
    canEditHouses: false,
    canViewMortality: false,
    canEditMortality: false,
    canViewHealth: false,
    canEditHealth: false,
    canViewCustomers: false,
    canEditCustomers: false,
    canViewTeam: false,
    canEditTeam: false,
  }

  const builtInDefaults: Record<string, Partial<Required<StaffPermissions>>> = {
    WORKER: {
      canViewEggs: true,
      canEditEggs: true,
      canViewFeeding: true,
      canEditFeeding: true,
      canViewMortality: true,
      canEditMortality: true,
      canViewHealth: true,
      canEditHealth: true,
      canViewBatches: true,
    },
    MANAGER: Object.fromEntries(Object.keys(base).map((key) => [key, true])) as Required<StaffPermissions>,
    ACCOUNTANT: {
      canViewFinance: true,
      canEditFinance: true,
      canViewSales: true,
      canViewInventory: true,
    },
    FINANCE_OFFICER: {
      canViewFinance: true,
      canEditFinance: true,
      canViewSales: true,
      canEditSales: true,
      canViewInventory: true,
    },
    CASHIER: {
      canViewSales: true,
      canEditSales: true,
      canViewFinance: true,
    },
  }

  const sanitizedOverrides = Object.fromEntries(
    Object.entries(overrides ?? {}).filter(([, value]) => typeof value === 'boolean')
  ) as Partial<Required<StaffPermissions>>

  const configured = roleDefaults?.[role as ConfigurableStaffRole]
  return { ...base, ...(configured ?? builtInDefaults[role] ?? {}), ...sanitizedOverrides }
}
