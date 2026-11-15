'use server'

import { auth } from '@/auth'
import { recordLegalAcceptance } from '@/lib/legal-acceptance'

export async function acceptCurrentTerms() {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: 'Please sign in again.' }

  try {
    await recordLegalAcceptance(session.user.id, 'IN_APP_PROMPT')
    return { success: true }
  } catch (error) {
    console.error('[legal] Failed to record terms acceptance:', error)
    return { success: false, error: 'Could not save your acceptance. Please try again.' }
  }
}
