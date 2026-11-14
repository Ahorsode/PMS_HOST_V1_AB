import { getAuthContext } from '@/lib/auth-utils'
import { readTogether } from '@/lib/db'

/**
 * Runs a page's farm reads for the signed-in user's active farm in one
 * farm-context transaction (see readTogether in db.ts). Reads only.
 */
export async function readFarmTogether<T>(run: () => Promise<T>): Promise<T> {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return run()
  return readTogether(userId, activeFarmId, run)
}
