'use server'

import prisma from '@/lib/db'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getAuthContext } from '@/lib/auth-utils'
import { checkWorkerPermissions } from './staff-actions'
import { expireTag, farmCacheTags, revalidateFarmPerformanceCaches } from '@/lib/performance/cache-tags'
import { checkRateLimit, rateLimitActionError } from '@/lib/performance/rate-limit'

export async function restoreSale(id: string) {
  const { userId, activeFarmId } = await getAuthContext()
  if (!activeFarmId) return { success: false, error: 'No active farm selected' }

  const hasEditAccess = await checkWorkerPermissions('sales', 'edit')
  if (!hasEditAccess) return { success: false, error: 'Unauthorized: Missing Edit Sales Permission' }

  const limitResult = await checkRateLimit({ policy: 'sales.write', scope: 'restoreSale', farmId: activeFarmId, userId })
  if (!limitResult.ok) return rateLimitActionError(limitResult)

  return await (prisma as any).$withFarmContext(userId, activeFarmId, async (tx: any) => {
    await tx.sale.update({
      where: { id, farmId: activeFarmId },
      data: { isDeleted: false, deletedAt: null }
    })
    revalidatePath('/dashboard/sales')
    revalidatePath('/dashboard/settings/trash')
    expireTag(farmCacheTags.sales(activeFarmId))
    revalidateFarmPerformanceCaches(activeFarmId)
    return { success: true }
  }).catch((error: any) => {
    console.error('Error restoring sale:', error)
    return { success: false, error: 'Failed to restore sale' }
  })
}
