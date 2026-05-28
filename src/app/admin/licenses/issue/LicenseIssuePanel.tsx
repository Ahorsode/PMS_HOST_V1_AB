'use client'

import { useMemo, useState, useTransition } from 'react'
import { Copy, KeyRound } from 'lucide-react'
import type { AdminLicenseAccountOption } from '@/lib/actions/admin-license-actions'
import { issueManualLicenseKey } from '@/lib/actions/admin-license-actions'

type Props = {
  adminName: string
  accounts: AdminLicenseAccountOption[]
}

export default function LicenseIssuePanel({ adminName, accounts }: Props) {
  const [hardwareId, setHardwareId] = useState('')
  const [desktopFarmId, setDesktopFarmId] = useState('')
  const [accountQuery, setAccountQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [durationPack, setDurationPack] = useState<'3M' | '1Y'>('3M')
  const [transactionReference, setTransactionReference] = useState('')
  const [result, setResult] = useState<{ token: string; expiry: string; label: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  const filteredAccounts = useMemo(() => {
    const q = accountQuery.trim().toLowerCase()
    if (!q) return accounts

    return accounts.filter((item) =>
      [item.farmName, item.ownerName, item.ownerEmail, item.ownerPhone]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q)),
    )
  }, [accounts, accountQuery])

  const selectedAccount = accounts.find((item) => item.userId === selectedUserId) ?? null

  async function copyKey() {
    if (!result) return
    await navigator.clipboard.writeText(result.token)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const response = await issueManualLicenseKey({
        hardwareId,
        desktopFarmId,
        accountUserId: selectedUserId,
        durationPack,
        transactionReference,
      })

      if (!response.success) {
        setResult(null)
        setError(response.error)
        return
      }

      setResult({ token: response.activationToken, expiry: response.targetExpiryDate, label: response.durationLabel })
    })
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 rounded-3xl border border-[#f7f1df]/10 bg-[#171910]/70 p-6">
        <p className="text-xs uppercase tracking-[0.25em] text-[#d7c486]">Manual License Issuer</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[#fff8e6]">Desktop Key Combiner Panel</h1>
        <p className="mt-2 text-sm text-[#e6dcc5]/80">Signed in as {adminName}. Keys are deterministic from hardware ID, farm ID, and expiry timestamp.</p>
      </header>

      <form onSubmit={onSubmit} className="grid gap-5 rounded-3xl border border-[#f7f1df]/10 bg-[#12140f]/85 p-6">
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#d7c486]">Desktop Hardware ID</span>
          <input value={hardwareId} onChange={(e) => setHardwareId(e.target.value)} required className="rounded-xl border border-[#f7f1df]/15 bg-black/40 px-4 py-3 outline-none focus:border-[#d7c486]" />
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#d7c486]">Desktop Local Farm ID</span>
          <input value={desktopFarmId} onChange={(e) => setDesktopFarmId(e.target.value)} required className="rounded-xl border border-[#f7f1df]/15 bg-black/40 px-4 py-3 outline-none focus:border-[#d7c486]" />
        </label>

        <div className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#d7c486]">Cloud Account Search</span>
          <input placeholder="Search farm, owner, email, phone" value={accountQuery} onChange={(e) => setAccountQuery(e.target.value)} className="rounded-xl border border-[#f7f1df]/15 bg-black/40 px-4 py-3 outline-none focus:border-[#d7c486]" />
          <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} required className="rounded-xl border border-[#f7f1df]/15 bg-black/40 px-4 py-3 outline-none focus:border-[#d7c486]">
            <option value="">Select account</option>
            {filteredAccounts.map((item) => (
              <option key={`${item.userId}-${item.farmId}`} value={item.userId}>
                {item.farmName} - {item.ownerName}
              </option>
            ))}
          </select>
          {selectedAccount && (
            <p className="text-xs text-[#f7f1df]/70">Selected: {selectedAccount.farmName} ({selectedAccount.ownerEmail || selectedAccount.ownerPhone || 'No contact'})</p>
          )}
        </div>

        <fieldset className="grid gap-3">
          <legend className="text-xs font-bold uppercase tracking-[0.18em] text-[#d7c486]">Duration Pack</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="cursor-pointer rounded-xl border border-[#f7f1df]/15 bg-black/30 p-4">
              <input type="radio" name="durationPack" className="mr-2" checked={durationPack === '3M'} onChange={() => setDurationPack('3M')} />
              +3 Months Subscription Pack
            </label>
            <label className="cursor-pointer rounded-xl border border-[#f7f1df]/15 bg-black/30 p-4">
              <input type="radio" name="durationPack" className="mr-2" checked={durationPack === '1Y'} onChange={() => setDurationPack('1Y')} />
              +1 Year
            </label>
          </div>
        </fieldset>

        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#d7c486]">Transaction Reference</span>
          <textarea value={transactionReference} onChange={(e) => setTransactionReference(e.target.value)} required rows={4} className="rounded-xl border border-[#f7f1df]/15 bg-black/40 px-4 py-3 outline-none focus:border-[#d7c486]" placeholder="MoMo/cash reference, collector, branch, any notes" />
        </label>

        {error ? <p className="rounded-xl border border-red-400/30 bg-red-900/30 p-3 text-sm text-red-200">{error}</p> : null}

        {result ? (
          <div className="rounded-2xl border border-emerald-300/25 bg-emerald-900/20 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-200">Generated Activation Key</p>
            <p className="mt-2 font-[var(--font-payment-admin-mono)] text-xl font-black">{result.token}</p>
            <p className="mt-1 text-sm text-emerald-100/80">Valid until {new Date(result.expiry).toUTCString()} ({result.label})</p>
            <button type="button" onClick={copyKey} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-200/40 bg-emerald-100/15 px-3 py-2 text-sm font-semibold">
              <Copy size={16} /> {copied ? 'Copied' : 'Copy Key'}
            </button>
          </div>
        ) : null}

        <button disabled={isPending} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#e8c96b] to-[#5bd0b7] px-5 py-3 font-black uppercase tracking-[0.12em] text-[#10140f] disabled:opacity-60">
          {isPending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#10140f] border-t-transparent" />
              Issuing...
            </>
          ) : (
            <>
              <KeyRound size={16} /> Issue Deterministic Key
            </>
          )}
        </button>
      </form>
    </div>
  )
}
