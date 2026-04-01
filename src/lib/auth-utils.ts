import { auth } from '@/auth'
import prisma from '@/lib/db'

export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Remove all non-numeric characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it starts with 0 and doesn't have a country code, assume +233 (Ghana) as default for this app
  // or just leave it as is if it's already got a +.
  if (cleaned.startsWith('0') && !cleaned.startsWith('+')) {
    cleaned = '+233' + cleaned.substring(1);
  } else if (!cleaned.startsWith('+') && cleaned.length >= 9) {
    // If it's 9+ digits and no +, prepend +
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

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
