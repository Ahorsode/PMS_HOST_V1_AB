import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const PAYSTACK_API = 'https://api.paystack.co'

export type PaystackTransaction = {
  status: string
  reference: string
  amount: number
  currency: string
  channel?: string
  paid_at?: string | null
  customer?: { email?: string }
}

type PaystackResponse<T> = {
  status: boolean
  message: string
  data: T
}

export class PaystackError extends Error {}

function getSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new PaystackError('Missing PAYSTACK_SECRET_KEY')
  return key
}

export function isPaystackConfigured() {
  return !!process.env.PAYSTACK_SECRET_KEY
}

async function paystackRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  })

  const body = (await response.json().catch(() => null)) as PaystackResponse<T> | null
  if (!response.ok || !body?.status) {
    throw new PaystackError(body?.message || `Paystack request failed (${response.status})`)
  }
  return body.data
}

export function createPaystackReference() {
  return `PL-${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`.toUpperCase()
}

export async function initializePaystackTransaction(input: {
  email: string
  amountPesewas: number
  reference: string
  callbackUrl: string
  metadata: Record<string, unknown>
}) {
  return paystackRequest<{ authorization_url: string; access_code: string; reference: string }>(
    '/transaction/initialize',
    {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        amount: input.amountPesewas,
        currency: 'GHS',
        reference: input.reference,
        callback_url: input.callbackUrl,
        channels: ['mobile_money', 'card', 'bank_transfer'],
        metadata: input.metadata,
      }),
    },
  )
}

export async function verifyPaystackTransaction(reference: string) {
  return paystackRequest<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`)
}

/** Paystack signs webhook bodies with HMAC-SHA512 of the raw body using the secret key. */
export function isValidPaystackSignature(rawBody: string, signature: string | null, secret = process.env.PAYSTACK_SECRET_KEY) {
  if (!signature || !secret) return false
  const expected = createHmac('sha512', secret).update(rawBody).digest('hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  const actualBuffer = Buffer.from(signature, 'hex')
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer)
}
