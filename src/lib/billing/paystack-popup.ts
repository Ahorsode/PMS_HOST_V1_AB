'use client'

/** Paystack's popup checkout (InlineJS v2). Opens over our page instead of redirecting. */
const PAYSTACK_INLINE_SRC = 'https://js.paystack.co/v2/inline.js'

type PopupCallbacks = {
  onSuccess: (transaction: { reference: string }) => void
  onCancel: () => void
  onError?: (error: { message?: string }) => void
}

type PaystackPopInstance = {
  resumeTransaction: (accessCode: string, callbacks: PopupCallbacks) => void
}

declare global {
  interface Window {
    PaystackPop?: new () => PaystackPopInstance
  }
}

let loading: Promise<NonNullable<Window['PaystackPop']>> | null = null

function loadPaystackPop() {
  if (window.PaystackPop) return Promise.resolve(window.PaystackPop)

  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = PAYSTACK_INLINE_SRC
    script.async = true
    script.onload = () => (window.PaystackPop ? resolve(window.PaystackPop) : reject(new Error('Paystack did not load')))
    script.onerror = () => reject(new Error('Paystack did not load'))
    document.head.appendChild(script)
  }).catch((error) => {
    loading = null
    throw error
  }) as Promise<NonNullable<Window['PaystackPop']>>

  return loading
}

export type PopupResult =
  | { outcome: 'success'; reference: string }
  | { outcome: 'cancelled' }
  | { outcome: 'error'; message: string }

/**
 * Opens the popup for a transaction the server already initialized. Rejects
 * only when the script cannot load, so callers can fall back to the
 * Paystack-hosted page.
 */
export async function openPaystackPopup(accessCode: string): Promise<PopupResult> {
  const PaystackPop = await loadPaystackPop()

  return new Promise((resolve) => {
    new PaystackPop().resumeTransaction(accessCode, {
      onSuccess: (transaction) => resolve({ outcome: 'success', reference: transaction.reference }),
      onCancel: () => resolve({ outcome: 'cancelled' }),
      onError: (error) => resolve({ outcome: 'error', message: error?.message || 'Payment could not be completed' }),
    })
  })
}
