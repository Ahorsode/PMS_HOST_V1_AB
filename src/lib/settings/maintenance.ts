import { headers } from 'next/headers'
import { getAppSettings } from '@/lib/settings/app-settings'

export const MAINTENANCE_ERROR_PREFIX = 'MAINTENANCE:'

/**
 * While maintenance mode is on (admin System settings), farm users' server
 * actions are refused; pages still render, so records stay readable and
 * sign-in keeps working. The admin console does not go through here.
 */
export async function assertNotInMaintenance() {
  let isServerAction = false
  try {
    // Server actions are POSTs carrying the Next-Action header.
    isServerAction = !!(await headers()).get('next-action')
  } catch {
    // Outside a request (tests, scripts): nothing to block.
    return
  }
  if (!isServerAction) return

  const { maintenance } = await getAppSettings('system')
  if (maintenance.enabled) {
    throw new Error(`${MAINTENANCE_ERROR_PREFIX} ${maintenance.message}`)
  }
}
