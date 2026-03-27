import { auth } from '@/auth'
import prisma from '@/lib/db'

export async function getAuthContext() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }
  
  const userId = session.user.id
  let activeFarmId = session.user.activeFarmId

  if (!activeFarmId) {
    // In some cases (like initial onboarding or Google OAuth), token.activeFarmId might not be set.
    // Fetch the farm directly from the database to ensure we always have the latest linkage.
    const farm = await prisma.farm.findFirst({
      where: {
        OR: [
          { userId: userId },
          { members: { some: { userId: userId } } }
        ]
      }
    })
    
    if (farm) {
      activeFarmId = farm.id
    }
  }

  if (!activeFarmId) {
    // In some cases (like initial onboarding), there might not be an active farm yet.
    // But for most data operations, it's required.
    return { userId, activeFarmId: null }
  }

  return { userId, activeFarmId }
}
