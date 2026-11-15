'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, LockKeyhole, LogIn, ShieldCheck } from 'lucide-react'
import { Button, Form, FormError, Input } from '@/components/ui/form'
import { loginAdmin, verifyAdminLoginCode } from '@/lib/actions/admin-login-actions'

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
    <Form onSubmit={handleSubmit} className="mx-auto w-full max-w-md space-y-6">
      <div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-fg/[0.08] bg-tile text-fg-2">
          {step === 'password' ? <ShieldCheck className="h-6 w-6" strokeWidth={1.75} /> : <KeyRound className="h-6 w-6" strokeWidth={1.75} />}
        </div>
        <h2 className="mt-5 text-2xl font-semibold leading-tight text-fg">
          {step === 'password' ? 'Admin sign in' : 'Enter your code'}
        </h2>
        <p className="mt-2 text-[15px] leading-6 text-fg-2">
          {step === 'password'
            ? 'Sign in with your admin username and password.'
            : 'Open your authenticator app and enter the 6-digit code for Poultry Ledger Admin.'}
        </p>
      </div>

      <FormError>{error}</FormError>

      {step === 'password' ? (
        <div className="space-y-5">
          <Input
            label="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={isPending}
            autoComplete="username"
            required
          />
          <Input
            label="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isPending}
            type="password"
            autoComplete="current-password"
            leading={<LockKeyhole className="h-4 w-4" strokeWidth={1.75} />}
            required
          />
        </div>
      ) : (
        <Input
          label="6-digit code"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          disabled={isPending}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          className="text-center font-mono text-2xl tracking-[0.5em]"
          placeholder="000000"
          required
        />
      )}

      <div className="space-y-3">
        <Button
          type="submit"
          variant="accent"
          isLoading={isPending}
          loadingText={step === 'password' ? 'Signing in' : 'Checking'}
          disabled={step === 'code' && code.length !== 6}
          className="min-h-12 w-full text-[15px]"
        >
          <LogIn className="h-4 w-4" strokeWidth={1.75} />
          {step === 'password' ? 'Sign in' : 'Verify and sign in'}
        </Button>
        {step === 'code' ? (
          <Button type="button" variant="ghost" onClick={() => { setStep('password'); setError(null) }} className="min-h-11 w-full">
            Use a different account
          </Button>
        ) : null}
      </div>
    </Form>
  )
}
