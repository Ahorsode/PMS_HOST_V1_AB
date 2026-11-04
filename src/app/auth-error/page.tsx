import Link from 'next/link'
import type { Metadata } from 'next'
import { AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react'
import { auth } from '@/auth'
import { getAuthErrorCopy } from '@/lib/auth-error-messages'

export const metadata: Metadata = {
  title: 'Sign-in problem | Poultry Ledger',
}

async function getSignedInLabel() {
  // The error page must render even if the session lookup itself fails.
  try {
    const session = await auth()
    if (!session?.user?.id) return null
    return session.user.email || session.user.name || 'your account'
  } catch {
    return null
  }
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>
}) {
  const { error } = await searchParams
  const errorCode = ((Array.isArray(error) ? error[0] : error) ?? 'Default').slice(0, 64)
  const copy = getAuthErrorCopy(errorCode)
  const signedInAs = await getSignedInLabel()

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#0a0a0a] px-4 py-8 text-white">
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[120px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-6 text-center shadow-2xl backdrop-blur-2xl sm:p-9">
          <img
            src="/logo.png"
            alt="Poultry Ledger logo"
            className="mx-auto mb-6 h-16 w-16 rounded-lg object-cover shadow-lg shadow-emerald-500/20"
          />

          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/15">
            <AlertTriangle className="h-6 w-6 text-amber-300" aria-hidden="true" />
          </div>

          <h1 className="text-2xl font-bold text-white">{copy.title}</h1>
          <p className="mt-3 text-base leading-relaxed text-white/80">{copy.message}</p>

          {signedInAs && (
            <p className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300">
              You are still signed in as {signedInAs}.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {signedInAs ? (
              <Link
                href="/dashboard"
                className="flex h-12 items-center justify-center gap-2 rounded-md bg-white font-bold text-black transition-colors hover:bg-gray-100"
              >
                Continue to dashboard
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex h-12 items-center justify-center gap-2 rounded-md bg-white font-bold text-black transition-colors hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                Back to sign in
              </Link>
            )}
          </div>

          {errorCode !== 'Default' && (
            <p className="mt-5 text-xs text-white/50">Error code: {errorCode}</p>
          )}
        </div>
      </div>
    </main>
  )
}
