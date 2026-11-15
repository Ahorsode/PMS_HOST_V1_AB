import { NextResponse } from 'next/server'
import { fulfillPaystackPayment } from '@/lib/billing/paystack-fulfillment'

export const runtime = 'nodejs'

/**
 * Where Paystack sends the customer after checkout. The webhook may arrive
 * later (or not at all in local development), so verify here too.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const reference = url.searchParams.get('reference') || url.searchParams.get('trxref')
  const redirect = new URL('/dashboard/license-upgrade', url.origin)

  if (!reference) {
    redirect.searchParams.set('payment', 'failed')
    return NextResponse.redirect(redirect)
  }

  try {
    const result = await fulfillPaystackPayment(reference)
    redirect.searchParams.set('payment', result.ok ? 'success' : 'failed')
  } catch (error) {
    console.error('[paystack-callback] verification failed', { reference, error })
    redirect.searchParams.set('payment', 'pending')
  }

  return NextResponse.redirect(redirect)
}
