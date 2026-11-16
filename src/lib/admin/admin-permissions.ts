// Admin console roles and what each may do. Client-safe (used by the nav).

export const ADMIN_ROLES = ['SUPER_ADMIN', 'BILLING', 'SUPPORT'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

export const ADMIN_PERMISSIONS = [
  /** Farm list and detail, activity log. */
  'farms.view',
  /** Upgrade, extend trial, revoke, per-farm overrides, bulk trial extension. */
  'farms.manage',
  /** Manual payments, license issue/renew, hardware binding. */
  'payments.manage',
  /** Plans & pricing, promo codes. */
  'pricing.manage',
  /** Site, system, farm defaults and message settings. */
  'settings.manage',
  /** Admin accounts and roles. */
  'admins.manage',
] as const
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]

export const ADMIN_ROLE_DETAILS: Record<AdminRole, { label: string; description: string }> = {
  SUPER_ADMIN: { label: 'Super admin', description: 'Everything, including admin accounts and system settings.' },
  BILLING: { label: 'Billing', description: 'Farms, payments, licenses, plans and promo codes. No settings or admin accounts.' },
  SUPPORT: { label: 'Support', description: 'Read-only: farms and the activity log.' },
}

const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  SUPER_ADMIN: ADMIN_PERMISSIONS,
  BILLING: ['farms.view', 'farms.manage', 'payments.manage', 'pricing.manage'],
  SUPPORT: ['farms.view'],
}

export function isAdminRole(value: unknown): value is AdminRole {
  return (ADMIN_ROLES as readonly unknown[]).includes(value)
}

/** Unknown roles get no permissions rather than falling back to full access. */
export function adminCan(role: string | null | undefined, permission: AdminPermission) {
  return isAdminRole(role) && ROLE_PERMISSIONS[role].includes(permission)
}
