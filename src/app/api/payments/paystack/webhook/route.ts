import { NextResponse } from 'next/server'
import { isValidPaystackSignature } from '@/lib/billing/paystack'
import { fulfillPaystackPayment } from '@/lib/billing/paystack-fulfillment'

export const runtime = 'nodejs'

/**
 * Paystack webhook. Configure in the Paystack dashboard as
 * https://<your-domain>/api/payments/paystack/webhook
 */
export async function POST(req: Request) {
  const rawBody = await req.text()

  if (!isValidPaystackSignature(rawBody, req.headers.get('x-paystack-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { event?: string; data?: { reference?: string } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (event.event !== 'charge.success' || !event.data?.reference) {
    return NextResponse.json({ received: true })
  }

  try {
    const result = await fulfillPaystackPayment(event.data.reference)
    if (!result.ok) {
      console.warn('[paystack-webhook] not fulfilled', { reference: event.data.reference, reason: result.reason })
    }
    return NextResponse.json({ received: true })
  } catch (error) {
    // A 5xx makes Paystack retry the webhook later.
    console.error('[paystack-webhook] fulfillment failed', { reference: event.data.reference, error })
    return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 })
  }
}
