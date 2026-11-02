'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, KeyRound, LockKeyhole, LogIn, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { loginAdmin, verifyAdminLoginCode } from '@/lib/actions/admin-login-actions'

const inputClass =
  'h-12 w-full rounded-2xl border border-[#f7f1df]/10 bg-[#0f100b] px-4 text-sm font-bold text-[#fff9e8] outline-none transition placeholder:text-[#c5ba9a]/45 focus:border-[#d8c78f]/45 focus:ring-4 focus:ring-[#d8c78f]/10 disabled:opacity-50'

export default function AdminLoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'password' | 'code'>('password')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return

    setError(null)

    startTransition(async () => {
      try {
        const result =
          step === 'password'
            ? await loginAdmin({ username, password, callbackUrl })
            : await verifyAdminLoginCode({ code, callbackUrl })

        if (!result.success) {
          setError(result.error)
          // A code step that expired starts over from the password.
          if (step === 'code' && result.error.includes('again')) setStep('password')
          return
        }

        if ('needsCode' in result) {
          setStep('code')
          setCode('')
          return
        }

        router.replace(result.redirectTo)
        router.refresh()
      } catch (error) {
        console.error('[AdminLoginForm] login failed', error)
        setError('Admin login failed. Please refresh and try again.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-md flex-col gap-6">
      <div>
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d8c78f]/25 bg-[#d8c78f]/10 text-[#fff0b8]">
          {step === 'password' ? <ShieldCheck className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
        </div>
        <h2 className="mt-6 text-3xl font-black tracking-[-0.04em] text-[#fff9e8]">
          {step === 'password' ? 'Admin login' : 'Enter your code'}
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#d7ccb0]/80">
          {step === 'password'
            ? 'Sign in with your admin username and password.'
            : 'Open your authenticator app and enter the 6-digit code for Poultry Ledger Admin.'}
        </p>
      </div>

      {step === 'password' ? (
        <div className="grid gap-4">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#d8c78f]">Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={isPending}
              autoComplete="username"
              className={inputClass}
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#d8c78f]">Password</span>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d8c78f]/60" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isPending}
                type="password"
                autoComplete="current-password"
                className={`${inputClass} pl-11`}
                placeholder="Enter password"
                required
              />
            </div>
          </label>
        </div>
      ) : (
        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-[#d8c78f]">6-digit code</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={isPending}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            className={`${inputClass} text-center font-mono text-2xl tracking-[0.5em]`}
            placeholder="000000"
            required
          />
        </label>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-[1.25rem] border border-red-300/25 bg-red-300/10 p-4 text-sm font-bold text-red-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Button
        type="submit"
        isLoading={isPending}
        loadingText={step === 'password' ? 'Signing in...' : 'Checking...'}
        disabled={step === 'code' && code.length !== 6}
        className="h-12 bg-gradient-to-r from-[#d9a441] to-[#2f9f83] text-[#11140d] shadow-[#d9a441]/20"
      >
        <LogIn className="h-4 w-4" />
        {step === 'password' ? 'Sign in' : 'Verify and sign in'}
      </Button>

      {step === 'code' ? (
        <button type="button" onClick={() => { setStep('password'); setError(null) }} className="text-xs font-semibold text-[#d7ccb0]/70 hover:text-[#fff9e8]">
          Use a different account
        </button>
      ) : null}
    </form>
  )
}
